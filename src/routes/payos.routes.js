const express = require('express');
const Order = require('../models/order.model');
const payosService = require('../services/payos.service');
const emailService = require('../services/email.service');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * POST /api/payos/create-payment
 * Create payment link for an order
 */
router.post('/create-payment', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order
    if (order.userId && order.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to access this order' });
    }

    // If payment link already exists, return it
    if (order.checkoutUrl && order.paymentLinkId) {
      return res.json({
        success: true,
        checkoutUrl: order.checkoutUrl,
        qrCode: order.qrCode,
        paymentLinkId: order.paymentLinkId
      });
    }

    // Generate unique order code for PayOS (use timestamp + random)
    const payosOrderCode = order.payosOrderCode || parseInt(Date.now().toString().slice(-9) + Math.floor(Math.random() * 1000));

    // Prepare order data for PayOS
    const returnUrl = process.env.PAYOS_RETURN_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${orderId}?payment=success`;
    const cancelUrl = process.env.PAYOS_CANCEL_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${orderId}?payment=cancelled`;

    const orderData = {
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

    // Create payment link
    const result = await payosService.createPaymentLink(orderData);

    // Update order with PayOS information
    order.payosOrderCode = payosOrderCode;
    order.paymentLinkId = result.data.paymentLinkId;
    order.checkoutUrl = result.data.checkoutUrl;
    order.qrCode = result.data.qrCode;
    await order.save();

    res.json({
      success: true,
      checkoutUrl: result.data.checkoutUrl,
      qrCode: result.data.qrCode,
      paymentLinkId: result.data.paymentLinkId
    });
  } catch (error) {
    console.error('❌ Error creating payment link:', error);
    res.status(500).json({
      message: error.message || 'Failed to create payment link'
    });
  }
});

/**
 * POST /api/payos/webhook
 * Webhook endpoint to receive payment notifications from PayOS
 * This endpoint should NOT require authentication as it's called by PayOS
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Parse JSON body
    const webhookData = JSON.parse(req.body.toString());

    // Verify signature
    const { code, desc, success, data, signature } = webhookData;

    if (!signature) {
      console.error('❌ Webhook missing signature');
      return res.status(400).json({ message: 'Missing signature' });
    }

    // Verify signature
    const isValid = payosService.verifySignature(data, signature);
    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }

    // Find order by PayOS order code
    const order = await Order.findOne({ payosOrderCode: data.orderCode });

    if (!order) {
      console.error('❌ Order not found for PayOS order code:', data.orderCode);
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update payment status based on PayOS payment status
    const previousPaymentStatus = order.paymentStatus;
    if (code === '00' && success && data.status === 'PAID') {
      order.paymentStatus = 'paid';
      // Giữ nguyên orderStatus (chờ admin xác nhận)
      await order.save();
      console.log(`✅ Order ${order._id} payment marked as paid via PayOS webhook`);

      // Send payment success emails (non-blocking)
      if (previousPaymentStatus !== 'paid') {
        try {
          await emailService.sendPaymentSuccessEmailToUser(order);
          console.log('✅ Payment success email sent to user');
        } catch (emailErr) {
          console.error('⚠️ Failed to send payment success email to user:', emailErr.message);
        }

        try {
          await emailService.sendPaymentSuccessEmailToAdmin(order);
          console.log('✅ Payment success email sent to admin');
        } catch (emailErr) {
          console.error('⚠️ Failed to send payment success email to admin:', emailErr.message);
        }
      }
    } else if (data.status === 'CANCELLED') {
      // Payment cancelled - có thể hủy order hoặc chỉ đánh dấu payment failed
      order.paymentStatus = 'pending';
      // Nếu muốn tự động hủy order khi payment cancelled, uncomment dòng sau:
      // order.orderStatus = 'cancelled';
      await order.save();
      console.log(`⚠️ Order ${order._id} payment cancelled via PayOS webhook`);
    } else if (data.status === 'EXPIRED') {
      // Payment expired
      order.paymentStatus = 'failed';
      await order.save();
      console.log(`❌ Order ${order._id} payment expired via PayOS webhook`);

      // Send payment expired email (non-blocking)
      try {
        await emailService.sendPaymentExpiredEmailToUser(order);
        console.log('✅ Payment expired email sent to user');
      } catch (emailErr) {
        console.error('⚠️ Failed to send payment expired email to user:', emailErr.message);
      }
    } else if (code !== '00' && !success) {
      // Payment failed
      order.paymentStatus = 'failed';
      await order.save();
      console.log(`❌ Order ${order._id} payment failed via PayOS webhook`);

      // Send payment failed email (non-blocking)
      if (previousPaymentStatus !== 'failed') {
        try {
          await emailService.sendPaymentFailedEmailToUser(order, 'Thanh toán thất bại');
          console.log('✅ Payment failed email sent to user');
        } catch (emailErr) {
          console.error('⚠️ Failed to send payment failed email to user:', emailErr.message);
        }
      }
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ message: 'Webhook received' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    // Still return 200 to prevent PayOS from retrying
    res.status(200).json({ message: 'Webhook received but processing failed' });
  }
});

/**
 * GET /api/payos/order-by-code/:payosOrderCode
 * Find order by PayOS order code (for payment success redirect)
 */
