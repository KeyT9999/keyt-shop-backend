const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const chatGptAccountService = require('../services/chatgpt-account.service');
const otpRequestService = require('../services/otp-request.service');
const { getTOTPCode } = require('../utils/totp.util');

const router = express.Router();

/**
 * Get OTP for ChatGPT email (User)
 * POST /api/chatgpt/get-otp
 */
router.post('/get-otp', authenticateToken, async (req, res) => {
  try {
    const { chatgptEmail } = req.body;
    if (!chatgptEmail) {
      return res.status(400).json({ message: 'Vui lòng nhập email ChatGPT.' });
    }

    const normalized = chatgptEmail.trim().toLowerCase();
    const account = await chatGptAccountService.findByEmail(normalized);

    if (!account) {
      return res.status(404).json({ message: 'Không tìm thấy email ChatGPT trong hệ thống!' });
    }

    // Generate OTP
    const otp = getTOTPCode(account.secretKey);

    res.json({
      otp,
      chatgptEmail: account.chatgptEmail
    });
  } catch (err) {
    console.error('❌ Error getting OTP:', err);
    res.status(500).json({ message: 'Có lỗi xảy ra khi tạo mã OTP.' });
  }
});

/**
 * Generate 2FA code from raw secret key (User)
 * POST /api/chatgpt/generate-2fa
 */
router.post('/generate-2fa', authenticateToken, async (req, res) => {
  try {
    const { secretKey } = req.body;
    if (!secretKey) {
      return res.status(400).json({ message: 'Vui lòng nhập mã bí mật.' });
    }
    const cleaned = secretKey.replace(/\s+/g, '');
    const code = getTOTPCode(cleaned);
    const expiresIn = 30 - (Math.floor(Date.now() / 1000) % 30);
    res.json({ code, expiresIn });
  } catch (err) {
    console.error('❌ Error generating 2FA:', err);
    res.status(500).json({ message: 'Mã bí mật không hợp lệ.' });
  }
});

/**
 * Get all ChatGPT accounts (Admin only)
 * GET /api/chatgpt/accounts
 */
router.get('/accounts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const accounts = await chatGptAccountService.getAllChatGptAccounts();
    res.json(accounts);
  } catch (err) {
    console.error('❌ Error fetching accounts:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Add ChatGPT account (Admin only)
 * POST /api/chatgpt/accounts
 */
router.post('/accounts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { chatgptEmail, secretKey } = req.body;
    if (!chatgptEmail || !secretKey) {
      return res.status(400).json({ message: 'Email và Secret Key là bắt buộc.' });
    }

    const normalized = chatgptEmail.trim().toLowerCase();
    const exists = await chatGptAccountService.existsByEmail(normalized);
    if (exists) {
      return res.status(409).json({ message: 'Email ChatGPT đã tồn tại.' });
    }

    const account = await chatGptAccountService.saveChatGptAccount({
      chatgptEmail: normalized,
      secretKey: secretKey.trim()
    });

    // Generate current OTP
    const otp = getTOTPCode(account.secretKey);

    res.status(201).json({
      account,
      otp
    });
  } catch (err) {
    console.error('❌ Error creating account:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Update ChatGPT account (Admin only)
 * PUT /api/chatgpt/accounts/:id
 */
router.put('/accounts/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { chatgptEmail, secretKey } = req.body;
    const account = await chatGptAccountService.updateChatGptAccount(req.params.id, {
      chatgptEmail,
      secretKey
    });

    if (!account) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    }

    // Generate current OTP
    const otp = getTOTPCode(account.secretKey);

    res.json({
      account,
      otp
    });
  } catch (err) {
    console.error('❌ Error updating account:', err);
    if (err.message.includes('đã tồn tại')) {
      return res.status(409).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Delete ChatGPT account (Admin only)
 * DELETE /api/chatgpt/accounts/:id
 */
router.delete('/accounts/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const deleted = await chatGptAccountService.deleteChatGptAccount(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    }
    res.json({ message: 'Đã xóa tài khoản thành công.' });
  } catch (err) {
    console.error('❌ Error deleting account:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

