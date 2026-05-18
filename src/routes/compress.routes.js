'use strict';

const express = require('express');
const multer = require('multer');
const { compress, getMetadata, normalizeOptions, MIME_TO_FORMAT } = require('../services/compression.service');
const { getConfig } = require('../config/compression.config');

const router = express.Router();

// Multer instance for compress endpoint - memory storage, no file filter
// (compression service handles format validation)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024 // Set high; we check maxFileSize from config manually
  }
});

/**
 * POST /api/compress
 * Compress a single image file
 *
 * Query params:
 *   - format {string} Output format (default: 'webp'). Use 'auto' to keep input format.
 *   - quality {number} Quality 1-100
 *   - width {number} Max width in pixels
 *
 * Body: multipart/form-data with 'file' field
 *
 * Response: { name, mime, originalSize, compressedSize, savedBytes, ratio, data, error }
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    // Check if file provided
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'file required' });
    }

    // Check file size against config maxFileSize
    const config = getConfig();
    if (req.file.buffer.length > config.maxFileSize) {
      return res.status(413).json({
        error: true,
        message: `File size exceeds ${config.maxFileSize / (1024 * 1024)}MB limit`
      });
    }

    // Parse query params
    const rawFormat = req.query.format || 'webp';
    const quality = req.query.quality !== undefined ? Number(req.query.quality) : undefined;
    const width = req.query.width !== undefined ? Number(req.query.width) : undefined;

    // Handle 'auto' format: detect input MIME and use same format for output
    let format = rawFormat;
    if (rawFormat === 'auto') {
      format = 'auto';
    }

    // Build options
    const options = { format };
    if (quality !== undefined) options.quality = quality;
    if (width !== undefined) options.width = width;
    // Pass inputMime for 'auto' format detection
    options.inputMime = req.file.mimetype;

    const originalSize = req.file.buffer.length;

    // Compress
    const result = await compress(req.file.buffer, options);
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
    // If compression error, return it in the response
    return res.json({
      name: req.file ? req.file.originalname : 'unknown',
      originalSize: req.file ? req.file.buffer.length : 0,
      error: true,
      message: err.message
    });
  }
});

module.exports = router;
