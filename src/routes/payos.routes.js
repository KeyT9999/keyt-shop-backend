const express = require('express');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const payosService = require('../services/payos.service');
const emailService = require('../services/email.service');
const subscriptionService = require('../services/subscription.service');
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
      
      // Populate productId để kiểm tra preloaded accounts
      await order.populate('items.productId');
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:webhook:BEFORE_CHECK',message:'Before checking preloaded accounts',data:{orderId:order._id?.toString(),orderStatus:order.orderStatus,itemsCount:order.items?.length,items:order.items?.map(item=>({productId:item.productId?._id?.toString()||item.productId?.toString(),productPopulated:!!item.productId?._id}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Kiểm tra xem order có sản phẩm preloaded account không
      const hasPreloadedAccount = order.items.some(item => {
        const product = item.productId?._id ? item.productId : null;
        const result = product && product.isPreloadedAccount && product.preloadedAccounts && product.preloadedAccounts.length > 0;
        // #region agent log
        if (product) {
          fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:webhook:CHECK_ITEM',message:'Checking item for preloaded account',data:{orderId:order._id?.toString(),productId:product._id?.toString(),productName:product.name,isPreloadedAccount:product.isPreloadedAccount,preloadedAccountsCount:product.preloadedAccounts?.length||0,result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        }
        // #endregion
        return result;
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:webhook:CHECK_RESULT',message:'Preloaded account check result',data:{orderId:order._id?.toString(),hasPreloadedAccount,orderStatus:order.orderStatus,shouldAutoComplete:hasPreloadedAccount && order.orderStatus !== 'completed'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Nếu có preloaded account, tự động complete order
      if (hasPreloadedAccount && order.orderStatus !== 'completed') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:webhook:CALLING_AUTOCOMPLETE',message:'Calling autoCompleteOrderWithPreloadedAccounts',data:{orderId:order._id?.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        try {
          await autoCompleteOrderWithPreloadedAccounts(order);
          console.log(`✅ Auto-completed order ${order._id} with preloaded accounts`);
        } catch (autoCompleteErr) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:webhook:AUTOCOMPLETE_ERROR',message:'autoCompleteOrderWithPreloadedAccounts error',data:{orderId:order._id?.toString(),error:autoCompleteErr.message,stack:autoCompleteErr.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          console.error('❌ Error auto-completing order with preloaded accounts:', autoCompleteErr.message);
          // Nếu auto-complete fail, vẫn lưu payment status nhưng không complete order
          await order.save();
        }
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:webhook:SKIP_AUTOCOMPLETE',message:'Skipping auto-complete',data:{orderId:order._id?.toString(),hasPreloadedAccount,orderStatus:order.orderStatus,reason:!hasPreloadedAccount?'no_preloaded_account':'already_completed'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        // Giữ nguyên orderStatus (chờ admin xác nhận) nếu không có preloaded account
        await order.save();
      }
      
      console.log(`✅ Order ${order._id} payment marked as paid via PayOS webhook`);

      // Auto-create subscriptions if order is already completed and now paid
      if (order.orderStatus === 'completed' && previousPaymentStatus !== 'paid') {
        try {
          await createSubscriptionsFromOrder(order);
        } catch (subErr) {
          console.error('❌ Error creating subscriptions from PayOS webhook:', subErr.message);
          // Don't fail the webhook if subscription creation fails
        }
      }

      // Send payment success emails (non-blocking)
      // Send combined email to admin: Đơn Hàng Mới + Thanh toán thành công + Yêu cầu đặc biệt (if any)
      // Lưu ý: Nếu order đã auto-completed với preloaded accounts, email Order Completed đã được gửi trong autoCompleteOrderWithPreloadedAccounts
      if (previousPaymentStatus !== 'paid') {
        // Chỉ gửi payment success email nếu order chưa được auto-completed
        if (!hasPreloadedAccount || order.orderStatus !== 'completed') {
          try {
            await emailService.sendPaymentSuccessEmailToUser(order);
            console.log('✅ Payment success email sent to user');
          } catch (emailErr) {
            console.error('⚠️ Failed to send payment success email to user:', emailErr.message);
          }
        }

        // Send combined email to admin (Đơn Hàng Mới + Thanh toán thành công + Yêu cầu đặc biệt if any)
        try {
          await emailService.sendOrderNewAndPaidEmailToAdmin(order);
          console.log('✅ Order new and paid email sent to admin (combined: new order + payment success + special note if any)');
        } catch (emailErr) {
          console.error('⚠️ Failed to send order new and paid email to admin:', emailErr.message);
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
          
          // Populate productId để kiểm tra preloaded accounts
          await order.populate('items.productId');
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:payment-info:BEFORE_CHECK',message:'Before checking preloaded accounts (payment-info)',data:{orderId:order._id?.toString(),orderStatus:order.orderStatus,itemsCount:order.items?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          
          // Kiểm tra xem order có sản phẩm preloaded account không
          const hasPreloadedAccount = order.items.some(item => {
            const product = item.productId?._id ? item.productId : null;
            return product && product.isPreloadedAccount && product.preloadedAccounts && product.preloadedAccounts.length > 0;
          });
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:payment-info:CHECK_RESULT',message:'Preloaded account check result (payment-info)',data:{orderId:order._id?.toString(),hasPreloadedAccount,orderStatus:order.orderStatus,shouldAutoComplete:hasPreloadedAccount && order.orderStatus !== 'completed'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          
          // Nếu có preloaded account, tự động complete order
          if (hasPreloadedAccount && order.orderStatus !== 'completed') {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:payment-info:CALLING_AUTOCOMPLETE',message:'Calling autoCompleteOrderWithPreloadedAccounts (payment-info)',data:{orderId:order._id?.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            try {
              await autoCompleteOrderWithPreloadedAccounts(order);
              console.log(`✅ Auto-completed order ${order._id} with preloaded accounts (from payment info check)`);
            } catch (autoCompleteErr) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:payment-info:AUTOCOMPLETE_ERROR',message:'autoCompleteOrderWithPreloadedAccounts error (payment-info)',data:{orderId:order._id?.toString(),error:autoCompleteErr.message,stack:autoCompleteErr.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
              console.error('❌ Error auto-completing order with preloaded accounts:', autoCompleteErr.message);
              // Nếu auto-complete fail, vẫn lưu payment status nhưng không complete order
              await order.save();
            }
          } else {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:payment-info:SKIP_AUTOCOMPLETE',message:'Skipping auto-complete (payment-info)',data:{orderId:order._id?.toString(),hasPreloadedAccount,orderStatus:order.orderStatus,reason:!hasPreloadedAccount?'no_preloaded_account':'already_completed'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            // Giữ nguyên orderStatus (chờ admin xác nhận) nếu không có preloaded account
            await order.save();
          }

          // Auto-create subscriptions if order is already completed and now paid
          if (order.orderStatus === 'completed' && previousPaymentStatus !== 'paid') {
            try {
              await createSubscriptionsFromOrder(order);
            } catch (subErr) {
              console.error('❌ Error creating subscriptions from payment-info:', subErr.message);
              // Don't fail the request if subscription creation fails
            }
          }

          // Send payment success emails (non-blocking)
          // Send combined email to admin: Đơn Hàng Mới + Thanh toán thành công + Yêu cầu đặc biệt (if any)
          // Lưu ý: Nếu order đã auto-completed với preloaded accounts, email Order Completed đã được gửi trong autoCompleteOrderWithPreloadedAccounts
          if (previousPaymentStatus !== 'paid') {
            // Chỉ gửi payment success email nếu order chưa được auto-completed
            if (!hasPreloadedAccount || order.orderStatus !== 'completed') {
              try {
                await emailService.sendPaymentSuccessEmailToUser(order);
                console.log('✅ Payment success email sent to user');
              } catch (emailErr) {
                console.error('⚠️ Failed to send payment success email to user:', emailErr.message);
              }
            }

            // Send combined email to admin (Đơn Hàng Mới + Thanh toán thành công + Yêu cầu đặc biệt if any)
            try {
              await emailService.sendOrderNewAndPaidEmailToAdmin(order);
              console.log('✅ Order new and paid email sent to admin (combined: new order + payment success + special note if any)');
            } catch (emailErr) {
              console.error('⚠️ Failed to send order new and paid email to admin:', emailErr.message);
            }
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

/**
 * Helper function to create subscriptions from completed and paid order
 * @param {Object} order - Order object (should be populated with userId)
 * @returns {Promise<void>}
 */
async function createSubscriptionsFromOrder(order) {
  // Populate userId if not already populated
  if (!order.userId || typeof order.userId === 'string') {
    await order.populate('userId', 'email');
  }

  // Get customer email (prefer userId email, fallback to order.customer.email)
  const customerEmail = (order.userId && order.userId.email) || order.customer.email;
  
  // Create subscription for each item in the order
  for (const item of order.items) {
    try {
      // Get product details to calculate duration
      const product = await Product.findById(item.productId);
      if (!product) {
        console.warn(`⚠️ Product ${item.productId} not found for order ${order._id}`);
        continue;
      }

      // Calculate end date based on product name or billingCycle
      const startDate = order.completedAt || new Date();
      const endDate = calculateSubscriptionEndDate(product, item.name, startDate);

      // Create subscription
      await subscriptionService.save({
        customerEmail: customerEmail.toLowerCase(),
        serviceName: item.name,
        startDate: startDate,
        endDate: endDate,
        contactZalo: order.customer.phone || null,
        contactInstagram: null
      });

      console.log(`✅ Created subscription for ${customerEmail} - ${item.name}`);
    } catch (subErr) {
      console.error(`❌ Failed to create subscription for item ${item.name}:`, subErr.message);
      // Continue with other items even if one fails
    }
  }
}

/**
 * Helper function to auto-complete order with preloaded accounts
 * Automatically updates order status: pending -> confirmed -> processing -> completed
 * Assigns unused preloaded accounts, updates product stock, and sends completion email
 * @param {Object} order - Order object (should be populated with items.productId)
 * @returns {Promise<void>}
 */
async function autoCompleteOrderWithPreloadedAccounts(order) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:autoCompleteOrderWithPreloadedAccounts:ENTRY',message:'Function entry',data:{orderId:order._id?.toString(),orderStatus:order.orderStatus,itemsCount:order.items?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  try {
    // Step 1: Update order status to 'confirmed'
    order.orderStatus = 'confirmed';
    order.confirmedAt = new Date();
    await order.save();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:autoCompleteOrderWithPreloadedAccounts:CONFIRMED',message:'Order status updated to confirmed',data:{orderId:order._id?.toString(),orderStatus:order.orderStatus},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Step 2: Update order status to 'processing'
    order.orderStatus = 'processing';
    order.processingAt = new Date();
    await order.save();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:autoCompleteOrderWithPreloadedAccounts:PROCESSING',message:'Order status updated to processing',data:{orderId:order._id?.toString(),orderStatus:order.orderStatus},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Step 3: Populate productId if not already populated
    if (!order.items[0]?.productId?._id) {
      await order.populate('items.productId');
    }

    // Get all products from order items
    const productIds = order.items.map(item => item.productId?._id || item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:autoCompleteOrderWithPreloadedAccounts:PRODUCTS_LOADED',message:'Products loaded',data:{orderId:order._id?.toString(),productsCount:products.length,productIds:productIds.map(id=>id?.toString())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Combine all completion instructions (unique, non-empty)
    const instructionsSet = new Set();
    const deliveredAccounts = [];

    // Process each order item for preloaded accounts
    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const productId = item.productId?._id?.toString() || item.productId?.toString();
      const product = productMap.get(productId);

      if (!product) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:autoCompleteOrderWithPreloadedAccounts:PRODUCT_NOT_FOUND',message:'Product not found',data:{orderId:order._id?.toString(),itemIndex:i,productId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        continue;
      }

      // Collect completion instructions
      if (product.completionInstructions && product.completionInstructions.trim()) {
        instructionsSet.add(product.completionInstructions.trim());
      }

      // Handle preloaded accounts - tự động lấy account chưa dùng
      if (product.isPreloadedAccount && product.preloadedAccounts && product.preloadedAccounts.length > 0) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:autoCompleteOrderWithPreloadedAccounts:PRELOADED_ACCOUNT_FOUND',message:'Preloaded account product found',data:{orderId:order._id?.toString(),itemIndex:i,productName:product.name,isPreloadedAccount:product.isPreloadedAccount,preloadedAccountsCount:product.preloadedAccounts.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        // Tìm 1 account chưa dùng
        const availableAccount = product.preloadedAccounts.find((acc) => !acc.used);

        if (availableAccount) {
          // Đánh dấu account đã dùng
          availableAccount.used = true;
          availableAccount.usedAt = new Date();
          availableAccount.usedForOrder = order._id;

          // Lưu account vào deliveredAccounts
          deliveredAccounts.push({
            itemIndex: i,
            account: availableAccount.account
          });

          // Giảm stock khi account được sử dụng
          if (product.stock > 0) {
            product.stock -= 1;
          }

          // Lưu product với account đã đánh dấu used và stock đã giảm
          await product.save();

          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:autoCompleteOrderWithPreloadedAccounts:ACCOUNT_ASSIGNED',message:'Preloaded account assigned',data:{orderId:order._id?.toString(),itemIndex:i,productName:product.name,username:availableAccount.account.split(':')[0],stock:product.stock},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion

          console.log(`✅ Assigned preloaded account to order ${order._id}, item ${i}: ${availableAccount.account.split(':')[0]}, stock updated to ${product.stock}`);
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:autoCompleteOrderWithPreloadedAccounts:NO_AVAILABLE_ACCOUNT',message:'No available preloaded account',data:{orderId:order._id?.toString(),itemIndex:i,productName:product.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          console.warn(`⚠️ No available preloaded account for product ${product.name} in order ${order._id}`);
        }
      }
    }

    // Join with newlines if multiple products have instructions
    const completionInstructions = Array.from(instructionsSet).join('\n\n');

    // Cập nhật order.items với deliveredAccount
    if (deliveredAccounts.length > 0) {
      for (const { itemIndex, account } of deliveredAccounts) {
        if (order.items[itemIndex]) {
          order.items[itemIndex].deliveredAccount = account;
        }
      }
    }

    // Deduct stock for all products when order is completed
    // Note: Preloaded accounts already had stock deducted above
    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const productId = item.productId?._id?.toString() || item.productId?.toString();
      const product = productMap.get(productId);
      
      if (!product) continue;
      
      // Skip preloaded accounts (already handled above)
      if (product.isPreloadedAccount && product.preloadedAccounts && product.preloadedAccounts.length > 0) {
        continue;
      }
      
      // Deduct stock for regular products
      if (product.stock >= item.quantity) {
        product.stock -= item.quantity;
        await product.save();
        console.log(`✅ Deducted stock for product ${product.name}: -${item.quantity}, remaining: ${product.stock}`);
      } else {
        console.warn(`⚠️ Insufficient stock for product ${product.name}: requested ${item.quantity}, available ${product.stock}`);
      }
    }

    // Step 4: Update order status to 'completed'
    order.orderStatus = 'completed';
    order.completedAt = new Date();
    await order.save();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:autoCompleteOrderWithPreloadedAccounts:COMPLETED',message:'Order status updated to completed',data:{orderId:order._id?.toString(),orderStatus:order.orderStatus,deliveredAccountsCount:deliveredAccounts.length,hasCompletionInstructions:!!completionInstructions},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Step 5: Send completed email to user (non-blocking) with completion instructions and accounts
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:autoCompleteOrderWithPreloadedAccounts:EMAIL_BEFORE',message:'Before sending email',data:{orderId:order._id?.toString(),customerEmail:order.customer?.email,completionInstructionsLength:completionInstructions?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      await emailService.sendOrderCompletedEmailToUser(order, completionInstructions);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:autoCompleteOrderWithPreloadedAccounts:EMAIL_SUCCESS',message:'Email sent successfully',data:{orderId:order._id?.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      console.log('✅ Order completed email sent to user');
    } catch (emailErr) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:autoCompleteOrderWithPreloadedAccounts:EMAIL_ERROR',message:'Email sending failed',data:{orderId:order._id?.toString(),error:emailErr.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error('⚠️ Failed to send order completed email to user:', emailErr.message);
      // Continue even if email fails
    }

    // Step 6: Auto-create subscriptions if order is paid
    if (order.paymentStatus === 'paid') {
      try {
        await createSubscriptionsFromOrder(order);
      } catch (subErr) {
        console.error('❌ Error creating subscriptions from auto-complete:', subErr.message);
        // Don't fail if subscription creation fails
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:autoCompleteOrderWithPreloadedAccounts:EXIT',message:'Function exit success',data:{orderId:order._id?.toString(),orderStatus:order.orderStatus},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/082cf926-dfa2-44d1-a974-8ed2d16c158c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'payos.routes.js:autoCompleteOrderWithPreloadedAccounts:ERROR',message:'Function error',data:{orderId:order._id?.toString(),error:err.message,stack:err.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error('❌ Error auto-completing order with preloaded accounts:', err);
    throw err; // Re-throw to let caller handle
  }
}

