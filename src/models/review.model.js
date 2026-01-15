const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    // Người đánh giá
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // Sản phẩm được đánh giá
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    // Đơn hàng liên quan
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    // Đánh giá sao (1-5)
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    // Nội dung đánh giá
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    // Ảnh đính kèm (tùy chọn)
    images: [{
      type: String
    }],
    // Phản hồi từ shop (tùy chọn)
    reply: {
      content: String,
      repliedAt: Date,
      repliedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    // Trạng thái
    status: {
      type: String,
      enum: ['active', 'hidden', 'reported'],
      default: 'active'
    },
    // Số lượt thích
    likes: {
      type: Number,
      default: 0
    },
    // Đã được xác minh mua hàng
    verified: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Index để tìm kiếm nhanh
reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, orderId: 1 }, { unique: true }); // 1 order chỉ review 1 lần

// Virtual để populate user info
reviewSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual để populate product info
reviewSchema.virtual('product', {
  ref: 'Product',
  localField: 'productId',
  foreignField: '_id',
  justOne: true
});

// Đảm bảo virtuals được serialize
reviewSchema.set('toJSON', { virtuals: true });
reviewSchema.set('toObject', { virtuals: true });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
