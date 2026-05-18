'use strict';

const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { compress, getMetadata, MIME_TO_FORMAT } = require('../services/compression.service');
const { getConfig } = require('../config/compression.config');

const router = express.Router();

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// 20 requests per minute per IP — chặn DOS/bot abuse
const compressLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 20, // tối đa 20 request/phút/IP
  message: { error: true, message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
  }
});

// ─── Multer Config ────────────────────────────────────────────────────────────
// Giới hạn 15MB tại multer layer — chặn OOM trước khi buffer vào RAM
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB hard limit
  }
});

// ─── MIME Validation ──────────────────────────────────────────────────────────
const ALLOWED_MIMES = new Set(Object.keys(MIME_TO_FORMAT));

/**
 * POST /api/compress
 * Nén một ảnh duy nhất
 *
 * Query params:
 *   - format {string} Định dạng output (default: 'webp'). Dùng 'auto' để giữ format gốc.
 *   - quality {number} Chất lượng 1-100
 *   - width {number} Chiều rộng tối đa (px)
 *
 * Body: multipart/form-data với field 'file'
 *
 * Response: { name, mime, originalSize, compressedSize, savedBytes, ratio, data, error }
 */
router.post('/', compressLimiter, upload.single('file'), async (req, res) => {
  try {
    // Kiểm tra file có được gửi không
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'file required' });
    }

    // Kiểm tra MIME type — chặn file không phải ảnh
    if (!ALLOWED_MIMES.has(req.file.mimetype)) {
      return res.status(400).json({
        error: true,
        message: `Định dạng không hỗ trợ: ${req.file.mimetype}. Cho phép: JPEG, PNG, WebP, AVIF, GIF`
      });
    }

    // Kiểm tra file size theo config (env var hoặc default 10MB)
    const config = getConfig();
    if (req.file.buffer.length > config.maxFileSize) {
      return res.status(413).json({
        error: true,
        message: `File vượt quá ${Math.round(config.maxFileSize / (1024 * 1024))}MB`
      });
    }

    // Parse query params
    const rawFormat = req.query.format || 'webp';
    const quality = req.query.quality !== undefined ? Number(req.query.quality) : undefined;
    const width = req.query.width !== undefined ? Number(req.query.width) : undefined;

    // Build options
    const options = { format: rawFormat };
    if (quality !== undefined) options.quality = quality;
    if (width !== undefined) options.width = width;
    options.inputMime = req.file.mimetype;

    const originalSize = req.file.buffer.length;

    // Compress với timeout 30 giây
    const timeoutMs = 30000;
    const result = await Promise.race([
      compress(req.file.buffer, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Xử lý quá lâu. Vui lòng thử ảnh nhỏ hơn.')), timeoutMs)
      )
    ]);

    const metadata = getMetadata(originalSize, result.buffer.length);

    return res.json({
      name: req.file.originalname,
      mime: result.mime,
      originalSize: metadata.originalSize,
      compressedSize: metadata.compressedSize,
      savedBytes: metadata.savedBytes,
      ratio: metadata.ratio,
      data: result.buffer.toString('base64'),
      error: false
    });
  } catch (err) {
    // Trả HTTP 500 thay vì 200 khi lỗi — đúng REST convention
    return res.status(500).json({
      name: req.file ? req.file.originalname : 'unknown',
      originalSize: req.file ? req.file.buffer.length : 0,
      error: true,
      message: err.message || 'Lỗi khi nén ảnh'
    });
  }
});

module.exports = router;
