'use strict';

const sharp = require('sharp');
const { getConfig, SUPPORTED_FORMATS } = require('../config/compression.config');

// Tắt cache Sharp để giảm memory usage trên Render (512MB RAM)
sharp.cache(false);
// Giới hạn concurrency để tránh OOM khi nhiều request đồng thời
sharp.concurrency(1);

// ─── Custom Error ─────────────────────────────────────────────────────────────

class CompressionError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code) {
    super(message);
    this.name = 'CompressionError';
    this.code = code || 'COMPRESSION_ERROR';
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIME_TO_FORMAT = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif'
};

const FORMAT_TO_MIME = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif'
};

// Smart quality caps (from imgpress)
const MAX_QUALITY_NO_ALPHA = 85;
const MAX_QUALITY_WITH_ALPHA = 90;
const DITHER_MAX = 0.7;
const DITHER_MIN = 0.3;

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Analyze image metadata for smart compression decisions
 * @param {Buffer} buffer
 * @returns {Promise<{width: number, height: number, channels: number, hasAlpha: boolean, isAnimated: boolean, space: string}>}
 */
async function analyzeImage(buffer) {
  const meta = await sharp(buffer, { failOn: 'none' }).metadata();

  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  return {
    width: w,
    height: h,
    channels: meta.channels ?? 3,
    hasAlpha: meta.hasAlpha ?? false,
    isAnimated: (meta.pages ?? 1) > 1,
    space: meta.space ?? 'srgb'
  };
}

/**
 * Calculate smart quality based on image characteristics
 * @param {number} requestedQuality
 * @param {{channels: number, hasAlpha: boolean}} info
 * @returns {number}
 */
function smartQuality(requestedQuality, info) {
  const base = Math.min(Math.max(requestedQuality, 1), 100);
  if (info.channels >= 3 && !info.hasAlpha) return Math.min(base, MAX_QUALITY_NO_ALPHA);
  return Math.min(base, MAX_QUALITY_WITH_ALPHA);
}

/**
 * Calculate smart dither value based on quality
 * @param {number} q
 * @returns {number}
 */
