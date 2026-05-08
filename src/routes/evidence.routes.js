const express = require('express');
const { findEvidence, splitClaims } = require('../services/evidence.service');

const router = express.Router();

router.post('/', async (req, res) => {
  const { query, apiKey, maxResults } = req.body || {};

  if (!query || !query.trim()) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập thông tin cần xác thực.' });
  }

  if (!apiKey || !apiKey.trim()) {
    return res.status(400).json({ success: false, message: 'Gemini API Key không được để trống.' });
  }

  try {
    // findEvidence giờ trả về { evidence, verdict }
    const { evidence, verdict } = await findEvidence({
      query: query.trim(),
      apiKey: apiKey.trim(),
      maxResults,
    });

    return res.json({
      success: true,
      evidence,
      verdict, // có thể null nếu verdict call thất bại (fail-safe)
    });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Đã xảy ra lỗi khi tìm kiếm evidence.',
      code: error?.code || null,
    });
  }
});

router.post('/split-claims', async (req, res) => {
  const { text, apiKey } = req.body || {};

  try {
    const claims = await splitClaims({
      text: (text || '').toString(),
      apiKey: (apiKey || '').toString(),
    });

    return res.json({
      success: true,
      claims,
    });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Đã xảy ra lỗi khi tách claim.',
      code: error?.code || null,
    });
  }
});

module.exports = router;
