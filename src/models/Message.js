const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: String,
    required: true
  },
  senderType: {
    type: String,
    enum: ['customer', 'admin'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  readStatus: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Indexes for query performance
MessageSchema.index({ conversationId: 1, timestamp: 1 });
MessageSchema.index({ conversationId: 1, readStatus: 1 });

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;
