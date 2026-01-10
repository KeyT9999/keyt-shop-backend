const express = require('express');
const Order = require('../models/order.model');
const payosService = require('../services/payos.service');
const emailService = require('../services/email.service');
const Product = require('../models/product.model');

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
    // Check stock and reserve
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({ message: `Sản phẩm không tồn tại: ${item.productId}` });
      }
      if (product.status === 'discontinued') {
        return res.status(400).json({ message: `Sản phẩm đã ngừng kinh doanh: ${product.name}` });
      }
      if (product.status === 'out_of_stock' || (product.stock || 0) < item.quantity) {
        return res.status(400).json({ message: `Sản phẩm ${product.name} không đủ tồn kho.` });
      }
    }

    // Deduct stock
    for (const item of items) {
      await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.quantity } },
        {
          $inc: { stock: -item.quantity },
          $set: {
            status: 'in_stock'
          }
        }
      );
    }

    const orderData = { 
      userId, 
      customer, 
      items, 
      totalAmount,
      orderStatus: 'pending',
      paymentStatus: 'pending'
    };
    if (note && note.trim()) {
      orderData.note = note.trim();
    }
    const order = await Order.create(orderData);

    // Send emails to admin and user immediately (non-blocking)
    try {
      await emailService.sendOrderCreatedEmailToAdmin(order);
      console.log('✅ Order created email sent to admin');
    } catch (emailErr) {
      console.error('⚠️ Failed to send order created email to admin:', emailErr.message);
    }

    try {
      await emailService.sendOrderCreatedEmailToUser(order);
      console.log('✅ Order created email sent to user');
    } catch (emailErr) {
      console.error('⚠️ Failed to send order created email to user:', emailErr.message);
    }

    // Send special note email if order has note or requiredFieldsData
    const hasSpecialNote = order.note && order.note.trim();
    const hasRequiredFields = order.items.some(item => item.requiredFieldsData && item.requiredFieldsData.length > 0);
    if (hasSpecialNote || hasRequiredFields) {
      try {
        await emailService.sendOrderSpecialNoteEmailToAdmin(order);
        console.log('✅ Special note email sent to admin');
      } catch (emailErr) {
        console.error('⚠️ Failed to send special note email to admin:', emailErr.message);
      }
    }

    // Automatically create PayOS payment link
    try {
      // Check if PayOS credentials are configured
      if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
        console.warn('⚠️ PayOS credentials not configured. Order created without payment link.');
        console.warn('⚠️ Please set PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY in .env file');
        return res.status(201).json(order);
      }

      const payosOrderCode = parseInt(Date.now().toString().slice(-9) + Math.floor(Math.random() * 1000));
      const returnUrl = process.env.PAYOS_RETURN_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${order._id}?payment=success`;
      const cancelUrl = process.env.PAYOS_CANCEL_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${order._id}?payment=cancelled`;

      const paymentData = {
        orderCode: payosOrderCode,
        amount: order.totalAmount,
        description: `Don hang ${order._id.toString().slice(-8)}`,
        cancelUrl,
        returnUrl,
        buyerInfo: {
          buyerName: order.customer.name,
          buyerEmail: order.customer.email,
          buyerPhone: order.customer.phone
        },
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      };

      console.log('🔄 Creating PayOS payment link for order:', order._id);
      const paymentResult = await payosService.createPaymentLink(paymentData);
      console.log('✅ PayOS payment link created successfully');

      // Update order with PayOS information
      order.payosOrderCode = payosOrderCode;
      order.paymentLinkId = paymentResult.data.paymentLinkId;
      order.checkoutUrl = paymentResult.data.checkoutUrl;
      order.qrCode = paymentResult.data.qrCode;
      await order.save();

      // Return order with payment info
      const orderResponse = order.toObject();
      orderResponse.checkoutUrl = paymentResult.data.checkoutUrl;
      orderResponse.qrCode = paymentResult.data.qrCode;

      res.status(201).json(orderResponse);
    } catch (payosError) {
      console.error('❌ Lỗi tạo payment link PayOS:', payosError.message);
      console.error('❌ Error details:', {
        message: payosError.message,
        stack: payosError.stack
      });
      // Still return order even if PayOS fails
      // Payment link can be created later via /api/payos/create-payment
      const orderResponse = order.toObject();
      orderResponse.payosError = payosError.message;

      res.status(201).json(orderResponse);
    }
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

    // Populate confirmedBy nếu có
    if (order.confirmedBy) {
      await order.populate('confirmedBy', 'username email');
    }

    res.json(order);
  } catch (err) {
    console.error('❌ Lỗi khi lấy chi tiết đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
});

module.exports = router;

