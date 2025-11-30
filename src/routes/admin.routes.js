const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const chatGptAccountService = require('../services/chatgpt-account.service');
const otpRequestService = require('../services/otp-request.service');
const userLoginHistoryService = require('../services/user-login-history.service');
const subscriptionService = require('../services/subscription.service');
const User = require('../models/user.model');

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

module.exports = router;

