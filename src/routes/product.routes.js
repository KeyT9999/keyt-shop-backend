const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const Product = require('../models/product.model');

const router = express.Router();

/**
 * GET /api/products
 * Get all products (public)
 */
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error('❌ Error fetching products:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/products/:id
 * Get product by ID (public)
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error('❌ Error fetching product:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/products
 * Create new product (admin only)
 */
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  [
    body('name').trim().notEmpty().withMessage('Tên sản phẩm là bắt buộc'),
    body('price').isNumeric().withMessage('Giá phải là số'),
    body('currency').trim().notEmpty().withMessage('Đơn vị tiền tệ là bắt buộc'),
    body('billingCycle').trim().notEmpty().withMessage('Chu kỳ thanh toán là bắt buộc'),
    body('category').trim().notEmpty().withMessage('Danh mục là bắt buộc'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Số lượng tồn kho phải là số nguyên dương'),
    body('isHot').optional().isBoolean().withMessage('isHot phải là boolean'),
    body('promotion').optional().trim(),
    body('description').optional().trim(),
    body('imageUrl').optional().trim(),
    body('features').optional().isArray().withMessage('Features phải là mảng'),
    body('options').optional().isArray().withMessage('Options phải là mảng'),
    body('options.*.name').optional().trim().notEmpty().withMessage('Tên option không được để trống'),
    body('options.*.price').optional().isNumeric().withMessage('Giá option phải là số')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const productData = {
        name: req.body.name,
        price: req.body.price,
        currency: req.body.currency,
        billingCycle: req.body.billingCycle,
        category: req.body.category,
        stock: req.body.stock || 0,
        isHot: req.body.isHot || false,
        promotion: req.body.promotion || null,
        description: req.body.description || null,
        imageUrl: req.body.imageUrl || (req.body.images && req.body.images.length > 0 ? req.body.images[0] : null),
        images: req.body.images || [],
        features: req.body.features || [],
        options: (req.body.options || []).map(opt => ({
          name: opt.name?.trim() || '',
          price: Number(opt.price) || 0
        })).filter(opt => opt.name && opt.price > 0)
      };

      const product = new Product(productData);
      await product.save();

      res.status(201).json({
        message: 'Tạo sản phẩm thành công',
        product
      });
    } catch (err) {
      console.error('❌ Error creating product:', err);
      res.status(500).json({ message: 'Không thể tạo sản phẩm' });
    }
  }
);

/**
 * PUT /api/products/:id
 * Update product (admin only)
 */
router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  [
    body('name').optional().trim().notEmpty().withMessage('Tên sản phẩm không được để trống'),
    body('price').optional().isNumeric().withMessage('Giá phải là số'),
    body('currency').optional().trim().notEmpty().withMessage('Đơn vị tiền tệ không được để trống'),
    body('billingCycle').optional().trim().notEmpty().withMessage('Chu kỳ thanh toán không được để trống'),
    body('category').optional().trim().notEmpty().withMessage('Danh mục không được để trống'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Số lượng tồn kho phải là số nguyên dương'),
    body('isHot').optional().isBoolean().withMessage('isHot phải là boolean'),
    body('promotion').optional().trim(),
    body('description').optional().trim(),
    body('imageUrl').optional().trim(),
    body('features').optional().isArray().withMessage('Features phải là mảng'),
    body('options').optional().isArray().withMessage('Options phải là mảng')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Update only provided fields
      if (req.body.name !== undefined) product.name = req.body.name;
      if (req.body.price !== undefined) product.price = req.body.price;
      if (req.body.currency !== undefined) product.currency = req.body.currency;
      if (req.body.billingCycle !== undefined) product.billingCycle = req.body.billingCycle;
      if (req.body.category !== undefined) product.category = req.body.category;
      if (req.body.stock !== undefined) product.stock = req.body.stock;
      if (req.body.isHot !== undefined) product.isHot = req.body.isHot;
      if (req.body.promotion !== undefined) product.promotion = req.body.promotion || null;
      if (req.body.description !== undefined) product.description = req.body.description || null;
      if (req.body.images !== undefined) {
        product.images = req.body.images || [];
        // Cập nhật imageUrl từ ảnh đầu tiên để backward compatible
        product.imageUrl = product.images.length > 0 ? product.images[0] : null;
      }
      if (req.body.imageUrl !== undefined) product.imageUrl = req.body.imageUrl || null;
      if (req.body.features !== undefined) product.features = req.body.features || [];
      if (req.body.options !== undefined) {
        product.options = (req.body.options || []).map(opt => ({
          name: opt.name?.trim() || '',
          price: Number(opt.price) || 0
        })).filter(opt => opt.name && opt.price > 0);
      }

      await product.save();

      res.json({
        message: 'Cập nhật sản phẩm thành công',
        product
      });
    } catch (err) {
      console.error('❌ Error updating product:', err);
      res.status(500).json({ message: 'Không thể cập nhật sản phẩm' });
    }
  }
);

/**
 * DELETE /api/products/:id
 * Delete product (admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Xóa sản phẩm thành công'
    });
  } catch (err) {
    console.error('❌ Error deleting product:', err);
    res.status(500).json({ message: 'Không thể xóa sản phẩm' });
  }
});

module.exports = router;

