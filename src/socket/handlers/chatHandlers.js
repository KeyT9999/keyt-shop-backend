const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');

/**
 * Register chat-related Socket.io event handlers
 * @param {import('socket.io').Server} io - Socket.io server instance
 * @param {import('socket.io').Socket} socket - Connected socket
 */
function registerChatHandlers(io, socket) {
  // ─── chat:join ───────────────────────────────────────────────────────
  socket.on('chat:join', async (data) => {
    try {
      const { sessionId: dataSessionId } = data || {};
      const sessionId = dataSessionId || socket.sessionId;
      const customerId = socket.userRole === 'customer' && socket.user?.id
        ? socket.user.id.toString()
        : null;
      let conversation = null;

      // Find existing active conversation
      if (customerId) {
        conversation = await Conversation.findOne({ customerId, status: 'active' });

        // Handle session merge: if a logged-in customer already had an anonymous chat.
        if (!conversation && sessionId) {
          const anonConversation = await Conversation.findOne({
            sessionId,
            status: 'active',
          });
          if (anonConversation) {
            anonConversation.customerId = customerId;
            anonConversation.customerName = data.customerName || anonConversation.customerName;
            anonConversation.customerEmail = data.customerEmail || anonConversation.customerEmail;
            await anonConversation.save();
            conversation = anonConversation;
          }
        }
      } else if (sessionId) {
        conversation = await Conversation.findOne({ sessionId, status: 'active' });
      }

      // If no active conversation found, create a new one
      if (!conversation) {
        const customerName = data.customerName || (sessionId ? `Khách #${sessionId.substring(0, 6)}` : 'Khách');
        conversation = await Conversation.create({
          customerId: customerId || null,
          sessionId,
          customerName,
          customerEmail: data.customerEmail || null,
          status: 'active',
        });

        // Notify admin room of new conversation
        io.to('admin-room').emit('chat:conversation_created', { conversation });
      }

      // Join the conversation room
      const roomName = `conv:${conversation._id}`;
      socket.join(roomName);

      // Store conversationId on socket for quick access
      socket.conversationId = conversation._id.toString();

      // Load last 50 messages
      const messages = await Message.find({ conversationId: conversation._id })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();

      // Emit to the joining client (reversed to chronological order)
      socket.emit('chat:joined', {
        conversation,
        messages: messages.reverse(),
      });
    } catch (err) {
      socket.emit('error', { code: 'JOIN_ERROR', message: err.message });
    }
  });

  // ─── chat:send_message ──────────────────────────────────────────────
  socket.on('chat:send_message', async (data) => {
    try {
      const { conversationId, content, messageType, fileUrl, fileName, fileSize, fileMime } = data || {};
      const isFileMessage = messageType === 'image' || messageType === 'file';

      // Validate content — allow empty content for file/image messages
      if (!isFileMessage) {
        if (!content || typeof content !== 'string') {
          return socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Message content required' });
        }
      }

      // Strip HTML and trim for text content
      const sanitized = content ? content.replace(/<[^>]*>/g, '').trim() : '';

      if (!isFileMessage && (sanitized.length < 1 || sanitized.length > 2000)) {
        return socket.emit('error', {
          code: 'VALIDATION_ERROR',
          message: 'Message must be 1-2000 characters',
        });
      }

      if (!conversationId) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', message: 'conversationId required' });
      }

      // Determine sender info
      const senderType = socket.userRole === 'admin' ? 'admin' : 'customer';
      const sender = senderType === 'admin' ? socket.user.id.toString() : (socket.sessionId || 'unknown');

      // Build message data
      const messageData = {
        conversationId,
        sender,
        senderType,
        content: sanitized,
        messageType: messageType || 'text',
      };

      // Attach file fields when present
      if (isFileMessage) {
        messageData.fileUrl = fileUrl;
        messageData.fileName = fileName;
        messageData.fileSize = fileSize;
        messageData.fileMime = fileMime;
      }

      // Create Message document
      const message = await Message.create(messageData);

      // Determine lastMessage preview
      let lastMessagePreview;
      if (messageType === 'image') {
        lastMessagePreview = '🖼️ Ảnh';
      } else if (messageType === 'file') {
        lastMessagePreview = '📎 File';
      } else {
        lastMessagePreview = sanitized.substring(0, 100);
      }

      // Update Conversation denormalized fields
      const updateFields = {
        lastMessage: lastMessagePreview,
        lastMessageAt: message.timestamp,
      };

      // Increment unreadCount only for customer messages (admin hasn't read yet)
      if (senderType === 'customer') {
        await Conversation.findByIdAndUpdate(conversationId, {
          ...updateFields,
          $inc: { unreadCount: 1 },
        });
      } else {
        await Conversation.findByIdAndUpdate(conversationId, updateFields);
      }

      // Emit to conversation room
      const roomName = `conv:${conversationId}`;
      io.to(roomName).emit('chat:message_received', { message });

      // Emit to admin room for dashboard updates
      const conversation = await Conversation.findById(conversationId).lean();
      io.to('admin-room').emit('admin:new_message', { message, conversation });
    } catch (err) {
      socket.emit('error', { code: 'SEND_ERROR', message: err.message });
    }
  });

  // ─── chat:typing ────────────────────────────────────────────────────
  socket.on('chat:typing', (data) => {
    const { conversationId } = data || {};
    if (!conversationId) return;

    const sender = socket.userRole === 'admin' ? 'admin' : socket.sessionId;
    socket.to(`conv:${conversationId}`).emit('chat:typing_indicator', {
      conversationId,
      isTyping: true,
      sender,
    });
  });

  // ─── chat:stop_typing ───────────────────────────────────────────────
  socket.on('chat:stop_typing', (data) => {
    const { conversationId } = data || {};
    if (!conversationId) return;

    const sender = socket.userRole === 'admin' ? 'admin' : socket.sessionId;
    socket.to(`conv:${conversationId}`).emit('chat:typing_indicator', {
      conversationId,
      isTyping: false,
      sender,
    });
  });

  // ─── chat:mark_read ─────────────────────────────────────────────────
  socket.on('chat:mark_read', async (data) => {
    try {
      const { conversationId, messageIds } = data || {};
      if (!conversationId || !messageIds || !messageIds.length) return;

      // Update readStatus on the specified messages
      await Message.updateMany(
        { _id: { $in: messageIds }, conversationId },
        { $set: { readStatus: true } }
      );

      // Reset unreadCount on conversation
      const unreadRemaining = await Message.countDocuments({
        conversationId,
        readStatus: false,
      });
      await Conversation.findByIdAndUpdate(conversationId, { unreadCount: unreadRemaining });

      // Emit read receipts to the conversation room
      io.to(`conv:${conversationId}`).emit('chat:messages_read', { conversationId, messageIds });
    } catch (err) {
      socket.emit('error', { code: 'MARK_READ_ERROR', message: err.message });
    }
  });

  // ─── admin:join ─────────────────────────────────────────────────────
  socket.on('admin:join', () => {
    if (socket.userRole !== 'admin') {
      return socket.emit('error', { code: 'FORBIDDEN', message: 'Admin access required' });
    }

    socket.join('admin-room');

    // Broadcast admin online status to all connected clients
    io.emit('chat:admin_status', { online: true });
  });

  // ─── admin:resolve ──────────────────────────────────────────────────
  socket.on('admin:resolve', async (data) => {
    try {
      if (socket.userRole !== 'admin') {
        return socket.emit('error', { code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const { conversationId } = data || {};
      if (!conversationId) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', message: 'conversationId required' });
      }

      const conversation = await Conversation.findByIdAndUpdate(
        conversationId,
        { status: 'resolved', resolvedAt: new Date() },
        { new: true }
      ).lean();

      if (!conversation) {
        return socket.emit('error', { code: 'NOT_FOUND', message: 'Conversation not found' });
      }

      // Notify admin room
      io.to('admin-room').emit('admin:conversation_updated', { conversation });

      // Notify participants in the conversation room
      io.to(`conv:${conversationId}`).emit('admin:conversation_updated', { conversation });
    } catch (err) {
      socket.emit('error', { code: 'RESOLVE_ERROR', message: err.message });
    }
  });

  // ─── chat:add_reaction ──────────────────────────────────────────────
  socket.on('chat:add_reaction', async (data) => {
    try {
      const { messageId, emoji } = data || {};

      if (!messageId || !emoji) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', message: 'messageId and emoji required' });
      }

      // Find message
      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('error', { code: 'NOT_FOUND', message: 'Message not found' });
      }

      // Find conversation to check authorization
      const conversation = await Conversation.findById(message.conversationId);
      if (!conversation) {
        return socket.emit('error', { code: 'NOT_FOUND', message: 'Conversation not found' });
      }

      // Authorization check
      const isAdmin = socket.userRole === 'admin';
      const isOwnerByUser = socket.user && conversation.customerId && 
        conversation.customerId.toString() === socket.user.id.toString();
      const isOwnerBySession = socket.sessionId && conversation.sessionId === socket.sessionId;

      if (!isAdmin && !isOwnerByUser && !isOwnerBySession) {
        return socket.emit('error', { code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Get user identifier
      const userId = socket.userRole === 'admin' ? socket.user.id.toString() : socket.sessionId;

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

      // Broadcast to customers in the conversation and admins watching chat.
      const roomName = `conv:${message.conversationId}`;
      const payload = {
        messageId: message._id.toString(),
        reactions: message.reactions.map((reaction) => ({
          emoji: reaction.emoji,
          users: [...reaction.users],
        })),
      };
      io.to(roomName).to('admin-room').emit('chat:reaction_updated', payload);
    } catch (err) {
      socket.emit('error', { code: 'REACTION_ERROR', message: err.message });
    }
  });

  // ─── chat:remove_reaction ───────────────────────────────────────────
  socket.on('chat:remove_reaction', async (data) => {
    try {
      const { messageId, emoji } = data || {};

      if (!messageId || !emoji) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', message: 'messageId and emoji required' });
      }

      // Find message
      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('error', { code: 'NOT_FOUND', message: 'Message not found' });
      }

      // Find conversation to check authorization
      const conversation = await Conversation.findById(message.conversationId);
      if (!conversation) {
        return socket.emit('error', { code: 'NOT_FOUND', message: 'Conversation not found' });
      }

      // Authorization check
      const isAdmin = socket.userRole === 'admin';
      const isOwnerByUser = socket.user && conversation.customerId && 
        conversation.customerId.toString() === socket.user.id.toString();
      const isOwnerBySession = socket.sessionId && conversation.sessionId === socket.sessionId;

      if (!isAdmin && !isOwnerByUser && !isOwnerBySession) {
        return socket.emit('error', { code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Get user identifier
      const userId = socket.userRole === 'admin' ? socket.user.id.toString() : socket.sessionId;

      // Find reaction for this emoji
      const reactionIndex = message.reactions.findIndex(r => r.emoji === emoji);

      if (reactionIndex === -1) {
        return socket.emit('error', { code: 'NOT_FOUND', message: 'Reaction not found' });
      }

      // Remove user from reaction
      const userIndex = message.reactions[reactionIndex].users.indexOf(userId);
      
      if (userIndex === -1) {
        return socket.emit('error', { code: 'NOT_FOUND', message: 'User has not reacted with this emoji' });
      }

      message.reactions[reactionIndex].users.splice(userIndex, 1);

      // If no users left, remove the emoji
      if (message.reactions[reactionIndex].users.length === 0) {
        message.reactions.splice(reactionIndex, 1);
      }

      await message.save();

      // Broadcast to customers in the conversation and admins watching chat.
      const roomName = `conv:${message.conversationId}`;
      const payload = {
        messageId: message._id.toString(),
        reactions: message.reactions.map((reaction) => ({
          emoji: reaction.emoji,
          users: [...reaction.users],
        })),
      };
      io.to(roomName).to('admin-room').emit('chat:reaction_updated', payload);
    } catch (err) {
      socket.emit('error', { code: 'REACTION_ERROR', message: err.message });
    }
  });

  // ─── chat:edit_message ──────────────────────────────────────────────
  socket.on('chat:edit_message', async (data) => {
    try {
      const { messageId, content } = data || {};

      if (!messageId || !content) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', message: 'messageId and content required' });
      }

      // Validate content
      if (typeof content !== 'string' || content.trim().length === 0) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Content must be a non-empty string' });
      }

      if (content.trim().length > 2000) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Content must be 2000 characters or less' });
      }

      // Find message
      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('error', { code: 'NOT_FOUND', message: 'Message not found' });
      }

      // Check if deleted
      if (message.isDeleted) {
        return socket.emit('error', { code: 'BAD_REQUEST', message: 'Cannot edit deleted message' });
      }

      // Get user identifier
      const userId = socket.userRole === 'admin' ? socket.user.id.toString() : socket.sessionId;

      // Check ownership: only message sender can edit
      if (message.sender !== userId) {
        return socket.emit('error', { code: 'FORBIDDEN', message: 'You can only edit your own messages' });
      }

      // Check time limit: 15 minutes
      const EDIT_TIME_LIMIT = 15 * 60 * 1000;
      const messageAge = Date.now() - new Date(message.timestamp).getTime();
      if (messageAge > EDIT_TIME_LIMIT) {
        return socket.emit('error', { code: 'TIME_LIMIT', message: 'Edit time limit exceeded (15 minutes)' });
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

      // Broadcast to customers in the conversation and admins watching chat.
      const roomName = `conv:${message.conversationId}`;
      io.to(roomName).to('admin-room').emit('chat:message_edited', {
        messageId: message._id.toString(),
        content: message.content,
        editedAt: message.editedAt
      });
    } catch (err) {
      socket.emit('error', { code: 'EDIT_ERROR', message: err.message });
    }
  });

  // ─── chat:delete_message ────────────────────────────────────────────
  socket.on('chat:delete_message', async (data) => {
    try {
      const { messageId } = data || {};

      if (!messageId) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', message: 'messageId required' });
      }

      // Find message
      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('error', { code: 'NOT_FOUND', message: 'Message not found' });
      }

      // Check if already deleted
      if (message.isDeleted) {
        return socket.emit('error', { code: 'BAD_REQUEST', message: 'Message already deleted' });
      }

      // Get user identifier
      const userId = socket.userRole === 'admin' ? socket.user.id.toString() : socket.sessionId;

      // Check ownership: only message sender can delete
      if (message.sender !== userId) {
        return socket.emit('error', { code: 'FORBIDDEN', message: 'You can only delete your own messages' });
      }

      // Check time limit: 1 hour
      const DELETE_TIME_LIMIT = 60 * 60 * 1000;
      const messageAge = Date.now() - new Date(message.timestamp).getTime();
      if (messageAge > DELETE_TIME_LIMIT) {
        return socket.emit('error', { code: 'TIME_LIMIT', message: 'Delete time limit exceeded (1 hour)' });
      }

      // Soft delete
      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();

      // Broadcast to customers in the conversation and admins watching chat.
      const roomName = `conv:${message.conversationId}`;
      io.to(roomName).to('admin-room').emit('chat:message_deleted', {
        messageId: message._id.toString()
      });
    } catch (err) {
      socket.emit('error', { code: 'DELETE_ERROR', message: err.message });
    }
  });

  // ─── disconnect ─────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    if (socket.userRole === 'admin') {
      // Check if any other admin sockets remain in admin-room
      const adminRoom = io.sockets.adapter.rooms.get('admin-room');
      const hasAdmins = adminRoom && adminRoom.size > 0;

      if (!hasAdmins) {
        io.emit('chat:admin_status', { online: false });
      }
    }
  });
}

module.exports = { registerChatHandlers };
