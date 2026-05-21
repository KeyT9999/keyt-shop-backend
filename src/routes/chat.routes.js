const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { optionalAuth } = require('../middleware/optionalAuth.middleware');
const {
  getConversations,
  getMessages,
  getActiveConversation,
  resolveConversation,
  addReaction,
  removeReaction,
  editMessage,
  deleteMessage,
  searchMessages,
} = require('../controllers/chat.controller');
const { upload, uploadChatFile } = require('../controllers/chatUpload.controller');

// Admin only — list all conversations
router.get('/conversations', authenticateToken, requireAdmin, getConversations);

// Admin JWT or matching session — get messages for a conversation
router.get('/conversations/:id/messages', optionalAuth, getMessages);

// Customer — get active conversation by JWT or session
router.get('/conversation/active', optionalAuth, getActiveConversation);

// Admin only — resolve a conversation
router.post('/conversations/:id/resolve', authenticateToken, requireAdmin, resolveConversation);

// Customer/session — upload file for chat
router.post('/upload', optionalAuth, upload.single('file'), uploadChatFile);

// Add reaction to message
router.post('/messages/:messageId/reactions', optionalAuth, addReaction);

// Remove reaction from message
router.delete('/messages/:messageId/reactions/:emoji', optionalAuth, removeReaction);

// Edit message
router.put('/messages/:messageId', optionalAuth, editMessage);

// Delete message
router.delete('/messages/:messageId', optionalAuth, deleteMessage);

// Search messages in conversation
router.get('/conversations/:conversationId/search', optionalAuth, searchMessages);

module.exports = router;
