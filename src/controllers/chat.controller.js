const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAuthUserId = (user) => {
  if (!user) return null;
  const id = user.userId || user.id || user._id;
  return id ? id.toString() : null;
};

const getRequestUserIds = (req) => {
  return [getAuthUserId(req.user), req.sessionId]
    .filter(Boolean)
    .map((id) => id.toString());
};

const canAccessConversation = (req, conversation) => {
  if (req.user?.admin) return true;
  const userIds = getRequestUserIds(req);
  return Boolean(
    (conversation.customerId && userIds.includes(conversation.customerId.toString())) ||
    (conversation.sessionId && userIds.includes(conversation.sessionId))
  );
};

const getRequestActorId = (req, preferredSender = null) => {
  const userIds = getRequestUserIds(req);
  if (preferredSender && userIds.includes(preferredSender)) return preferredSender;
  return userIds[0] || null;
};

/**
 * GET /api/chat/conversations
 * Admin only — list conversations paginated, filterable by status, sorted by lastMessageAt desc
 */
const getConversations = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status && ['active', 'resolved'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (rawSearch) {
      const searchRegex = new RegExp(escapeRegex(rawSearch.slice(0, 100)), 'i');
      filter.$or = [
        { customerName: searchRegex },
        { customerEmail: searchRegex },
        { sessionId: searchRegex },
      ];
    }

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    res.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/chat/conversations/:id/messages
 * Admin JWT or matching session — paginated messages sorted by timestamp asc
 */
const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    // Find conversation
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Authorization check: admin can access any, customer can only access their own
    if (!canAccessConversation(req, conversation)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [messages, total] = await Promise.all([
      Message.find({ conversationId: id })
        .sort({ timestamp: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ conversationId: id }),
    ]);

    res.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/chat/conversation/active
 * Get customer's active conversation by JWT token or X-Session-ID header
 */
const getActiveConversation = async (req, res) => {
  try {
    let conversation = null;

    const authUserId = getAuthUserId(req.user);
    if (authUserId) {
      // Authenticated user — find by customerId
      conversation = await Conversation.findOne({
        customerId: authUserId,
        status: 'active',
      }).lean();
    } else if (req.sessionId) {
      // Anonymous user — find by sessionId
      conversation = await Conversation.findOne({
        sessionId: req.sessionId,
        status: 'active',
      }).lean();
    } else {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!conversation) {
      return res.json({ conversation: null });
    }

    res.json({ conversation });
  } catch (error) {
    console.error('❌ Error fetching active conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/chat/conversations/:id/resolve
 * Admin only — mark conversation as resolved
 */
const resolveConversation = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.status === 'resolved') {
      return res.status(400).json({ error: 'Conversation already resolved' });
    }

    conversation.status = 'resolved';
    conversation.resolvedAt = new Date();
    await conversation.save();

    res.json({ conversation });
  } catch (error) {
    console.error('❌ Error resolving conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/chat/messages/:messageId/reactions
 * Add or toggle reaction to a message
 */
const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Find conversation to check authorization
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Authorization check: same logic as getMessages
    if (!canAccessConversation(req, conversation)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get user identifier
    const userId = getRequestActorId(req);

    // Find existing reaction for this emoji
    let reactionIndex = message.reactions.findIndex(r => r.emoji === emoji);

    if (reactionIndex === -1) {
      // Emoji doesn't exist, create new reaction
      message.reactions.push({
        emoji,
        users: [userId]
      });
    } else {
      // Emoji exists, toggle user's reaction
      const userIndex = message.reactions[reactionIndex].users.indexOf(userId);
      
      if (userIndex === -1) {
        // User hasn't reacted, add them
        message.reactions[reactionIndex].users.push(userId);
      } else {
        // User already reacted, remove them (toggle off)
        message.reactions[reactionIndex].users.splice(userIndex, 1);
        
        // If no users left for this emoji, remove the emoji
        if (message.reactions[reactionIndex].users.length === 0) {
          message.reactions.splice(reactionIndex, 1);
        }
      }
    }

    await message.save();

    res.json({ 
      success: true,
      message: message.toObject()
    });
  } catch (error) {
    console.error('❌ Error adding reaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/chat/messages/:messageId/reactions/:emoji
 * Remove reaction from a message
 */
const removeReaction = async (req, res) => {
  try {
    const { messageId, emoji } = req.params;

    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Find conversation to check authorization
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Authorization check
    if (!canAccessConversation(req, conversation)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get user identifier
    const userId = getRequestActorId(req);

    // Find reaction for this emoji
    const reactionIndex = message.reactions.findIndex(r => r.emoji === emoji);

    if (reactionIndex === -1) {
      return res.status(404).json({ error: 'Reaction not found' });
    }

    // Remove user from reaction
    const userIndex = message.reactions[reactionIndex].users.indexOf(userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User has not reacted with this emoji' });
    }

    message.reactions[reactionIndex].users.splice(userIndex, 1);

    // If no users left, remove the emoji
    if (message.reactions[reactionIndex].users.length === 0) {
      message.reactions.splice(reactionIndex, 1);
    }

    await message.save();

    res.json({ 
      success: true,
      message: message.toObject()
    });
  } catch (error) {
    console.error('❌ Error removing reaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/chat/messages/:messageId
 * Edit message content (owner only, 15 minute time limit)
 */
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({ error: 'Content must be 2000 characters or less' });
    }

    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if deleted
    if (message.isDeleted) {
      return res.status(400).json({ error: 'Cannot edit deleted message' });
    }

    // Find conversation for authorization
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Authorization check: user must be in conversation
    if (!canAccessConversation(req, conversation)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get user identifier
    const userId = getRequestActorId(req, message.sender);

    // Check ownership: only message sender can edit
    if (message.sender !== userId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    // Check time limit: 15 minutes
    const EDIT_TIME_LIMIT = 15 * 60 * 1000;
    const messageAge = Date.now() - new Date(message.timestamp).getTime();
    if (messageAge > EDIT_TIME_LIMIT) {
      return res.status(400).json({ error: 'Edit time limit exceeded (15 minutes)' });
    }

    // Save to edit history (limit to last 5 edits)
    if (!message.editHistory) {
      message.editHistory = [];
    }
    message.editHistory.push({
      content: message.content,
      editedAt: new Date()
    });
    if (message.editHistory.length > 5) {
      message.editHistory = message.editHistory.slice(-5);
    }

    // Update message
    message.content = content.trim();
    message.editedAt = new Date();
    await message.save();

    res.json({
      success: true,
      message: message.toObject()
    });
  } catch (error) {
    console.error('❌ Error editing message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/chat/messages/:messageId
 * Soft delete message (owner only, 1 hour time limit)
 */
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if already deleted
    if (message.isDeleted) {
      return res.status(400).json({ error: 'Message already deleted' });
    }

    // Find conversation for authorization
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Authorization check: user must be in conversation
    if (!canAccessConversation(req, conversation)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get user identifier
    const userId = getRequestActorId(req, message.sender);

    // Check ownership: only message sender can delete
    if (message.sender !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // Check time limit: 1 hour
    const DELETE_TIME_LIMIT = 60 * 60 * 1000;
    const messageAge = Date.now() - new Date(message.timestamp).getTime();
    if (messageAge > DELETE_TIME_LIMIT) {
      return res.status(400).json({ error: 'Delete time limit exceeded (1 hour)' });
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    res.json({
      success: true,
      message: message.toObject()
    });
  } catch (error) {
    console.error('❌ Error deleting message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Helper function to generate snippet with context around search query
 */
function generateSnippet(content, query, contextLength = 50) {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);
  
  if (index === -1) {
    // Query not found, return beginning of content
    return content.substring(0, 100) + (content.length > 100 ? '...' : '');
  }
  
  const start = Math.max(0, index - contextLength);
  const end = Math.min(content.length, index + query.length + contextLength);
  
  let snippet = content.substring(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  
  return snippet;
}

/**
 * GET /api/chat/conversations/:conversationId/search
 * Search messages within a conversation
 */
const searchMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { q, page = 1, limit = 20 } = req.query;
    
    // Validate query
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // Find conversation for authorization
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Authorization check
    if (!canAccessConversation(req, conversation)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Build search query
    const searchQuery = {
      conversationId,
      isDeleted: false, // Exclude deleted messages
      $text: { $search: q.trim() }
    };
    
    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    
    // Execute search
    const [results, total] = await Promise.all([
      Message.find(searchQuery)
        .select('content sender senderType timestamp')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Message.countDocuments(searchQuery)
    ]);
    
    // Generate snippets
    const resultsWithSnippets = results.map(msg => {
      const snippet = generateSnippet(msg.content, q.trim());
      return {
        ...msg,
        snippet
      };
    });
    
    res.json({
      success: true,
      results: resultsWithSnippets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('❌ Error searching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getConversations,
  getMessages,
  getActiveConversation,
  resolveConversation,
  addReaction,
  removeReaction,
  editMessage,
  deleteMessage,
  searchMessages,
};
