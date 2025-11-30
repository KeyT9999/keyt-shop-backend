const express = require('express');
const Order = require('../models/order.model');

const router = express.Router();

router.post('/', async (req, res) => {
  const { customer, items, totalAmount, note } = req.body;
  const userId = req.user?.id || null;

  if (!customer || !customer.name || !customer.email || !customer.phone) {
    return res.status(400).json({ message: 'Thông tin khách hàng không đầy đủ.' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Giỏ hàng trống, không thể tạo đơn.' });
  }

  if (typeof totalAmount !== 'number') {
    return res.status(400).json({ message: 'Tổng tiền không hợp lệ.' });
  }

  try {
    const orderData = { userId, customer, items, totalAmount };
    if (note && note.trim()) {
      orderData.note = note.trim();
    }
    const order = await Order.create(orderData);
    res.status(201).json(order);
  } catch (err) {
    console.error('❌ Lỗi tạo đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
});

/**
 * GET /api/orders/:id
 * Get order details by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    // User chỉ có thể xem đơn hàng của chính mình (nếu có userId)
    if (userId && order.userId && order.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Bạn không có quyền xem đơn hàng này.' });
    }

    res.json(order);
  } catch (err) {
    console.error('❌ Lỗi khi lấy chi tiết đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
});

module.exports = router;

