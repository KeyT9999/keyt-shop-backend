const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
    const isAdmin = req.user && req.user.admin;
    const isOwnerByUser = req.user && conversation.customerId && 
      conversation.customerId.toString() === req.user.userId;
    const isOwnerBySession = req.sessionId && conversation.sessionId === req.sessionId;

    if (!isAdmin && !isOwnerByUser && !isOwnerBySession) {
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

    if (req.user) {
      // Authenticated user — find by customerId
      conversation = await Conversation.findOne({
        customerId: req.user.userId,
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

module.exports = {
  getConversations,
  getMessages,
  getActiveConversation,
  resolveConversation,
};
