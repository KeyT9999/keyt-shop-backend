const mongoose = require('mongoose');

const affiliateEarningSchema = new mongoose.Schema(
  {
    referrerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    buyerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    orderCode: {
      type: Number,
      index: true
    },
    itemIndex: {
      type: Number,
      required: true,
      min: 0
    },
    segmentIndex: {
      type: Number,
      default: 0,
      min: 0
    },
    sourceType: {
      type: String,
      enum: ['order_item', 'payout_split'],
      default: 'order_item',
      index: true
    },
    sourceEarningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AffiliateEarning'
    },
    withdrawalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AffiliateWithdrawal'
    },
    referralCode: {
      type: String,
      trim: true,
      uppercase: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    buyerName: {
      type: String,
      trim: true,
      default: ''
    },
    buyerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    currency: {
      type: String,
      default: 'VND'
    },
    commissionRate: {
      type: Number,
      required: true,
      min: 0
    },
    commissionAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'available', 'void', 'paid_out'],
      default: 'pending',
      index: true
    },
    availableAt: Date,
    voidedAt: Date,
    paidOutAt: Date
  },
  { timestamps: true }
);

affiliateEarningSchema.index(
  { orderId: 1, itemIndex: 1, sourceType: 1, segmentIndex: 1 },
  { unique: true }
);

const AffiliateEarning = mongoose.model('AffiliateEarning', affiliateEarningSchema);

module.exports = AffiliateEarning;
