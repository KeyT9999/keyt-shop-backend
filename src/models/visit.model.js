const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema(
  {
    // IP address của visitor
    ipAddress: {
      type: String,
      required: true,
      index: true
    },
    // User agent (browser, device info)
    userAgent: {
      type: String,
      default: ''
    },
    // URL path được truy cập
    path: {
      type: String,
      default: '/',
      index: true
    },
    // Referrer (trang web nguồn)
    referrer: {
      type: String,
      default: ''
    },
    // Country (nếu có thể detect)
    country: {
      type: String,
      default: ''
    },
    // Device type (mobile, desktop, tablet)
    deviceType: {
      type: String,
      enum: ['mobile', 'desktop', 'tablet', 'unknown'],
      default: 'unknown'
    },
    // Browser name
    browser: {
      type: String,
      default: ''
    },
    // OS
    os: {
      type: String,
      default: ''
    },
    // User ID nếu đã đăng nhập
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    // Session ID để group các visits trong cùng session
    sessionId: {
      type: String,
      index: true
    }
  },
  {
    timestamps: true // Tự động thêm createdAt và updatedAt
  }
);

// Index để query nhanh theo thời gian
visitSchema.index({ createdAt: -1 });
visitSchema.index({ createdAt: 1, path: 1 });

const Visit = mongoose.model('Visit', visitSchema);

module.exports = Visit;
