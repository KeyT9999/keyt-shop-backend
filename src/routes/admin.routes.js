const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const chatGptAccountService = require('../services/chatgpt-account.service');
const otpRequestService = require('../services/otp-request.service');
const userLoginHistoryService = require('../services/user-login-history.service');
const subscriptionService = require('../services/subscription.service');
const emailService = require('../services/email.service');
const User = require('../models/user.model');
const Order = require('../models/order.model');

const router = express.Router();

/**
 * Get admin dashboard stats
 * GET /api/admin/dashboard/stats
 */
router.get('/dashboard/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [chatGptAccounts, subscriptions, otpRequests] = await Promise.all([
      chatGptAccountService.getAllChatGptAccounts(),
      subscriptionService.findAll(),
      otpRequestService.getAllUsersOtpInfo()
    ]);

    const now = new Date();
    const activeSubscriptions = subscriptions.filter(s => new Date(s.endDate) >= now).length;
    const expiredSubscriptions = subscriptions.filter(s => new Date(s.endDate) < now).length;
    const endingTomorrow = await subscriptionService.findEndingTomorrow();
    const endingToday = await subscriptionService.findEndingToday();

    res.json({
      chatGptAccounts: {
        total: chatGptAccounts.length
      },
      subscriptions: {
        total: subscriptions.length,
        active: activeSubscriptions,
        expired: expiredSubscriptions,
        endingTomorrow: endingTomorrow.length,
        endingToday: endingToday.length
      },
      otpRequests: {
        totalUsers: otpRequests.length,
        totalRequests: otpRequests.reduce((sum, info) => sum + (info.count || 0), 0)
      }
    });
  } catch (err) {
    console.error('❌ Error fetching dashboard stats:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get user login history
 * GET /api/admin/user-login-history/:userId
 */
router.get('/user-login-history/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await chatGptAccountService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user.' });
    }

    const [history, historyAsc, first2Ips, distinctIpCount] = await Promise.all([
      userLoginHistoryService.getLoginHistoryByUser(userId),
      userLoginHistoryService.getLoginHistoryByUserAsc(userId),
      userLoginHistoryService.getFirst2DistinctIps(userId),
      userLoginHistoryService.countDistinctIpByUser(userId)
    ]);

    res.json({
      user,
      history,
      first2Ips,
      distinctIpCount
    });
  } catch (err) {
    console.error('❌ Error fetching user login history:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get OTP requests stats
 * GET /api/admin/otp-requests
 */
router.get('/otp-requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const otpInfos = await otpRequestService.getAllUsersOtpInfo();
    res.json(otpInfos);
  } catch (err) {
    console.error('❌ Error fetching OTP requests:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get all users (for admin)
 * GET /api/admin/users
 */
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await chatGptAccountService.getAllUsers();
    const otpInfos = await otpRequestService.getAllUsersOtpInfo();
    
    // Create map for easy lookup
    const otpInfoMap = {};
    otpInfos.forEach(info => {
      if (info.user && info.user._id) {
        otpInfoMap[info.user._id.toString()] = info;
      }
    });

    res.json({
      users,
      otpInfoMap
    });
  } catch (err) {
    console.error('❌ Error fetching users:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Create new user (Admin only)
 * POST /api/admin/users
 */
router.post(
  '/users',
  authenticateToken,
  requireAdmin,
  [
    body('username').isLength({ min: 6 }).withMessage('Username phải có ít nhất 6 ký tự').trim(),
    body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password phải có ít nhất 6 ký tự'),
    body('admin').optional().isBoolean()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, email, password, admin } = req.body;

      // Check if username already exists
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(409).json({ message: 'Username đã tồn tại' });
      }

      // Check if email already exists
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(409).json({ message: 'Email đã tồn tại' });
      }

      // Create user
      const user = new User({
        username,
        email,
        password,
        admin: admin || false,
        emailVerified: true, // Admin created users are auto-verified
        loginType: 'login-common'
      });

      await user.save();

      res.status(201).json({
        message: 'Tạo user thành công',
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          admin: user.admin
        }
      });
    } catch (err) {
      console.error('❌ Error creating user:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * Update user (Admin only)
 * PUT /api/admin/users/:userId
 */
router.put(
  '/users/:userId',
  authenticateToken,
  requireAdmin,
  [
    body('username').optional().isLength({ min: 6 }).withMessage('Username phải có ít nhất 6 ký tự').trim(),
    body('email').optional().isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
    body('password').optional().isLength({ min: 6 }).withMessage('Password phải có ít nhất 6 ký tự'),
    body('admin').optional().isBoolean()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { userId } = req.params;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy user' });
      }

      const { username, email, password, admin } = req.body;

      // Check username uniqueness if changing
      if (username && username !== user.username) {
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
          return res.status(409).json({ message: 'Username đã tồn tại' });
        }
        user.username = username;
      }

      // Check email uniqueness if changing
      if (email && email !== user.email) {
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
          return res.status(409).json({ message: 'Email đã tồn tại' });
        }
        user.email = email;
      }

      // Update password if provided
      if (password) {
        user.password = password;
      }

      // Update admin status
      if (admin !== undefined) {
        user.admin = admin;
      }

      await user.save();

      res.json({
        message: 'Cập nhật user thành công',
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          admin: user.admin
        }
      });
    } catch (err) {
      console.error('❌ Error updating user:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * Delete user (Admin only)
 * DELETE /api/admin/users/:userId
 */
router.delete('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent deleting yourself
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Không thể xóa chính mình' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }

    await User.findByIdAndDelete(userId);

    res.json({ message: 'Đã xóa user thành công' });
  } catch (err) {
    console.error('❌ Error deleting user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get order statistics (Admin only)
 * GET /api/admin/orders/stats
 */
router.get('/orders/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    
    // Tính toán thời gian chính xác (dùng UTC để tránh timezone issues)
    // Start of today: 00:00:00.000 (local time)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    // End of today: 23:59:59.999 (local time)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    // Start of month: ngày 1, 00:00:00.000
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    // End of month: hiện tại
    const endOfMonth = now;

    // Tổng đơn hàng hôm nay (tất cả đơn được tạo trong ngày hôm nay)
    const todayOrders = await Order.countDocuments({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    });

    // Đơn chờ xác nhận (tất cả đơn có orderStatus = 'pending')
    // Hoặc đơn cũ có status = 'pending' nhưng chưa có orderStatus
    const pendingConfirmation = await Order.countDocuments({
      $or: [
        { orderStatus: 'pending' },
        { 
          status: 'pending',
          $or: [
            { orderStatus: { $exists: false } },
            { orderStatus: null }
          ]
        }
      ]
    });

    // Đơn đang xử lý (tất cả đơn có orderStatus = 'processing')
    const processing = await Order.countDocuments({
      orderStatus: 'processing'
    });

    // Doanh thu hôm nay: Tính tổng giá trị đơn đã thanh toán hôm nay
    const todayOrdersList = await Order.find({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      },
      $or: [
        { paymentStatus: 'paid' },
        { status: 'paid', paymentStatus: { $exists: false } }
      ]
    });

    const todayRevenue = todayOrdersList.reduce((sum, order) => {
      const isPaid = order.paymentStatus === 'paid' || (order.status === 'paid' && !order.paymentStatus);
      if (isPaid) {
        return sum + (order.totalAmount || 0);
      }
      return sum;
    }, 0);

    // Doanh thu tháng này: Tính tổng giá trị đơn đã thanh toán trong tháng
    const monthOrdersList = await Order.find({
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth
      },
      $or: [
        { paymentStatus: 'paid' },
        { status: 'paid', paymentStatus: { $exists: false } }
      ]
    });

    const monthRevenue = monthOrdersList.reduce((sum, order) => {
      return sum + (order.totalAmount || 0);
    }, 0);

    // Debug log để kiểm tra
    console.log('📊 Order Stats:', {
      now: now.toISOString(),
      startOfToday: startOfToday.toISOString(),
      endOfToday: endOfToday.toISOString(),
      todayOrders,
      pendingConfirmation,
      processing,
      todayRevenue,
      monthRevenue
    });

    res.json({
      todayOrders,
      pendingConfirmation,
      processing,
      todayRevenue,
      monthRevenue
    });
  } catch (err) {
    console.error('❌ Error fetching order stats:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get all orders (Admin only)
 * GET /api/admin/orders?orderStatus=pending&paymentStatus=paid&search=...&startDate=...&endDate=...&customerEmail=...&customerPhone=...&customerName=...&page=1&limit=20&sortBy=date&sortOrder=desc
 */
router.get('/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      orderStatus,
      paymentStatus,
      search,
      startDate,
      endDate,
      customerEmail,
      customerPhone,
      customerName,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filter by orderStatus
    if (orderStatus) {
      query.orderStatus = orderStatus;
    }

    // Filter by paymentStatus
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire end date
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Customer filters
    if (customerEmail) {
      query['customer.email'] = { $regex: customerEmail, $options: 'i' };
    }
    if (customerPhone) {
      query['customer.phone'] = { $regex: customerPhone, $options: 'i' };
    }
    if (customerName) {
      query['customer.name'] = { $regex: customerName, $options: 'i' };
    }

    // Search filter (order ID, customer name/email/phone)
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { _id: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { 'customer.name': searchRegex },
        { 'customer.email': searchRegex },
        { 'customer.phone': searchRegex }
      ];
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case 'date':
        sort.createdAt = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'amount':
        sort.totalAmount = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'status':
        sort.orderStatus = sortOrder === 'asc' ? 1 : -1;
        break;
      default:
        sort.createdAt = -1;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const total = await Order.countDocuments(query);

    // Fetch orders with pagination
    const orders = await Order.find(query)
      .populate('userId', 'username email')
      .populate('confirmedBy', 'username email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      orders,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages
    });
  } catch (err) {
    console.error('❌ Error fetching orders:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get order by ID (Admin only)
 * GET /api/admin/orders/:id
 */
router.get('/orders/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate('userId', 'username email')
      .populate('confirmedBy', 'username email');

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    res.json(order);
  } catch (err) {
    console.error('❌ Error fetching order:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Confirm order (Admin only)
 * PUT /api/admin/orders/:id/confirm
 */
router.put('/orders/:id/confirm', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    if (order.orderStatus !== 'pending') {
      return res.status(400).json({ message: 'Chỉ có thể xác nhận đơn hàng ở trạng thái pending' });
    }

    order.orderStatus = 'confirmed';
    order.confirmedAt = new Date();
    order.confirmedBy = req.user.id;
    await order.save();

    await order.populate('confirmedBy', 'username email');

    // Send confirmation email to user (non-blocking)
    try {
      await emailService.sendOrderConfirmedEmailToUser(order);
      console.log('✅ Order confirmed email sent to user');
    } catch (emailErr) {
      console.error('⚠️ Failed to send order confirmed email to user:', emailErr.message);
    }

    res.json({
      message: 'Đã xác nhận đơn hàng thành công',
      order
    });
  } catch (err) {
    console.error('❌ Error confirming order:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Start processing order (Admin only)
 * PUT /api/admin/orders/:id/processing
 */
router.put('/orders/:id/processing', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    if (order.orderStatus !== 'confirmed') {
      return res.status(400).json({ message: 'Chỉ có thể bắt đầu xử lý đơn hàng đã được xác nhận' });
    }

    order.orderStatus = 'processing';
    order.processingAt = new Date();
    await order.save();

    // Send processing email to user (non-blocking)
    try {
      await emailService.sendOrderProcessingEmailToUser(order);
      console.log('✅ Order processing email sent to user');
    } catch (emailErr) {
      console.error('⚠️ Failed to send order processing email to user:', emailErr.message);
    }

    res.json({
      message: 'Đã bắt đầu xử lý đơn hàng',
      order
    });
  } catch (err) {
    console.error('❌ Error starting order processing:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Complete order (Admin only)
 * PUT /api/admin/orders/:id/complete
 */
router.put('/orders/:id/complete', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    if (order.orderStatus !== 'processing') {
      return res.status(400).json({ message: 'Chỉ có thể hoàn thành đơn hàng đang xử lý' });
    }

    order.orderStatus = 'completed';
    order.completedAt = new Date();
    await order.save();

    // Send completed email to user (non-blocking)
    try {
      await emailService.sendOrderCompletedEmailToUser(order);
      console.log('✅ Order completed email sent to user');
    } catch (emailErr) {
      console.error('⚠️ Failed to send order completed email to user:', emailErr.message);
    }

    res.json({
      message: 'Đã hoàn thành đơn hàng',
      order
    });
  } catch (err) {
    console.error('❌ Error completing order:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Cancel order (Admin only)
 * PUT /api/admin/orders/:id/cancel
 */
router.put('/orders/:id/cancel', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    if (order.orderStatus === 'completed') {
      return res.status(400).json({ message: 'Không thể hủy đơn hàng đã hoàn thành' });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ message: 'Đơn hàng đã bị hủy' });
    }

    order.orderStatus = 'cancelled';
    await order.save();

    // Send cancellation email to user (non-blocking)
    const reason = req.body.reason || req.body.cancelReason;
    try {
      await emailService.sendOrderCancelledEmailToUser(order, reason);
      console.log('✅ Order cancelled email sent to user');
    } catch (emailErr) {
      console.error('⚠️ Failed to send order cancelled email to user:', emailErr.message);
    }

    res.json({
      message: 'Đã hủy đơn hàng',
      order
    });
  } catch (err) {
    console.error('❌ Error cancelling order:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Update order (Admin only) - for adminNotes and other fields
 * PUT /api/admin/orders/:id
 */
router.put(
  '/orders/:id',
  authenticateToken,
  requireAdmin,
  [
    body('adminNotes').optional().isString().trim(),
    body('orderStatus').optional().isIn(['pending', 'confirmed', 'processing', 'completed', 'cancelled']),
    body('paymentStatus').optional().isIn(['pending', 'paid', 'failed'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { adminNotes, orderStatus, paymentStatus } = req.body;

      const order = await Order.findById(id);

      if (!order) {
        return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
      }

      if (adminNotes !== undefined) {
        order.adminNotes = adminNotes;
      }

      if (orderStatus !== undefined) {
        order.orderStatus = orderStatus;
      }

      if (paymentStatus !== undefined) {
        order.paymentStatus = paymentStatus;
      }

      await order.save();
      await order.populate('confirmedBy', 'username email');

      res.json({
        message: 'Đã cập nhật đơn hàng',
        order
      });
    } catch (err) {
      console.error('❌ Error updating order:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;