function smartDither(q) {
  const raw = DITHER_MAX - (q / 100) * (DITHER_MAX - DITHER_MIN);
  return parseFloat(Math.max(DITHER_MIN, Math.min(DITHER_MAX, raw)).toFixed(2));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validate and normalize compression options
 * @param {Object} rawOptions
 * @returns {{format: string, quality: number, width: number, height: number|undefined}}
 */
function normalizeOptions(rawOptions = {}) {
  const config = getConfig();
  const opts = rawOptions || {};

  // Format: must be supported or 'auto'
  let format = String(opts.format || 'webp').toLowerCase();
  if (format !== 'auto' && !SUPPORTED_FORMATS.includes(format)) {
    format = 'webp';
  }

  // Quality: clamp to 1-100
  let quality = Number(opts.quality);
  if (isNaN(quality) || !Number.isFinite(quality)) {
    quality = config.quality;
  } else {
    quality = Math.min(100, Math.max(1, Math.round(quality)));
  }

  // Width: must be positive integer, otherwise use default
  let width = Number(opts.width);
  if (!Number.isInteger(width) || width <= 0) {
    width = config.width;
  }

  // Height: optional, must be positive integer if provided
  let height;
  if (opts.height !== undefined && opts.height !== null) {
    height = Number(opts.height);
    if (!Number.isInteger(height) || height <= 0) {
      height = undefined;
    }
  }

  return { format, quality, width, height };
}

/**
 * Compress an image buffer with given options
 * @param {Buffer} buffer - Input image buffer
 * @param {Object} [options] - Compression options
 * @param {string} [options.format='webp'] - Output format: webp|avif|jpeg|png|gif|auto
 * @param {number} [options.quality=80] - Quality 1-100 (clamped)
 * @param {number} [options.width=1600] - Max width in pixels
 * @param {number} [options.height] - Max height in pixels (optional)
 * @param {string} [options.inputMime] - Input MIME type (used for 'auto' format detection)
 * @returns {Promise<{buffer: Buffer, mime: string, info: Object}>}
 * @throws {CompressionError}
 */
async function compress(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new CompressionError('Invalid input: buffer is required', 'INVALID_INPUT');
  }

  const normalized = normalizeOptions(options);
  let { format, quality, width, height } = normalized;

  // Handle 'auto' format detection from input MIME
  if (format === 'auto') {
    const inputMime = options.inputMime || '';
    const detected = MIME_TO_FORMAT[inputMime.toLowerCase()];
    if (detected) {
      format = detected;
    } else {
      // Try to detect from sharp metadata
      try {
        const meta = await sharp(buffer, { failOn: 'none' }).metadata();
        if (meta.format && SUPPORTED_FORMATS.includes(meta.format)) {
          format = meta.format;
        } else {
          format = 'webp'; // fallback
        }
      } catch {
        format = 'webp';
      }
    }
  }

  // Validate format is supported
  if (!SUPPORTED_FORMATS.includes(format)) {
    throw new CompressionError(
      `Unsupported format: ${format}. Supported: ${SUPPORTED_FORMATS.join(', ')}`,
      'UNSUPPORTED_FORMAT'
    );
  }

  // Analyze image
  let info;
  try {
    info = await analyzeImage(buffer);
  } catch (err) {
    throw new CompressionError(
      `Failed to analyze image: ${err.message}`,
      'ANALYSIS_FAILED'
    );
  }

  // Smart quality adjustment
  const q = smartQuality(quality, info);

  // Build Sharp pipeline
  let pipeline = sharp(buffer, { failOn: 'none', animated: info.isAnimated })
    .withMetadata();

  // Resize: no upscale, respect width and optional height
  const resizeOpts = { withoutEnlargement: true, kernel: sharp.kernel.lanczos3 };
  if (info.width > width || (height && info.height > height)) {
    resizeOpts.width = width;
    if (height) {
      resizeOpts.height = height;
      resizeOpts.fit = 'inside';
    }
    pipeline = pipeline.resize(resizeOpts);
  }

  // Colorspace normalization
  if (info.space !== 'srgb') {
    pipeline = pipeline.toColorspace('srgb');
  }

  // Apply format-specific encoding
  let mime;
  if (format === 'jpeg' || format === 'jpg') {
    pipeline = pipeline.jpeg({
      quality: q,
      mozjpeg: true,
      progressive: true,
      optimiseCoding: true,
      trellisQuantisation: true,
      overshootDeringing: true,
      optimiseScans: true
    });
    mime = 'image/jpeg';
  } else if (format === 'png') {
    pipeline = pipeline.png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: true,
      quality: q,
      effort: 10,
      dither: smartDither(q)
    });
    mime = 'image/png';
  } else if (format === 'avif') {
    pipeline = pipeline.avif({
      quality: Math.min(q, 70),
      effort: 6,
      chromaSubsampling: '4:2:0',
      lossless: false
    });
    mime = 'image/avif';
  } else if (format === 'gif') {
    pipeline = pipeline.gif({
      effort: 10,
      dither: smartDither(q),
      interFrameMaxError: 8
    });
    mime = 'image/gif';
  } else {
    // Default: webp
    pipeline = pipeline.webp({
      quality: q,
      alphaQuality: Math.min(q + 5, 100),
      smartSubsample: true,
      effort: 6,
      lossless: false,
      nearLossless: false,
      preset: 'photo'
    });
    mime = 'image/webp';
  }

  // Execute pipeline
  try {
    const output = await pipeline.toBuffer({ resolveWithObject: true });
    return { buffer: output.data, mime, info: output.info };
  } catch (err) {
    throw new CompressionError(
      `Compression failed: ${err.message}`,
      'PROCESSING_FAILED'
    );
  }
}

/**
 * Get metadata/stats for compression result
 * @param {number} originalSize - Original file size in bytes
 * @param {number} compressedSize - Compressed file size in bytes
 * @returns {{originalSize: number, compressedSize: number, savedBytes: number, ratio: number}}
 */
function getMetadata(originalSize, compressedSize) {
  const savedBytes = originalSize - compressedSize;
  const ratio = originalSize > 0
    ? Number(((1 - compressedSize / originalSize) * 100).toFixed(1))
    : 0;

  return {
    originalSize,
    compressedSize,
    savedBytes,
    ratio
  };
}

module.exports = {
  compress,
  normalizeOptions,
  getMetadata,
  CompressionError,
  MIME_TO_FORMAT,
  FORMAT_TO_MIME
};
