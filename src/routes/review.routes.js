const express = require('express');
const Review = require('../models/review.model');
const Order = require('../models/order.model');
const Product = require('../models/product.model');

const router = express.Router();

/**
 * POST /api/reviews
 * Tạo review mới (cần đăng nhập)
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập để đánh giá' });
    }

    const { productId, orderId, rating, comment, images } = req.body;

    // Validate input
    if (!productId || !orderId || !rating || !comment) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin đánh giá' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Đánh giá phải từ 1 đến 5 sao' });
    }

    if (comment.trim().length < 10) {
      return res.status(400).json({ message: 'Nội dung đánh giá phải có ít nhất 10 ký tự' });
    }

    // Kiểm tra order có tồn tại và thuộc về user không
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    if (order.userId?.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Bạn không có quyền đánh giá đơn hàng này' });
    }

    // Kiểm tra order đã completed chưa
    if (order.orderStatus !== 'completed') {
      return res.status(400).json({ message: 'Chỉ có thể đánh giá đơn hàng đã hoàn thành' });
    }

    // Kiểm tra product có trong order không
    const productInOrder = order.items.find(
      item => item.productId.toString() === productId.toString()
    );
    if (!productInOrder) {
      return res.status(400).json({ message: 'Sản phẩm không có trong đơn hàng này' });
    }

    // Kiểm tra đã review chưa
    const existingReview = await Review.findOne({ userId, orderId, productId });
    if (existingReview) {
      return res.status(400).json({ message: 'Bạn đã đánh giá sản phẩm này trong đơn hàng này rồi' });
    }

    // Tạo review
    const review = new Review({
      userId,
      productId,
      orderId,
      rating: Number(rating),
      comment: comment.trim(),
      images: images || [],
      verified: true,
      status: 'active'
    });

    await review.save();

    // Populate user info
    await review.populate('userId', 'username email');

    res.status(201).json({
      message: 'Đánh giá thành công',
      review
    });
  } catch (error) {
    console.error('❌ Error creating review:', error);
    res.status(500).json({ message: 'Lỗi khi tạo đánh giá', error: error.message });
  }
});

/**
 * GET /api/reviews/product/:productId
 * Lấy tất cả reviews của 1 sản phẩm
 */
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filter theo rating nếu có
    const ratingFilter = req.query.rating ? { rating: parseInt(req.query.rating) } : {};

    const reviews = await Review.find({
      productId,
      status: 'active',
      ...ratingFilter
    })
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({
      productId,
      status: 'active',
      ...ratingFilter
    });

    // Tính toán thống kê rating
    const stats = await Review.aggregate([
      { $match: { productId: new require('mongoose').Types.ObjectId(productId), status: 'active' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: stats[0] || {
        averageRating: 0,
        totalReviews: 0,
        rating5: 0,
        rating4: 0,
        rating3: 0,
        rating2: 0,
        rating1: 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching reviews:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách đánh giá', error: error.message });
  }
});

/**
 * GET /api/reviews/admin/all
 * Admin: Lấy tất cả reviews trong hệ thống
 */
router.get('/admin/all', async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.admin;
    
    if (!userId || !isAdmin) {
      return res.status(403).json({ message: 'Chỉ admin mới có quyền truy cập' });
    }

    const reviews = await Review.find()
      .populate('userId', 'username email')
      .populate('productId', 'name imageUrl images')
      .populate('orderId', 'orderNumber orderCode')
      .sort({ createdAt: -1 });

    res.json({ reviews });
  } catch (error) {
    console.error('❌ Error fetching all reviews:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách đánh giá', error: error.message });
  }
});

/**
 * GET /api/reviews/my-reviews
 * Lấy tất cả reviews của user hiện tại
 */
router.get('/my-reviews', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    }

    const reviews = await Review.find({ userId })
      .populate('productId', 'name imageUrl images')
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 });

    res.json({ reviews });
  } catch (error) {
    console.error('❌ Error fetching user reviews:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách đánh giá', error: error.message });
  }
});

/**
 * GET /api/reviews/can-review/:orderId
 * Kiểm tra sản phẩm nào trong order có thể review
 */
router.get('/can-review/:orderId', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    }

    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    if (order.userId?.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập đơn hàng này' });
    }

    if (order.orderStatus !== 'completed') {
      return res.json({
        canReview: false,
        message: 'Đơn hàng chưa hoàn thành',
        products: []
      });
    }

    // Lấy danh sách sản phẩm và kiểm tra xem đã review chưa
    const productsWithReviewStatus = await Promise.all(
      order.items.map(async (item) => {
        const existingReview = await Review.findOne({
          userId,
          orderId,
          productId: item.productId
        });

        const product = await Product.findById(item.productId);

        return {
          productId: item.productId,
          productName: item.name,
          productImage: product?.images?.[0] || product?.imageUrl || '',
          hasReviewed: !!existingReview,
          review: existingReview || null
        };
      })
    );

    res.json({
      canReview: true,
      products: productsWithReviewStatus
    });
  } catch (error) {
    console.error('❌ Error checking reviewable products:', error);
    res.status(500).json({ message: 'Lỗi khi kiểm tra sản phẩm có thể đánh giá', error: error.message });
  }
});

/**
 * PUT /api/reviews/:id
 * Cập nhật review (chỉ user tạo review mới được sửa)
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    }

    const { id } = req.params;
    const { rating, comment, images } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
    }

    if (review.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Bạn không có quyền sửa đánh giá này' });
    }

    // Update
    if (rating) review.rating = Number(rating);
    if (comment) review.comment = comment.trim();
    if (images !== undefined) review.images = images;

    await review.save();
    await review.populate('userId', 'username email');

    res.json({
      message: 'Cập nhật đánh giá thành công',
      review
    });
  } catch (error) {
    console.error('❌ Error updating review:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật đánh giá', error: error.message });
  }
});

/**
 * DELETE /api/reviews/:id
 * Xóa review (chỉ user tạo review hoặc admin mới được xóa)
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.admin;
    
    if (!userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    }

    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
    }

    // Chỉ user tạo review hoặc admin mới được xóa
    if (review.userId.toString() !== userId.toString() && !isAdmin) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa đánh giá này' });
    }

    await Review.findByIdAndDelete(id);

    res.json({ message: 'Xóa đánh giá thành công' });
  } catch (error) {
    console.error('❌ Error deleting review:', error);
    res.status(500).json({ message: 'Lỗi khi xóa đánh giá', error: error.message });
  }
});

/**
 * POST /api/reviews/:id/reply
 * Admin trả lời review
 */
router.post('/:id/reply', async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.admin;
    
    if (!userId || !isAdmin) {
      return res.status(403).json({ message: 'Chỉ admin mới có thể trả lời đánh giá' });
    }

    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Nội dung trả lời không được để trống' });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
    }

    review.reply = {
      content: content.trim(),
      repliedAt: new Date(),
      repliedBy: userId
    };

    await review.save();
    await review.populate('userId', 'username email');

    res.json({
      message: 'Trả lời đánh giá thành công',
      review
    });
  } catch (error) {
    console.error('❌ Error replying to review:', error);
    res.status(500).json({ message: 'Lỗi khi trả lời đánh giá', error: error.message });
  }
});

module.exports = router;
