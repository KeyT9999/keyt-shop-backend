const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/user.model');
const Order = require('../models/order.model');
const { authenticateToken } = require('../middleware/auth.middleware');
const userLoginHistoryService = require('../services/user-login-history.service');
const otpRequestService = require('../services/otp-request.service');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/user/gemini-api-key
 * Get user's Gemini API key
 */
router.get('/gemini-api-key', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+geminiApiKey');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      hasKey: !!user.geminiApiKey,
      // Don't return the actual key for security, just indicate if it exists
    });
  } catch (err) {
    console.error('❌ Error fetching Gemini API key:', err);
    res.status(500).json({ message: 'Không thể lấy thông tin API key' });
  }
});

/**
 * PUT /api/user/gemini-api-key
 * Save or update Gemini API key
 */
router.put(
  '/gemini-api-key',
  [
    body('apiKey')
      .trim()
      .notEmpty()
      .withMessage('API Key không được để trống')
      .isLength({ min: 10 })
      .withMessage('API Key phải có ít nhất 10 ký tự')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.geminiApiKey = req.body.apiKey.trim();
      await user.save();

      res.json({ message: 'API Key đã được lưu thành công' });
    } catch (err) {
      console.error('❌ Error saving Gemini API key:', err);
      res.status(500).json({ message: 'Không thể lưu API key' });
    }
  }
);

/**
 * GET /api/user/profile
 * Get current user profile
 */
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

      const userWithKey = await User.findById(req.user.id).select('+geminiApiKey');
      res.json({
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone || null,
        displayName: user.displayName || null,
        avatar: user.avatar || null,
        address: user.address || null,
        loginType: user.loginType,
        admin: user.admin,
        settings: user.settings || {},
        geminiApiKey: userWithKey?.geminiApiKey || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
  } catch (err) {
    console.error('❌ Error fetching profile:', err);
    res.status(500).json({ message: 'Không thể lấy thông tin profile' });
  }
});

/**
 * PUT /api/user/profile
 * Update profile information
 */
router.put(
  '/profile',
    [
      body('email').optional().isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
      body('phone').optional().trim(),
      body('displayName').optional().trim(),
      body('avatar').optional().custom((value) => {
        if (value === null || value === undefined || value === '') {
          return true;
        }
        // If value is provided, it must be a valid URL
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(value)) {
          throw new Error('Avatar phải là URL hợp lệ');
        }
        return true;
      }),
      body('address').optional().isObject()
    ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { email, phone, displayName, avatar, address, settings } = req.body;

      // Check if email is being changed and if it's already taken
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(409).json({ message: 'Email đã được sử dụng bởi tài khoản khác' });
        }
        user.email = email;
      }

      if (phone !== undefined) user.phone = phone || null;
      if (displayName !== undefined) user.displayName = displayName || null;
      if (avatar !== undefined) user.avatar = avatar || null;
      if (address !== undefined) user.address = address || null;
      if (settings !== undefined) user.settings = { ...user.settings, ...settings };

      await user.save();

      res.json({
        message: 'Cập nhật profile thành công',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          displayName: user.displayName,
          avatar: user.avatar,
          address: user.address,
          settings: user.settings
        }
      });
    } catch (err) {
      console.error('❌ Error updating profile:', err);
      res.status(500).json({ message: 'Không thể cập nhật profile' });
    }
  }
);

/**
 * PUT /api/user/password
 * Change password (requires current password)
 */
router.put(
  '/password',
  [
    body('currentPassword').notEmpty().withMessage('Mật khẩu hiện tại không được để trống'),
    body('newPassword').isLength({ min: 6 }).withMessage('Mật khẩu mới tối thiểu 6 ký tự').trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.loginType === 'login-google') {
        return res.status(400).json({ message: 'Tài khoản Google không thể đổi mật khẩu' });
      }

      const { currentPassword, newPassword } = req.body;

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng' });
      }

      user.password = newPassword;
      await user.save();

      res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (err) {
      console.error('❌ Error changing password:', err);
      res.status(500).json({ message: 'Không thể đổi mật khẩu' });
    }
  }
);

/**
 * GET /api/user/orders
 * Get user's order history
 */
router.get('/orders', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find orders by user email (since orders are linked by customer email)
    const orders = await Order.find({ 'customer.email': user.email })
      .sort({ createdAt: -1 })
      .lean();

    res.json(orders);
  } catch (err) {
    console.error('❌ Error fetching orders:', err);
    res.status(500).json({ message: 'Không thể lấy lịch sử đơn hàng' });
  }
});

/**
 * GET /api/user/orders/:orderId
 * Get order details
 */
router.get('/orders/:orderId', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const order = await Order.findById(req.params.orderId).lean();
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify order belongs to user
    if (order.customer.email !== user.email) {
      return res.status(403).json({ message: 'Bạn không có quyền xem đơn hàng này' });
    }

    res.json(order);
  } catch (err) {
    console.error('❌ Error fetching order:', err);
    res.status(500).json({ message: 'Không thể lấy thông tin đơn hàng' });
  }
});

/**
 * GET /api/user/activity
 * Get user activity (OTP requests)
 */
router.get('/activity', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get OTP requests
    const otpRequests = await otpRequestService.getOtpRequestsByUser(userId);

    res.json({
      otpRequests: otpRequests.map(req => ({
        id: req._id,
        chatgptEmail: req.chatgptEmail,
        requestedAt: req.requestedAt
      }))
    });
  } catch (err) {
    console.error('❌ Error fetching activity:', err);
    res.status(500).json({ message: 'Không thể lấy hoạt động' });
  }
});

/**
 * GET /api/user/login-history
 * Get user's login history
 */
router.get('/login-history', async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await userLoginHistoryService.getLoginHistoryByUser(userId);

    res.json(history.map(entry => ({
      id: entry._id,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      loginTime: entry.loginTime
    })));
  } catch (err) {
    console.error('❌ Error fetching login history:', err);
    res.status(500).json({ message: 'Không thể lấy lịch sử đăng nhập' });
  }
});

/**
 * POST /api/user/logout-all
 * Logout all devices (invalidate all tokens)
 * Note: This is a placeholder - actual token invalidation would require a token blacklist
 */
router.post('/logout-all', async (req, res) => {
  try {
    // In a production system, you would:
    // 1. Store tokens in a database/Redis
    // 2. Add current token to blacklist
    // 3. Check blacklist on authentication
    
    // For now, we'll just return success
    // The client should clear localStorage
    res.json({ message: 'Đã đăng xuất tất cả thiết bị. Vui lòng đăng nhập lại.' });
  } catch (err) {
    console.error('❌ Error logging out all devices:', err);
    res.status(500).json({ message: 'Không thể đăng xuất' });
  }
});

/**
 * DELETE /api/user/account
 * Delete account (requires password confirmation)
 */
router.delete(
  '/account',
  [
    body('password').notEmpty().withMessage('Mật khẩu không được để trống')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { password } = req.body;

      // Verify password
      if (user.loginType === 'login-common') {
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return res.status(401).json({ message: 'Mật khẩu không đúng' });
        }
      }

      // Delete user
      await User.findByIdAndDelete(req.user.id);

      res.json({ message: 'Tài khoản đã được xóa thành công' });
    } catch (err) {
      console.error('❌ Error deleting account:', err);
      res.status(500).json({ message: 'Không thể xóa tài khoản' });
    }
  }
);

module.exports = router;

