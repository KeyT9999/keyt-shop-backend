const express = require('express');
const { findEvidence } = require('../services/evidence.service');

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
    const evidence = await findEvidence({
      query: query.trim(),
      apiKey: apiKey.trim(),
      maxResults,
    });

    return res.json({
      success: true,
      evidence,
    });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Đã xảy ra lỗi khi tìm kiếm evidence.',
    });
  }
});

module.exports = router;
