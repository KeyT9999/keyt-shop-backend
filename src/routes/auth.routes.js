const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user.model');
const userLoginHistoryService = require('../services/user-login-history.service');
const emailService = require('../services/email.service');
const passwordResetService = require('../services/password-reset.service');
const tokenService = require('../services/token.service');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau.' }
});

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const error = new Error('JWT_SECRET chưa được cấu hình.');
    error.code = 'MISSING_JWT_SECRET';
    throw error;
  }
  return secret;
};

const createToken = (user) => {
  const payload = {
    id: user._id,
    username: user.username,
    admin: user.admin,
    role: user.admin ? 'admin' : 'user'
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' }); // Tăng lên 7 ngày
};
const getGoogleClientId = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const error = new Error('GOOGLE_CLIENT_ID chưa được cấu hình.');
    error.code = 'MISSING_GOOGLE_CLIENT_ID';
    throw error;
  }
  return clientId;
};

const ensureUniqueUsername = async (base) => {
  let candidate = base;
  while (await User.exists({ username: candidate })) {
    const suffix = Math.floor(Math.random() * 10000);
    candidate = `${base}${suffix}`;
  }
  return candidate.length >= 6 ? candidate : `${candidate}google`;
};

router.post(
  '/register',
  [
    body('username').isLength({ min: 6 }).withMessage('Username tối thiểu 6 ký tự').trim().escape(),
    body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password tối thiểu 6 ký tự').trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
      getJwtSecret();
      const existingUser = await User.findOne({ $or: [{ username }, { email }] });
      if (existingUser) {
        return res.status(409).json({ message: 'Username hoặc email đã tồn tại.' });
      }

      const verificationToken = tokenService.generateToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = await User.create({
        username,
        email,
        password,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires
      });
      const token = createToken(user);

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(user.email, user.username);
      } catch (emailErr) {
        console.warn('⚠️ Failed to send welcome email:', emailErr.message);
        // Don't fail registration if email fails
      }


      const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
      try {
        await emailService.sendEmailVerificationEmail(user.email, user.username, verifyLink);
      } catch (emailErr) {
        console.warn('⚠️ Failed to send verification email:', emailErr.message);
      }

      res.status(201).json({
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          admin: user.admin,
          emailVerified: user.emailVerified
        },
        token
      });
    } catch (err) {
      console.error('❌ Lỗi register:', err);
      if (err.code === 'MISSING_JWT_SECRET') {
        return res.status(500).json({ message: err.message });
      }
      res.status(500).json({ message: 'Không thể đăng ký, thử lại sau.' });
    }
  }
);

router.post(
  '/login',
  loginLimiter,
  [
    body('username').notEmpty().withMessage('Username không được để trống').trim().escape(),
    body('password').notEmpty().withMessage('Password không được để trống').trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({ message: 'Username không tồn tại.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Sai mật khẩu.' });
      }

      if (!user.emailVerified) {
        return res.status(403).json({ message: 'Tài khoản chưa xác minh email.', code: 'EMAIL_NOT_VERIFIED' });
      }

      // Record login history
      const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || 
                        req.headers['x-real-ip'] || 
                        req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];
      try {
        await userLoginHistoryService.recordLogin(user._id.toString(), ipAddress, userAgent);
      } catch (historyErr) {
        console.warn('⚠️ Failed to record login history:', historyErr.message);
        // Don't fail login if history recording fails
      }

      const token = createToken(user);
      res.json({
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          admin: user.admin,
          emailVerified: user.emailVerified
        },
        token
      });
    } catch (err) {
      console.error('❌ Lỗi login:', err);
      res.status(500).json({ message: 'Không thể đăng nhập, thử lại sau.' });
    }
  }
);

router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email } = req.body;
      const result = await passwordResetService.requestPasswordReset(email);
      
      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(400).json({ message: result.message });
      }
    } catch (err) {
      console.error('❌ Error in forgot-password:', err);
      res.status(500).json({ message: 'Có lỗi xảy ra. Vui lòng thử lại sau.' });
    }
  }
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token không được để trống'),
    body('newPassword').isLength({ min: 6 }).withMessage('Mật khẩu mới tối thiểu 6 ký tự').trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { token, newPassword } = req.body;
      const result = await passwordResetService.resetPasswordWithToken(token, newPassword);
      
      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(400).json({ message: result.message });
      }
    } catch (err) {
      console.error('❌ Error in reset-password:', err);
      res.status(500).json({ message: 'Có lỗi xảy ra. Vui lòng thử lại sau.' });
    }
  }
);

router.post('/google', async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) {
    return res.status(400).json({ message: 'Google token chưa có.' });
  }

  try {
    getJwtSecret();
    const clientId = getGoogleClientId();
    const googleClient = new OAuth2Client(clientId);
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId
    });
    const payload = ticket.getPayload();
    const email = payload?.email;

    if (!email) {
      return res.status(400).json({ message: 'Email không hợp lệ từ Google.' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      const username = await ensureUniqueUsername(base || 'google');
      user = await User.create({
        username,
        email,
        password: null,
        loginType: 'login-google',
        emailVerified: true
      });
      
      // Send welcome email for new Google users
      try {
        await emailService.sendWelcomeEmail(user.email, user.username);
      } catch (emailErr) {
        console.warn('⚠️ Failed to send welcome email:', emailErr.message);
      }

    }

    // Record login history
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || 
                      req.headers['x-real-ip'] || 
                      req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    try {
      await userLoginHistoryService.recordLogin(user._id.toString(), ipAddress, userAgent);
    } catch (historyErr) {
      console.warn('⚠️ Failed to record login history:', historyErr.message);
    }

    const token = createToken(user);
    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        admin: user.admin,
        emailVerified: user.emailVerified
      },
      token
    });
  } catch (err) {
    console.error('❌ Lỗi Google login:', err);
    if (err.code === 'MISSING_JWT_SECRET' || err.code === 'MISSING_GOOGLE_CLIENT_ID') {
      return res.status(500).json({ message: err.message });
    }
    res.status(400).json({ message: 'Token Google không hợp lệ.' });
  }
});

router.post(
  '/verify-email',
  [body('token').notEmpty().withMessage('Token không được để trống')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { token } = req.body;
      const user = await User.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() }
      });

      if (!user) {
        return res.status(400).json({ message: 'Link xác minh không hợp lệ hoặc đã hết hạn.' });
      }

      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      res.json({ message: 'Xác minh email thành công.' });
    } catch (err) {
      console.error('❌ Error in verify-email:', err);
      res.status(500).json({ message: 'Có lỗi xảy ra. Vui lòng thử lại sau.' });
    }
  }
);

router.post(
  '/resend-verification',
  [body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.json({ message: 'Nếu email tồn tại, link xác minh đã được gửi.' });
      }

      if (user.emailVerified) {
        return res.json({ message: 'Email đã được xác minh.' });
      }

      const token = tokenService.generateToken();
      user.emailVerificationToken = token;
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();

      const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
      await emailService.sendEmailVerificationEmail(user.email, user.username, verifyLink);

      res.json({ message: 'Link xác minh đã được gửi tới email của bạn.' });
    } catch (err) {
      console.error('❌ Error in resend-verification:', err);
      res.status(500).json({ message: 'Có lỗi xảy ra. Vui lòng thử lại sau.' });
    }
  }
);

module.exports = router;

