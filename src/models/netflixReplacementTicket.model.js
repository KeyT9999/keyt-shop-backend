const mongoose = require('mongoose');

const netflixReplacementTicketSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    itemIndex: {
      type: Number,
      required: true,
      min: 0
    },
    slotIndex: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    evidence: {
      type: String,
      trim: true,
      default: ''
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    rejectedAt: {
      type: Date
    },
    decisionReason: {
      type: String,
      trim: true,
      default: ''
    },
    consumed: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

netflixReplacementTicketSchema.index({ orderId: 1, itemIndex: 1, slotIndex: 1, status: 1 });

const NetflixReplacementTicket = mongoose.model('NetflixReplacementTicket', netflixReplacementTicketSchema);

module.exports = NetflixReplacementTicket;
