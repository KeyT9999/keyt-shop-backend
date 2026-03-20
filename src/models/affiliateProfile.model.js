const mongoose = require('mongoose');

const affiliateProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    referralCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    bankName: {
      type: String,
      trim: true,
      default: ''
    },
    bankAccountNumber: {
      type: String,
      trim: true,
      default: ''
    },
    bankAccountHolder: {
      type: String,
      trim: true,
      default: ''
    },
    availableBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    pendingBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    reservedBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    totalEarned: {
      type: Number,
      default: 0,
      min: 0
    },
    totalWithdrawn: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

const AffiliateProfile = mongoose.model('AffiliateProfile', affiliateProfileSchema);

module.exports = AffiliateProfile;
