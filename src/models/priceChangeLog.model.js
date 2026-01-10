const mongoose = require('mongoose');

const priceChangeLogSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    oldPrice: Number,
    newPrice: Number,
    currency: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  },
  {
    timestamps: true
  }
);

const PriceChangeLog = mongoose.model('PriceChangeLog', priceChangeLogSchema);

module.exports = PriceChangeLog;