/**
 * Helper function to calculate subscription end date
 * @param {Object} product - Product object
 * @param {string} itemName - Item name from order
 * @param {Date} startDate - Start date
 * @returns {Date} - End date
 */
function calculateSubscriptionEndDate(product, itemName, startDate) {
  const endDate = new Date(startDate);
  
  // Try to parse duration from item name (e.g., "Canva Pro 1 Năm", "Netflix Premium 3 tháng")
  const nameMatch = itemName.match(/(\d+)\s*(năm|tháng|month|year)/i);
  if (nameMatch) {
    const duration = parseInt(nameMatch[1]);
    const unit = nameMatch[2].toLowerCase();
    
    if (unit === 'năm' || unit === 'year') {
      endDate.setFullYear(endDate.getFullYear() + duration);
    } else if (unit === 'tháng' || unit === 'month') {
      endDate.setMonth(endDate.getMonth() + duration);
    }
    return endDate;
  }

  // Fallback to product billingCycle
  if (product.billingCycle) {
    const billingMatch = product.billingCycle.match(/(\d+)\s*(năm|tháng|month|year)/i);
    if (billingMatch) {
      const duration = parseInt(billingMatch[1]);
      const unit = billingMatch[2].toLowerCase();
      
      if (unit === 'năm' || unit === 'year') {
        endDate.setFullYear(endDate.getFullYear() + duration);
      } else if (unit === 'tháng' || unit === 'month') {
        endDate.setMonth(endDate.getMonth() + duration);
      }
      return endDate;
    }
  }

  // Default: 1 year if no duration found
  console.warn(`⚠️ Could not parse duration from product "${itemName}", defaulting to 1 year`);
  endDate.setFullYear(endDate.getFullYear() + 1);
  return endDate;
}

module.exports = router;

