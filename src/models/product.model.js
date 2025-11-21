// src/models/product.model.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: String,
    price: Number,
    currency: String,
    billingCycle: String, // "năm" / "tháng"
    category: String,     // "Thiết kế", ...
    isHot: Boolean,
    promotion: String,
    features: [String],
    description: String,
    imageUrl: String,
    stock: Number
  },
  {
    timestamps: true
  }
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;

