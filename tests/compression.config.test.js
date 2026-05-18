'use strict';

const fc = require('fast-check');

// Save original env and restore after each test
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  delete process.env.COMPRESS_DEFAULT_QUALITY;
  delete process.env.COMPRESS_DEFAULT_WIDTH;
  delete process.env.COMPRESS_MAX_FILE_SIZE_MB;
  delete process.env.COMPRESS_SUPPORTED_FORMATS;
});

afterAll(() => {
  process.env = originalEnv;
});

function loadConfig() {
  return require('../src/config/compression.config');
}

describe('compression.config', () => {
  describe('SUPPORTED_FORMATS', () => {
    it('should export correct supported formats', () => {
      const { SUPPORTED_FORMATS } = loadConfig();
      expect(SUPPORTED_FORMATS).toEqual(['webp', 'avif', 'jpeg', 'png', 'gif']);
    });
  });

  describe('DEFAULTS', () => {
    it('should export correct default values', () => {
      const { DEFAULTS } = loadConfig();
      expect(DEFAULTS).toEqual({
        quality: 80,
        width: 1600,
        maxFileSize: 50 * 1024 * 1024
      });
    });
  });

  describe('getConfig() - no env vars, no overrides', () => {
    it('should return hardcoded defaults', () => {
      const { getConfig, DEFAULTS, SUPPORTED_FORMATS } = loadConfig();
      const config = getConfig();
      expect(config.quality).toBe(DEFAULTS.quality);
      expect(config.width).toBe(DEFAULTS.width);
      expect(config.maxFileSize).toBe(DEFAULTS.maxFileSize);
      expect(config.formats).toEqual(SUPPORTED_FORMATS);
    });
  });

  describe('getConfig() - env vars', () => {
    it('should read valid env vars', () => {
      process.env.COMPRESS_DEFAULT_QUALITY = '90';
      process.env.COMPRESS_DEFAULT_WIDTH = '2000';
      process.env.COMPRESS_MAX_FILE_SIZE_MB = '100';
      process.env.COMPRESS_SUPPORTED_FORMATS = 'webp,jpeg';
      const { getConfig } = loadConfig();
      const config = getConfig();
      expect(config.quality).toBe(90);
      expect(config.width).toBe(2000);
      expect(config.maxFileSize).toBe(100 * 1024 * 1024);
      expect(config.formats).toEqual(['webp', 'jpeg']);
    });

    it('should fallback on invalid quality (0)', () => {
      process.env.COMPRESS_DEFAULT_QUALITY = '0';
      const { getConfig } = loadConfig();
      expect(getConfig().quality).toBe(80);
    });

    it('should fallback on invalid quality (101)', () => {
      process.env.COMPRESS_DEFAULT_QUALITY = '101';
      const { getConfig } = loadConfig();
      expect(getConfig().quality).toBe(80);
    });

    it('should fallback on invalid quality (non-numeric)', () => {
      process.env.COMPRESS_DEFAULT_QUALITY = 'abc';
      const { getConfig } = loadConfig();
      expect(getConfig().quality).toBe(80);
    });

    it('should fallback on invalid width (50)', () => {
      process.env.COMPRESS_DEFAULT_WIDTH = '50';
      const { getConfig } = loadConfig();
      expect(getConfig().width).toBe(1600);
    });

    it('should fallback on invalid width (20000)', () => {
      process.env.COMPRESS_DEFAULT_WIDTH = '20000';
      const { getConfig } = loadConfig();
      expect(getConfig().width).toBe(1600);
    });

    it('should fallback on invalid maxFileSize (0)', () => {
      process.env.COMPRESS_MAX_FILE_SIZE_MB = '0';
      const { getConfig } = loadConfig();
      expect(getConfig().maxFileSize).toBe(50 * 1024 * 1024);
    });

    it('should fallback on invalid maxFileSize (201)', () => {
      process.env.COMPRESS_MAX_FILE_SIZE_MB = '201';
      const { getConfig } = loadConfig();
      expect(getConfig().maxFileSize).toBe(50 * 1024 * 1024);
    });
  });

  describe('getConfig() - route overrides precedence', () => {
    it('route override takes precedence over env var', () => {
      process.env.COMPRESS_DEFAULT_QUALITY = '90';
      process.env.COMPRESS_DEFAULT_WIDTH = '2000';
      const { getConfig } = loadConfig();
      const config = getConfig({ quality: 70, width: 1000 });
      expect(config.quality).toBe(70);
      expect(config.width).toBe(1000);
    });

    it('route override takes precedence over hardcoded default', () => {
      const { getConfig } = loadConfig();
      const config = getConfig({ quality: 50, maxFileSize: 10 * 1024 * 1024 });
      expect(config.quality).toBe(50);
      expect(config.maxFileSize).toBe(10 * 1024 * 1024);
    });

    it('env var takes precedence over hardcoded default', () => {
      process.env.COMPRESS_DEFAULT_QUALITY = '60';
      const { getConfig } = loadConfig();
      const config = getConfig();
      expect(config.quality).toBe(60);
    });
  });

  describe('getConfig() - hot-reload', () => {
    it('should read env vars on every call (no caching)', () => {
      const { getConfig } = loadConfig();
      process.env.COMPRESS_DEFAULT_QUALITY = '50';
      expect(getConfig().quality).toBe(50);
      process.env.COMPRESS_DEFAULT_QUALITY = '90';
      expect(getConfig().quality).toBe(90);
    });
  });

  describe('Property: Configuration precedence (Property 11)', () => {
    /**
     * Validates: Requirements 6.3, 6.4
     */
    it('route override > env > hardcoded default for quality', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (envQuality, routeQuality) => {
            process.env.COMPRESS_DEFAULT_QUALITY = String(envQuality);
            const { getConfig } = loadConfig();
            const withOverride = getConfig({ quality: routeQuality });
            expect(withOverride.quality).toBe(routeQuality);
            const withoutOverride = getConfig();
            expect(withoutOverride.quality).toBe(envQuality);
            jest.resetModules();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('invalid env values fall back to hardcoded defaults', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: -1000, max: 0 }),
            fc.integer({ min: 101, max: 1000 })
          ),
          (invalidQuality) => {
            process.env.COMPRESS_DEFAULT_QUALITY = String(invalidQuality);
            const { getConfig, DEFAULTS } = loadConfig();
            expect(getConfig().quality).toBe(DEFAULTS.quality);
            jest.resetModules();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
