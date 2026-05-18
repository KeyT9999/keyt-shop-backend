const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema(
  {
    // Customer identity (one of these)
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sessionId: {
      type: String,
      default: null,
    },

    // Customer display info (denormalized for list queries)
    customerName: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
      default: null,
    },

    // Conversation state
    status: {
      type: String,
      enum: ['active', 'resolved'],
      default: 'active',
    },
    assignedAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Message summary (denormalized)
    lastMessage: {
      type: String,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },

    // Timestamps
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound indexes for query performance
ConversationSchema.index({ status: 1, lastMessageAt: -1 });
ConversationSchema.index({ customerId: 1, status: 1 });
ConversationSchema.index({ sessionId: 1, status: 1 });

const Conversation = mongoose.model('Conversation', ConversationSchema);

module.exports = Conversation;
