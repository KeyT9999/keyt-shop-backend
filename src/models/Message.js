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
    default: '',
    maxlength: 2000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    default: null
  },
  fileMime: {
    type: String,
    default: null
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

// Custom validation: fileUrl required for image/file messages, content required for text
MessageSchema.pre('validate', function(next) {
  if (this.messageType === 'text' && (!this.content || this.content.trim() === '')) {
    return next(new Error('content is required for text messages'));
  }
  if ((this.messageType === 'image' || this.messageType === 'file') && (!this.fileUrl || this.fileUrl.trim() === '')) {
    return next(new Error('fileUrl is required for image and file messages'));
  }
  next();
});

// Indexes for query performance
MessageSchema.index({ conversationId: 1, timestamp: 1 });
MessageSchema.index({ conversationId: 1, readStatus: 1 });

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;