router.get('/order-by-code/:payosOrderCode', async (req, res) => {
  try {
    const { payosOrderCode } = req.params;
    console.log('🔍 Searching for order with PayOS code:', payosOrderCode);
    
    const orderCodeNumber = parseInt(payosOrderCode);

    if (isNaN(orderCodeNumber)) {
      console.error('❌ Invalid order code format:', payosOrderCode);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid order code format' 
      });
    }

    console.log('🔍 Parsed order code number:', orderCodeNumber);
    
    // Try to find order by payosOrderCode (as number)
    let order = await Order.findOne({ payosOrderCode: orderCodeNumber });
    
    // If not found, try as string (for backward compatibility)
    if (!order) {
      console.log('🔍 Order not found as number, trying as string...');
      order = await Order.findOne({ payosOrderCode: payosOrderCode });
    }

    if (!order) {
      console.error('❌ Order not found for PayOS code:', payosOrderCode, '(parsed as:', orderCodeNumber, ')');
      // Log all orders with payosOrderCode for debugging
      const allOrdersWithPayOS = await Order.find({ payosOrderCode: { $exists: true } }).select('_id payosOrderCode').limit(10);
      console.log('📋 Sample orders with PayOS codes:', allOrdersWithPayOS.map(o => ({ id: o._id, code: o.payosOrderCode })));
      
      return res.status(404).json({ 
        success: false,
        message: `Order not found for PayOS code: ${payosOrderCode}` 
      });
    }

    console.log('✅ Order found:', order._id);
    res.json({
      success: true,
      order: {
        _id: order._id,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        payosOrderCode: order.payosOrderCode
      }
    });
  } catch (error) {
    console.error('❌ Error finding order by PayOS code:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to find order'
    });
  }
});

/**
 * GET /api/payos/test
 * Test PayOS credentials configuration
 */
router.get('/test', async (req, res) => {
  try {
    const hasClientId = !!process.env.PAYOS_CLIENT_ID;
    const hasApiKey = !!process.env.PAYOS_API_KEY;
    const hasChecksumKey = !!process.env.PAYOS_CHECKSUM_KEY;

    const config = {
      PAYOS_CLIENT_ID: hasClientId ? '✅ Configured' : '❌ Missing',
      PAYOS_API_KEY: hasApiKey ? '✅ Configured' : '❌ Missing',
      PAYOS_CHECKSUM_KEY: hasChecksumKey ? '✅ Configured' : '❌ Missing',
      PAYOS_RETURN_URL: process.env.PAYOS_RETURN_URL || 'Using default',
      PAYOS_CANCEL_URL: process.env.PAYOS_CANCEL_URL || 'Using default',
      FRONTEND_URL: process.env.FRONTEND_URL || 'Not set'
    };

    const allConfigured = hasClientId && hasApiKey && hasChecksumKey;

    res.json({
      success: allConfigured,
      message: allConfigured 
        ? 'PayOS credentials are configured' 
        : 'PayOS credentials are missing. Please check your .env file.',
      config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/payos/payment-info/:orderId
 * Get payment information for an order
 */
router.get('/payment-info/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order
    if (order.userId && order.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to access this order' });
    }

    // If payment link exists, get latest info from PayOS
    if (order.paymentLinkId || order.payosOrderCode) {
      try {
        const paymentInfo = await payosService.getPaymentInfo(
          order.paymentLinkId || order.payosOrderCode
        );

        // Update payment status if payment was completed
        const previousPaymentStatus = order.paymentStatus;
        if (paymentInfo.data.status === 'PAID' && order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          await order.save();

          // Send payment success emails (non-blocking)
          try {
            await emailService.sendPaymentSuccessEmailToUser(order);
            console.log('✅ Payment success email sent to user');
          } catch (emailErr) {
            console.error('⚠️ Failed to send payment success email to user:', emailErr.message);
          }

          try {
            await emailService.sendPaymentSuccessEmailToAdmin(order);
            console.log('✅ Payment success email sent to admin');
          } catch (emailErr) {
            console.error('⚠️ Failed to send payment success email to admin:', emailErr.message);
          }
        } else if (paymentInfo.data.status === 'EXPIRED') {
          if (order.paymentStatus !== 'failed') {
            order.paymentStatus = 'failed';
            await order.save();

            // Send payment expired email (non-blocking)
            try {
              await emailService.sendPaymentExpiredEmailToUser(order);
              console.log('✅ Payment expired email sent to user');
            } catch (emailErr) {
              console.error('⚠️ Failed to send payment expired email to user:', emailErr.message);
            }
          }
        } else if (paymentInfo.data.status === 'CANCELLED' || (paymentInfo.data.status !== 'PAID' && paymentInfo.data.status !== 'PENDING')) {
          if (order.paymentStatus !== 'failed') {
            order.paymentStatus = 'failed';
            await order.save();

            // Send payment failed email (non-blocking)
            if (previousPaymentStatus !== 'failed') {
              try {
                await emailService.sendPaymentFailedEmailToUser(order, 'Thanh toán thất bại');
                console.log('✅ Payment failed email sent to user');
              } catch (emailErr) {
                console.error('⚠️ Failed to send payment failed email to user:', emailErr.message);
              }
            }
          }
        }

        return res.json({
          success: true,
          order: {
            _id: order._id,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            checkoutUrl: order.checkoutUrl,
            qrCode: order.qrCode
          },
          paymentInfo: paymentInfo.data
        });
      } catch (error) {
        console.error('❌ Error fetching payment info from PayOS:', error);
        // Return order info even if PayOS API fails
        return res.json({
          success: true,
          order: {
            _id: order._id,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            checkoutUrl: order.checkoutUrl,
            qrCode: order.qrCode
          },
          paymentInfo: null
        });
      }
    }

    // No payment link yet
    res.json({
      success: true,
      order: {
        _id: order._id,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        checkoutUrl: null,
        qrCode: null
      },
      paymentInfo: null
    });
  } catch (error) {
    console.error('❌ Error getting payment info:', error);
    res.status(500).json({
      message: error.message || 'Failed to get payment info'
    });
  }
});

module.exports = router;

