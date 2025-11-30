const mongoose = require('mongoose');

const otpRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    chatgptEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    requestedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Index for IP tracking per user
otpRequestSchema.index({ userId: 1, ipAddress: 1 });
otpRequestSchema.index({ userId: 1, requestedAt: -1 });

const OtpRequest = mongoose.model('OtpRequest', otpRequestSchema);

module.exports = OtpRequest;

