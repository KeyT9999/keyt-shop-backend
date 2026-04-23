const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const geminiAccountService = require('../services/gemini-account.service');
const { getTOTPCode } = require('../utils/totp.util');

const router = express.Router();

/**
 * Get OTP for Gemini email (User)
 * POST /api/gemini/get-otp
 */
router.post('/get-otp', authenticateToken, async (req, res) => {
  try {
    const { geminiEmail } = req.body;
    if (!geminiEmail) {
      return res.status(400).json({ message: 'Vui lòng nhập email Gemini.' });
    }

    const normalized = geminiEmail.trim().toLowerCase();
    const account = await geminiAccountService.findByEmail(normalized);

    if (!account) {
      return res.status(404).json({ message: 'Không tìm thấy email Gemini trong hệ thống!' });
    }

    const otp = getTOTPCode(account.secretKey);

    res.json({
      otp,
      geminiEmail: account.geminiEmail
    });
  } catch (err) {
    console.error('❌ Error getting Gemini OTP:', err);
    res.status(500).json({ message: 'Có lỗi xảy ra khi tạo mã OTP Gemini.' });
  }
});

/**
 * Get all Gemini accounts (Admin only)
 * GET /api/gemini/accounts
 */
router.get('/accounts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const accounts = await geminiAccountService.getAllGeminiAccounts();
    res.json(accounts);
  } catch (err) {
    console.error('❌ Error fetching Gemini accounts:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Add Gemini account (Admin only)
 * POST /api/gemini/accounts
 */
router.post('/accounts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { geminiEmail, secretKey } = req.body;
    if (!geminiEmail || !secretKey) {
      return res.status(400).json({ message: 'Email và Secret Key là bắt buộc.' });
    }

    const normalized = geminiEmail.trim().toLowerCase();
    const exists = await geminiAccountService.existsByEmail(normalized);
    if (exists) {
      return res.status(409).json({ message: 'Email Gemini đã tồn tại.' });
    }

    const account = await geminiAccountService.saveGeminiAccount({
      geminiEmail: normalized,
      secretKey: secretKey.trim()
    });

    const otp = getTOTPCode(account.secretKey);

    res.status(201).json({ account, otp });
  } catch (err) {
    console.error('❌ Error creating Gemini account:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Update Gemini account (Admin only)
 * PUT /api/gemini/accounts/:id
 */
router.put('/accounts/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { geminiEmail, secretKey } = req.body;
    const account = await geminiAccountService.updateGeminiAccount(req.params.id, {
      geminiEmail,
      secretKey
    });

    if (!account) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    }

    const otp = getTOTPCode(account.secretKey);

    res.json({ account, otp });
  } catch (err) {
    console.error('❌ Error updating Gemini account:', err);
    if (err.message.includes('đã tồn tại')) {
      return res.status(409).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Delete Gemini account (Admin only)
 * DELETE /api/gemini/accounts/:id
 */
router.delete('/accounts/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const deleted = await geminiAccountService.deleteGeminiAccount(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    }
    res.json({ message: 'Đã xóa tài khoản Gemini thành công.' });
  } catch (err) {
    console.error('❌ Error deleting Gemini account:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
