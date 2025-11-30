const mongoose = require('mongoose');

const userLoginHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    ipAddress: {
      type: String,
      required: true,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    loginTime: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
userLoginHistorySchema.index({ userId: 1, loginTime: -1 });
userLoginHistorySchema.index({ userId: 1, ipAddress: 1 });

const UserLoginHistory = mongoose.model('UserLoginHistory', userLoginHistorySchema);

module.exports = UserLoginHistory;

