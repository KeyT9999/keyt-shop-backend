const express = require('express');
const Order = require('../models/order.model');
const payosService = require('../services/payos.service');
const emailService = require('../services/email.service');
const Product = require('../models/product.model');
const { generateUniqueOrderCode } = require('../utils/orderCode.util');
const { orderLimiter } = require('../middleware/rateLimiter.middleware');

const router = express.Router();

/**
 * GET /api/orders/my
 * Lấy danh sách đơn hàng của user hiện tại
 */
router.get('/my', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
    }

    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .select('_id orderCode totalAmount orderStatus paymentStatus createdAt');

    return res.json({ orders });
  } catch (err) {
    console.error('❌ Lỗi khi lấy danh sách đơn hàng:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
});

router.post('/', orderLimiter, async (req, res) => {
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
    // Check stock availability (but don't deduct yet - stock will be deducted when order is completed)
    // OPTIMIZED: Query all products in parallel instead of sequentially
    const productIds = items.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return res.status(400).json({ message: `Sản phẩm không tồn tại: ${item.productId}` });
      }
      if (product.status === 'discontinued') {
        return res.status(400).json({ message: `Sản phẩm đã ngừng kinh doanh: ${product.name}` });
      }
      // For preloaded accounts, check available (unused) accounts
      if (product.isPreloadedAccount && product.preloadedAccounts) {
        const availableAccountsCount = product.preloadedAccounts.filter((acc) => !acc.used).length;
        if (availableAccountsCount < item.quantity) {
          return res.status(400).json({ message: `Sản phẩm ${product.name} không đủ tài khoản có sẵn (còn lại: ${availableAccountsCount}).` });
        }
      } else {
        // For regular products, check stock
        if (product.status === 'out_of_stock' || (product.stock || 0) < item.quantity) {
          return res.status(400).json({ message: `Sản phẩm ${product.name} không đủ tồn kho.` });
        }
      }
    }

    // Sinh mã đơn hàng 6 chữ số duy nhất
    const orderCode = await generateUniqueOrderCode();
    console.log(`✅ Mã đơn hàng được tạo: ${orderCode}`);

    const orderData = {
      orderCode,
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

    // Send email to user immediately when order is created (non-blocking - fire and forget)
    // Note: Email "Đơn Hàng Mới" for admin (combined with payment success and special note if any) will be sent when payment is successful
    emailService.sendOrderCreatedEmailToUser(order).catch((emailErr) => {
      console.error('⚠️ Failed to send order created email to user:', emailErr.message);
    });

    // Automatically create PayOS payment link
    try {
      // Check if PayOS credentials are configured
      if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
        console.warn('⚠️ PayOS credentials not configured. Order created without payment link.');
        console.warn('⚠️ Please set PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY in .env file');
        return res.status(201).json(order);
      }

      const payosOrderCode = parseInt(Date.now().toString().slice(-9) + Math.floor(Math.random() * 1000));
      
      // Get frontend URL with warning if not set
      const frontendUrl = process.env.FRONTEND_URL;
      if (!frontendUrl) {
        console.warn('⚠️ WARNING: FRONTEND_URL is not set in environment variables!');
        console.warn('⚠️ Using localhost fallback - THIS SHOULD NOT HAPPEN IN PRODUCTION!');
      }
      
      const returnUrl = process.env.PAYOS_RETURN_URL || `${frontendUrl || 'http://localhost:5173'}/payment-success`;
      const cancelUrl = process.env.PAYOS_CANCEL_URL || `${frontendUrl || 'http://localhost:5173'}/orders`;

      const paymentData = {
        orderCode: payosOrderCode,
        amount: order.totalAmount,
        description: `Don hang #${order.orderCode}`,
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
 * GET /api/orders/vault
 * Lấy danh sách tài khoản Két sắt số (delivered accounts)
 */
router.get('/vault', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập để xem két sắt số.' });
    }

    const orders = await Order.find({
      userId,
      orderStatus: 'completed'
    }).populate('items.productId', 'name image isPreloadedAccount').sort({ completedAt: -1, createdAt: -1 });

    const vaultItems = [];
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item, index) => {
          if (item.deliveredAccount) {
            vaultItems.push({
              id: `${order._id}_${index}`,
              orderId: order._id,
              orderCode: order.orderCode,
              purchaseDate: order.completedAt || order.createdAt,
              productName: item.name || item.productId?.name,
              productImage: item.productId?.image,
              accountDetails: item.deliveredAccount
            });
          }
        });
      }
    });

    res.json(vaultItems);
  } catch (err) {
    console.error('❌ Lỗi khi lấy Két sắt số:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
});

/**
 * GET /api/orders/:id
 * Get order details by ID
 * SECURITY: Admin notes are only visible to admins
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;
    const isAdmin = req.user?.admin === true;

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

    const orderObj = order.toObject();
    // Only admins can see adminNotes
    if (!isAdmin && orderObj.adminNotes) {
      delete orderObj.adminNotes;
    }

    res.json(orderObj);
  } catch (err) {
    console.error('❌ Lỗi khi lấy chi tiết đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
  }
});

module.exports = router;

