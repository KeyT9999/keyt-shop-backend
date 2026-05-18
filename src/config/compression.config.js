'use strict';

const winston = require('winston');

// Logger for compression config warnings
const logger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

/** Supported image formats */
const SUPPORTED_FORMATS = ['webp', 'avif', 'jpeg', 'png', 'gif'];

/** Hardcoded default values */
const DEFAULTS = {
  quality: 80,
  width: 1600,
  maxFileSize: 50 * 1024 * 1024 // 50MB in bytes
};

/**
 * Parse and validate quality from env var
 * @param {string|undefined} value
 * @returns {number|null} Valid quality or null if invalid
 */
function parseQuality(value) {
  if (value === undefined || value === '') return null;
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1 || num > 100) {
    logger.warn(`Invalid COMPRESS_DEFAULT_QUALITY="${value}" (must be 1-100). Using default: ${DEFAULTS.quality}`);
    return null;
  }
  return num;
}

/**
 * Parse and validate width from env var
 * @param {string|undefined} value
 * @returns {number|null} Valid width or null if invalid
 */
function parseWidth(value) {
  if (value === undefined || value === '') return null;
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 100 || num > 10000) {
    logger.warn(`Invalid COMPRESS_DEFAULT_WIDTH="${value}" (must be 100-10000). Using default: ${DEFAULTS.width}`);
    return null;
  }
  return num;
}

/**
 * Parse and validate max file size from env var (in MB)
 * @param {string|undefined} value
 * @returns {number|null} Valid maxFileSize in bytes or null if invalid
 */
function parseMaxFileSize(value) {
  if (value === undefined || value === '') return null;
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1 || num > 200) {
    logger.warn(`Invalid COMPRESS_MAX_FILE_SIZE_MB="${value}" (must be 1-200). Using default: ${DEFAULTS.maxFileSize / (1024 * 1024)}MB`);
    return null;
  }
  return num * 1024 * 1024;
}

/**
 * Parse supported formats from env var (CSV)
 * @param {string|undefined} value
 * @returns {string[]|null} Valid formats array or null
 */
function parseFormats(value) {
  if (value === undefined || value === '') return null;
  const formats = value.split(',').map(f => f.trim().toLowerCase()).filter(Boolean);
  if (formats.length === 0) return null;
  return formats;
}

/**
 * Get effective compression config.
 * Reads env vars on every call to support hot-reload without restart.
 * Precedence: routeOverrides > env vars > hardcoded defaults
 *
 * @param {Object} [routeOverrides] - Per-route override values
 * @param {number} [routeOverrides.quality] - Quality override
 * @param {number} [routeOverrides.width] - Width override
 * @param {number} [routeOverrides.maxFileSize] - Max file size override (bytes)
 * @param {string[]} [routeOverrides.formats] - Formats override
 * @returns {{quality: number, width: number, maxFileSize: number, formats: string[]}}
 */
function getConfig(routeOverrides) {
  // Read env vars (hot-reload: reads on every call)
  const envQuality = parseQuality(process.env.COMPRESS_DEFAULT_QUALITY);
  const envWidth = parseWidth(process.env.COMPRESS_DEFAULT_WIDTH);
  const envMaxFileSize = parseMaxFileSize(process.env.COMPRESS_MAX_FILE_SIZE_MB);
  const envFormats = parseFormats(process.env.COMPRESS_SUPPORTED_FORMATS);

  const overrides = routeOverrides || {};

  return {
    quality: overrides.quality !== undefined ? overrides.quality : (envQuality !== null ? envQuality : DEFAULTS.quality),
    width: overrides.width !== undefined ? overrides.width : (envWidth !== null ? envWidth : DEFAULTS.width),
    maxFileSize: overrides.maxFileSize !== undefined ? overrides.maxFileSize : (envMaxFileSize !== null ? envMaxFileSize : DEFAULTS.maxFileSize),
    formats: overrides.formats !== undefined ? overrides.formats : (envFormats !== null ? envFormats : SUPPORTED_FORMATS)
  };
}

module.exports = {
  getConfig,
  SUPPORTED_FORMATS,
  DEFAULTS
};
