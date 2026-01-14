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
    console.error('âŒ Error fetching dashboard stats:', err);
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
      return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y user.' });
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
    console.error('âŒ Error fetching user login history:', err);
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
    console.error('âŒ Error fetching OTP requests:', err);
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
    console.error('âŒ Error fetching users:', err);
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
    body('username').isLength({ min: 6 }).withMessage('Username pháº£i cÃ³ Ã­t nháº¥t 6 kÃ½ tá»±').trim(),
    body('email').isEmail().withMessage('Email khÃ´ng há»£p lá»‡').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password pháº£i cÃ³ Ã­t nháº¥t 6 kÃ½ tá»±'),
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
        return res.status(409).json({ message: 'Username Ä‘Ã£ tá»“n táº¡i' });
      }

      // Check if email already exists
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(409).json({ message: 'Email Ä‘Ã£ tá»“n táº¡i' });
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
        message: 'Táº¡o user thÃ nh cÃ´ng',
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          admin: user.admin
        }
      });
    } catch (err) {
      console.error('âŒ Error creating user:', err);
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
    body('username').optional().isLength({ min: 6 }).withMessage('Username pháº£i cÃ³ Ã­t nháº¥t 6 kÃ½ tá»±').trim(),
    body('email').optional().isEmail().withMessage('Email khÃ´ng há»£p lá»‡').normalizeEmail(),
    body('password').optional().isLength({ min: 6 }).withMessage('Password pháº£i cÃ³ Ã­t nháº¥t 6 kÃ½ tá»±'),
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
        return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y user' });
      }

      const { username, email, password, admin } = req.body;

      // Check username uniqueness if changing
      if (username && username !== user.username) {
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
          return res.status(409).json({ message: 'Username Ä‘Ã£ tá»“n táº¡i' });
        }
        user.username = username;
      }

      // Check email uniqueness if changing
      if (email && email !== user.email) {
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
          return res.status(409).json({ message: 'Email Ä‘Ã£ tá»“n táº¡i' });
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
        message: 'Cáº­p nháº­t user thÃ nh cÃ´ng',
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          admin: user.admin
        }
      });
    } catch (err) {
      console.error('âŒ Error updating user:', err);
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
      return res.status(400).json({ message: 'KhÃ´ng thá»ƒ xÃ³a chÃ­nh mÃ¬nh' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y user' });
    }

    await User.findByIdAndDelete(userId);

    res.json({ message: 'ÄÃ£ xÃ³a user thÃ nh cÃ´ng' });
  } catch (err) {
    console.error('âŒ Error deleting user:', err);
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

    // TÃ­nh toÃ¡n thá»i gian chÃ­nh xÃ¡c (dÃ¹ng UTC Ä‘á»ƒ trÃ¡nh timezone issues)
    // Start of today: 00:00:00.000 (local time)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    // End of today: 23:59:59.999 (local time)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Start of month: ngÃ y 1, 00:00:00.000
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    // End of month: hiá»‡n táº¡i
    const endOfMonth = now;

    // Tá»•ng Ä‘Æ¡n hÃ ng hÃ´m nay (táº¥t cáº£ Ä‘Æ¡n Ä‘Æ°á»£c táº¡o trong ngÃ y hÃ´m nay)
    const todayOrders = await Order.countDocuments({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    });

    // ÄÆ¡n chá» xÃ¡c nháº­n (táº¥t cáº£ Ä‘Æ¡n cÃ³ orderStatus = 'pending')
    // Hoáº·c Ä‘Æ¡n cÅ© cÃ³ status = 'pending' nhÆ°ng chÆ°a cÃ³ orderStatus
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

    // ÄÆ¡n Ä‘ang xá»­ lÃ½ (táº¥t cáº£ Ä‘Æ¡n cÃ³ orderStatus = 'processing')
    const processing = await Order.countDocuments({
      orderStatus: 'processing'
    });

    // Doanh thu hÃ´m nay: TÃ­nh tá»•ng giÃ¡ trá»‹ Ä‘Æ¡n Ä‘Ã£ thanh toÃ¡n hÃ´m nay
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

    // Doanh thu thÃ¡ng nÃ y: TÃ­nh tá»•ng giÃ¡ trá»‹ Ä‘Æ¡n Ä‘Ã£ thanh toÃ¡n trong thÃ¡ng
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

    // Debug log Ä‘á»ƒ kiá»ƒm tra
    console.log('ðŸ“Š Order Stats:', {
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
    console.error('âŒ Error fetching order stats:', err);
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

    // Search filter (orderCode, order ID, customer name/email/phone)
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { _id: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { 'customer.name': searchRegex },
        { 'customer.email': searchRegex },
        { 'customer.phone': searchRegex }
      ];

      // If search is a number, also search by orderCode
      const searchNumber = parseInt(search);
      if (!isNaN(searchNumber)) {
        query.$or.push({ orderCode: searchNumber });
      }
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
    console.error('âŒ Error fetching orders:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get order by ID (Admin only)
 * GET /api/admin/orders/:id
 */
