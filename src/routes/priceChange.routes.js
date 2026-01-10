const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const PriceChangeLog = require('../models/priceChangeLog.model');

const router = express.Router();

// GET /api/price-changes/:productId - admin only
router.get('/:productId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await PriceChangeLog.find({ productId: req.params.productId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(logs);
  } catch (err) {
    console.error('❌ Error fetching price change logs:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
