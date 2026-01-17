const Order = require('../models/order.model');
const emailService = require('./email.service');

class OrderEmailSchedulerService {
  /**
   * Check and send payment reminders to users
   * Finds orders that are pending payment for more than 2 hours
   * Only sends reminder once per order
   */
  async checkAndSendPaymentReminders() {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      // Only find orders that:
      // 1. Are pending payment
      // 2. Were created more than 2 hours ago
      // 3. Haven't had a payment reminder sent yet
      const orders = await Order.find({
        orderStatus: 'pending',
        paymentStatus: 'pending',
        createdAt: { $lte: twoHoursAgo },
        paymentReminderSentAt: { $exists: false }
      });

      console.log(`📧 Found ${orders.length} orders needing payment reminders`);

      let sentCount = 0;
      for (const order of orders) {
        try {
          await emailService.sendPaymentReminderEmailToUser(order);
          
          // Mark that payment reminder has been sent
          order.paymentReminderSentAt = new Date();
          await order.save();
          
          console.log(`✅ Payment reminder sent for order ${order._id}`);
          sentCount++;
        } catch (err) {
          console.error(`❌ Failed to send payment reminder for order ${order._id}:`, err.message);
        }
      }

      return { success: true, count: sentCount };
    } catch (err) {
      console.error('❌ Error checking payment reminders:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Check and send pending order reminders to admin
   * Finds orders that are pending confirmation for more than 24 hours and already paid
   */
  async checkAndSendPendingOrderReminders() {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const orders = await Order.find({
        orderStatus: 'pending',
        $or: [
          { paymentStatus: 'paid' },
          { paymentStatus: { $exists: false }, status: 'paid' }
        ],
        createdAt: { $lte: twentyFourHoursAgo }
      });

      console.log(`📧 Found ${orders.length} orders pending confirmation for more than 24 hours`);

      for (const order of orders) {
        try {
          const hoursPending = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60));
          await emailService.sendOrderPendingReminderEmailToAdmin(order, hoursPending);
          console.log(`✅ Pending order reminder sent for order ${order._id}`);
        } catch (err) {
          console.error(`❌ Failed to send pending order reminder for order ${order._id}:`, err.message);
        }
      }

      return { success: true, count: orders.length };
    } catch (err) {
      console.error('❌ Error checking pending order reminders:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Auto-cancel unpaid orders after 6 hours
   * Finds orders that are pending payment for more than 6 hours and cancels them
   */
  async autoCancelUnpaidOrders() {
    try {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      
      // Find orders that:
      // 1. Are pending payment
      // 2. Are still in pending status (not already cancelled or completed)
      // 3. Were created more than 6 hours ago
      const orders = await Order.find({
        orderStatus: 'pending',
        paymentStatus: 'pending',
        createdAt: { $lte: sixHoursAgo }
      });

      console.log(`🔄 Found ${orders.length} unpaid orders to auto-cancel (older than 6 hours)`);

      let cancelledCount = 0;
      for (const order of orders) {
        try {
          // Cancel the order
          order.orderStatus = 'cancelled';
          await order.save();

          // Send cancellation email to user (non-blocking)
          const reason = 'Đơn hàng đã tự động hủy do quá thời gian thanh toán (6 giờ)';
          try {
            await emailService.sendOrderCancelledEmailToUser(order, reason);
            console.log(`✅ Cancellation email sent for order ${order._id}`);
          } catch (emailErr) {
            console.error(`⚠️ Failed to send cancellation email for order ${order._id}:`, emailErr.message);
          }

          console.log(`✅ Auto-cancelled order ${order._id} (order code: #${order.orderCode})`);
          cancelledCount++;
        } catch (err) {
          console.error(`❌ Failed to auto-cancel order ${order._id}:`, err.message);
        }
      }

      return { success: true, count: cancelledCount };
    } catch (err) {
      console.error('❌ Error auto-cancelling unpaid orders:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send daily order summary to admin
   * Calculates stats and sends summary email at 20:00 daily
   */
  async sendDailyOrderSummary() {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      // Calculate today's orders
      const todayOrders = await Order.countDocuments({
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      });

      // Count pending confirmation orders
      const pendingConfirmation = await Order.countDocuments({
        $or: [
          { orderStatus: 'pending' },
          { orderStatus: { $exists: false }, status: 'pending' }
        ]
      });

      // Count processing orders
      const processing = await Order.countDocuments({
        orderStatus: 'processing'
      });

      // Calculate today's revenue (only paid orders)
      const todayRevenueOrders = await Order.find({
        createdAt: { $gte: startOfToday, $lte: endOfToday },
        $or: [
          { paymentStatus: 'paid' },
          { paymentStatus: { $exists: false }, status: 'paid' }
        ]
      });
      const todayRevenue = todayRevenueOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

      const stats = {
        todayOrders,
        pendingConfirmation,
        processing,
        todayRevenue
      };

      // Find orders needing attention
      // - Orders pending for more than 24 hours
      // - Orders with special notes
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const ordersNeedingAttention = await Order.find({
        $or: [
          {
            orderStatus: 'pending',
            $or: [
              { paymentStatus: 'paid' },
              { paymentStatus: { $exists: false }, status: 'paid' }
            ],
            createdAt: { $lte: twentyFourHoursAgo }
          },
          {
            $or: [
              { note: { $exists: true, $ne: null, $ne: '' } },
              { 'items.requiredFieldsData': { $exists: true, $ne: [] } }
            ]
          }
        ]
      })
        .limit(10)
        .sort({ createdAt: -1 })
        .lean();

      console.log(`📧 Sending daily order summary: ${todayOrders} orders today, ${pendingConfirmation} pending, ${processing} processing, ${todayRevenue} VND revenue`);

      await emailService.sendDailyOrderSummaryEmailToAdmin(stats, ordersNeedingAttention);
      console.log('✅ Daily order summary sent to admin');

      return { success: true, stats, ordersCount: ordersNeedingAttention.length };
    } catch (err) {
      console.error('❌ Error sending daily order summary:', err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new OrderEmailSchedulerService();

