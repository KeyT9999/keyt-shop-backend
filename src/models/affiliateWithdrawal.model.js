const mongoose = require('mongoose');

const affiliateWithdrawalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AffiliateProfile',
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'VND'
    },
    bankName: {
      type: String,
      trim: true,
      required: true
    },
    bankAccountNumber: {
      type: String,
      trim: true,
      required: true
    },
    bankAccountHolder: {
      type: String,
      trim: true,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'rejected'],
      default: 'pending',
      index: true
    },
    adminNote: {
      type: String,
      trim: true,
      default: ''
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    paidAt: Date,
    rejectedAt: Date
  },
  { timestamps: true }
);

const AffiliateWithdrawal = mongoose.model('AffiliateWithdrawal', affiliateWithdrawalSchema);

module.exports = AffiliateWithdrawal;
