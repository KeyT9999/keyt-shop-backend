const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const Category = require('../models/category.model');

const router = express.Router();

/**
 * GET /api/categories
 * Get all categories (public)
 */
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error('❌ Error fetching categories:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/categories
 * Create new category (admin only)
 */
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  [
    body('name').trim().notEmpty().withMessage('Tên danh mục là bắt buộc')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const categoryData = {
        name: req.body.name.trim(),
        description: req.body.description?.trim() || null
      };

      // Check if category already exists
      const existing = await Category.findOne({ name: categoryData.name });
      if (existing) {
        return res.status(409).json({ message: 'Danh mục đã tồn tại' });
      }

      const category = new Category(categoryData);
      await category.save();

      res.status(201).json({
        message: 'Tạo danh mục thành công',
        category
      });
    } catch (err) {
      console.error('❌ Error creating category:', err);
      if (err.code === 11000) {
        return res.status(409).json({ message: 'Danh mục đã tồn tại' });
      }
      res.status(500).json({ message: 'Không thể tạo danh mục' });
    }
  }
);

/**
 * DELETE /api/categories/:id
 * Delete category (admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Xóa danh mục thành công'
    });
  } catch (err) {
    console.error('❌ Error deleting category:', err);
    res.status(500).json({ message: 'Không thể xóa danh mục' });
  }
});

module.exports = router;

