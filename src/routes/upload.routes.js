const express = require('express');
const upload = require('../middleware/upload.middleware');
const cloudinary = require('../config/cloudinary.config');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { Readable } = require('stream');

const router = express.Router();

/**
 * Helper function to upload buffer to Cloudinary
 */
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 1000, height: 1000, crop: 'limit' },
          { quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

/**
 * POST /api/upload/product
 * Upload single product image (admin only)
 */
router.post(
  '/product',
  authenticateToken,
  requireAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Không có file được upload' });
      }

      const result = await uploadToCloudinary(req.file.buffer, 'products');
      
      res.json({
        message: 'Upload ảnh thành công',
        imageUrl: result.secure_url,
        publicId: result.public_id
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
 */
router.post(
  '/products',
  authenticateToken,
  requireAdmin,
  upload.array('images', 10), // Tối đa 10 ảnh
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Không có file được upload' });
      }

      const uploadPromises = req.files.map(file => 
        uploadToCloudinary(file.buffer, 'products')
      );

      const results = await Promise.all(uploadPromises);
      
      res.json({
        message: `Upload ${results.length} ảnh thành công`,
        images: results.map(result => ({
          imageUrl: result.secure_url,
          publicId: result.public_id
        }))
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
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Không có file được upload' });
      }

      const result = await uploadToCloudinary(req.file.buffer, 'avatars');
      
      res.json({
        message: 'Upload avatar thành công',
        imageUrl: result.secure_url,
        publicId: result.public_id
      });
    } catch (err) {
      console.error('❌ Error uploading avatar:', err);
      res.status(500).json({ message: 'Không thể upload avatar: ' + err.message });
    }
  }
);

module.exports = router;

