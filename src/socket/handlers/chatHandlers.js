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
      const { customerId, sessionId: dataSessionId } = data || {};
      const sessionId = dataSessionId || socket.sessionId;
      let conversation = null;

      // Find existing active conversation
      if (customerId) {
        conversation = await Conversation.findOne({ customerId, status: 'active' });

        // Handle session merge: if logged-in user had an anonymous session
        if (!conversation && data.previousSessionId) {
          const anonConversation = await Conversation.findOne({
            sessionId: data.previousSessionId,
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
          sessionId: customerId ? null : sessionId,
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
      const sender = senderType === 'admin' ? socket.user.id : (socket.sessionId || 'unknown');

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
