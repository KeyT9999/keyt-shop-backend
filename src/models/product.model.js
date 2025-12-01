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
    imageUrl: String, // Giữ lại để backward compatible
    images: [String], // Array of image URLs from Cloudinary
    stock: Number,
    options: [{
      name: String,      // "1 tháng", "5 tháng", "12 tháng"
      price: Number     // Giá cho option này
    }],
    // Điều kiện cần - thông tin bổ sung cần thiết khi mua sản phẩm
    requiredFields: [{
      label: String,        // "Email Canva", "Email để nhận docs", "Account:MK"
      type: {
        type: String,
        enum: ['email', 'text', 'account'],
        default: 'text'
      },
      placeholder: String,  // "Vui lòng nhập email Canva của bạn"
      required: {
        type: Boolean,
        default: true
      }
    }]
  },
  {
    timestamps: true
  }
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;

