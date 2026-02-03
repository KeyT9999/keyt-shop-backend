// src/models/product.model.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: String,
    price: Number,
    currency: String,
    billingCycle: String, // "7 ngày", "14 ngày", "1 tháng", "3 tháng", "6 tháng", "1 năm", "Vĩnh viễn"
    category: String,     // "Thiết kế", ...
    isHot: Boolean,
    promotion: String,
    features: [String],
    description: String,
    imageUrl: String, // Giữ lại để backward compatible
    images: [String], // Array of image URLs from Cloudinary
    stock: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['in_stock', 'out_of_stock', 'discontinued'],
      default: 'in_stock'
    },
    lowStockThreshold: {
      type: Number,
      default: 0,
      min: 0
    },
    options: [{
      name: String,      // "7 ngày", "14 ngày", "1 tháng", "5 tháng", "12 tháng"
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
    }],
    // Hướng dẫn khách hàng làm sau khi admin hoàn thành đơn hàng
    completionInstructions: {
      type: String,
      default: ''
    },
    // Account có sẵn - tự động gửi khi hoàn thành đơn hàng
    isPreloadedAccount: {
      type: Boolean,
      default: false
    },
    preloadedAccounts: [{
      account: String,  // Format: "username:password"
      used: {
        type: Boolean,
        default: false
      },
      usedAt: Date,
      usedForOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
      }
    }],
    // Thứ tự hiển thị sản phẩm (số càng nhỏ càng hiển thị trước)
    sortOrder: {
      type: Number,
      default: 999,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;

