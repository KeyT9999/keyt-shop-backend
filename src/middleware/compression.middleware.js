'use strict';

const winston = require('winston');
const { compress, CompressionError, MIME_TO_FORMAT } = require('../services/compression.service');
const { getConfig, SUPPORTED_FORMATS } = require('../config/compression.config');

// Logger for compression middleware
const logger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] compression-middleware: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

/**
 * Validate file size against configured maximum.
 * @param {number} size - File size in bytes
 * @param {number} maxFileSize - Maximum allowed size in bytes
 * @returns {boolean}
 */
function isFileTooLarge(size, maxFileSize) {
  return size > maxFileSize;
}

/**
 * Check if a MIME type is a supported image format.
 * @param {string} mimetype
 * @returns {boolean}
 */
function isSupportedFormat(mimetype) {
  return mimetype in MIME_TO_FORMAT;
}

/**
 * Compress a single file object (req.file or element of req.files).
 * On success, replaces buffer with compressed version.
 * On failure, logs warning and keeps original buffer.
 * @param {Object} file - Multer file object with buffer, mimetype, originalname
 * @param {Object} options - Compression options (format, quality, width, height)
 * @returns {Promise<void>}
 */
async function compressFile(file, options) {
  const originalSize = file.buffer.length;
  try {
    const result = await compress(file.buffer, {
      ...options,
      inputMime: file.mimetype
    });
    // Replace buffer with compressed version
    file.buffer = result.buffer;
    file.mimetype = result.mime;
    file.size = result.buffer.length;
    // Attach compression metadata for downstream use
    file.compressionInfo = {
      originalSize,
      compressedSize: result.buffer.length,
      savedBytes: originalSize - result.buffer.length,
      mime: result.mime
    };
  } catch (err) {
    // Log warning and keep original buffer (graceful degradation)
    logger.warn(
      `Compression failed for "${file.originalname}": ${err.message}. Using original buffer.`
    );
  }
}

/**
 * Creates compression middleware with route-specific options.
 * Sits between multer and the route handler.
 *
 * Behavior:
 * - If compression succeeds → replace req.file.buffer with compressed buffer
 * - If compression fails → log warning, keep original buffer, call next()
 * - If file > maxFileSize → return 413
 * - If file format unsupported → return 400
 *
 * @param {Object} [routeOptions] - Per-route compression settings
 * @param {string} [routeOptions.format] - Output format
 * @param {number} [routeOptions.quality] - Quality 1-100
 * @param {number} [routeOptions.width] - Max width
 * @param {number} [routeOptions.height] - Max height
 * @returns {Function} Express middleware (req, res, next)
 */
function createCompressionMiddleware(routeOptions) {
  return async (req, res, next) => {
    const config = getConfig(routeOptions);
    const { maxFileSize } = config;

    // Build compression options from route overrides
    const compressionOptions = {
      format: (routeOptions && routeOptions.format) || undefined,
      quality: (routeOptions && routeOptions.quality) || undefined,
      width: (routeOptions && routeOptions.width) || undefined,
      height: (routeOptions && routeOptions.height) || undefined
    };

    // Handle single file upload (req.file)
    if (req.file) {
      // Validate file size
      if (isFileTooLarge(req.file.buffer.length, maxFileSize)) {
        return res.status(413).json({
          error: true,
          message: `File size exceeds ${Math.round(maxFileSize / (1024 * 1024))}MB limit`
        });
      }

      // Validate format
      if (!isSupportedFormat(req.file.mimetype)) {
        return res.status(400).json({
          error: true,
          message: `Unsupported format: ${req.file.mimetype}`
        });
      }

      await compressFile(req.file, compressionOptions);
      return next();
    }

    // Handle multi-file upload (req.files)
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Validate file size
        if (isFileTooLarge(file.buffer.length, maxFileSize)) {
          return res.status(413).json({
            error: true,
            message: `File "${file.originalname}" size exceeds ${Math.round(maxFileSize / (1024 * 1024))}MB limit`
          });
        }

        // Validate format
        if (!isSupportedFormat(file.mimetype)) {
          return res.status(400).json({
            error: true,
            message: `Unsupported format: ${file.mimetype}`
          });
        }
      }

      // All files valid, compress them
      await Promise.all(
        req.files.map(file => compressFile(file, compressionOptions))
      );
      return next();
    }

    // No file(s) attached — just pass through
    next();
  };
}

module.exports = {
  createCompressionMiddleware
};
