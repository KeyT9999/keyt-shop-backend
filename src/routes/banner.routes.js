const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const Banner = require('../models/banner.model');

const router = express.Router();

// GET /api/banners - Get all public active banners
router.get('/', async (req, res) => {
    try {
        const { position } = req.query;
        const query = { isActive: true };
        if (position) {
            query.position = position;
        }
        const banners = await Banner.find(query).sort({ order: 1, createdAt: -1 });
        res.json(banners);
    } catch (err) {
        console.error('Error fetching banners:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/banners/admin/all - Get all banners (admin)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const banners = await Banner.find({}).sort({ order: 1, createdAt: -1 });
        res.json(banners);
    } catch (err) {
        console.error('Error fetching admin banners:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/banners - Create banner (admin)
router.post(
    '/',
    authenticateToken,
    requireAdmin,
    [
        body('imageUrl').notEmpty().withMessage('Image URL is required'),
        body('position').optional().isIn(['hero', 'flash_sale', 'promo', 'footer'])
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const banner = new Banner(req.body);
            await banner.save();
            res.status(201).json(banner);
        } catch (err) {
            console.error('Error creating banner:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// PUT /api/banners/:id - Update banner (admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }
        res.json(banner);
    } catch (err) {
        console.error('Error updating banner:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/banners/:id - Delete banner (admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id);
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }
        res.json({ message: 'Banner deleted' });
    } catch (err) {
        console.error('Error deleting banner:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
