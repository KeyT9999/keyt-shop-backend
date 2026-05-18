const express = require('express');
const upload = require('../middleware/upload.middleware');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { createCompressionMiddleware } = require('../middleware/compression.middleware');
const storageAdapter = require('../services/storage.adapter');

const router = express.Router();

// Route-specific compression options
const productCompression = createCompressionMiddleware({ width: 1000, height: 1000, quality: 80, format: 'webp' });
const avatarCompression = createCompressionMiddleware({ width: 400, quality: 80, format: 'webp' });
const bannerCompression = createCompressionMiddleware({ width: 1920, quality: 85, format: 'webp' });

/**
 * POST /api/upload/product
 * Upload single product image (admin only)
 */
router.post(
  '/product',
  authenticateToken,
  requireAdmin,
  upload.single('image'),
  productCompression,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Không có file được upload' });
      }

      const result = await storageAdapter.upload(req.file.buffer, 'products');

      res.json({
        message: 'Upload ảnh thành công',
        imageUrl: result.url,
        publicId: result.resourceId
      });
    } catch (err) {
      console.error('❌ Error uploading product image:', err);
      res.status(500).json({ message: 'Không thể upload ảnh: ' + err.message });
    }
  }
);

/**
 * POST /api/upload/products
 * Upload multiple product images (admin only)
 * Handles partial failures: returns successes and failures separately
 */
router.post(
  '/products',
  authenticateToken,
  requireAdmin,
  upload.array('images', 10),
  productCompression,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Không có file được upload' });
      }

      const uploadPromises = req.files.map((file, index) =>
        storageAdapter.upload(file.buffer, 'products')
          .then(result => ({ status: 'fulfilled', value: result, index }))
          .catch(error => ({ status: 'rejected', reason: error, index }))
      );

      const settled = await Promise.all(uploadPromises);

      const images = [];
      const failures = [];

      settled.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          images.push({
            imageUrl: result.value.url,
            publicId: result.value.resourceId
          });
        } else {
          const fileName = req.files[i].originalname || `file_${i}`;
          failures.push({
            name: fileName,
            error: result.reason?.message || 'Unknown error'
          });
        }
      });

      // All failed
      if (images.length === 0) {
        return res.status(500).json({
          message: 'Không thể upload ảnh',
          failures
        });
      }

      // All succeeded - backward compatible response
      if (failures.length === 0) {
        return res.json({
          message: `Upload ${images.length} ảnh thành công`,
          images
        });
      }

      // Partial success
      res.json({
        message: `Upload ${images.length}/${images.length + failures.length} ảnh thành công`,
        images,
        failures
      });
    } catch (err) {
      console.error('❌ Error uploading product images:', err);
      res.status(500).json({ message: 'Không thể upload ảnh: ' + err.message });
    }
  }
);

/**
 * POST /api/upload/avatar
 * Upload user avatar (authenticated users)
 */
router.post(
  '/avatar',
  authenticateToken,
  upload.single('image'),
  avatarCompression,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Không có file được upload' });
      }

      const result = await storageAdapter.upload(req.file.buffer, 'avatars');

      res.json({
        message: 'Upload avatar thành công',
        imageUrl: result.url,
        publicId: result.resourceId
      });
    } catch (err) {
      console.error('❌ Error uploading avatar:', err);
      res.status(500).json({ message: 'Không thể upload avatar: ' + err.message });
    }
  }
);

/**
 * POST /api/upload/banner
 * Upload banner image (admin only)
 */
router.post(
  '/banner',
  authenticateToken,
  requireAdmin,
  upload.single('image'),
  bannerCompression,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Không có file được upload' });
      }

      const result = await storageAdapter.upload(req.file.buffer, 'banners');

      res.json({
        message: 'Upload banner thành công',
        imageUrl: result.url,
        publicId: result.resourceId
      });
    } catch (err) {
      console.error('❌ Error uploading banner:', err);
      res.status(500).json({ message: 'Không thể upload ảnh: ' + err.message });
    }
  }
);

module.exports = router;
