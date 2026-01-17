const cron = require('node-cron');
const subscriptionService = require('../services/subscription.service');
const orderEmailSchedulerService = require('../services/order-email-scheduler.service');

/**
 * Initialize scheduled jobs
 */
function initializeScheduler() {
  // Run every day at 08:00 - Notify customers ending tomorrow (T-1)
  cron.schedule('0 0 8 * * *', async () => {
    console.log('🕐 Running scheduled job: notifyCustomersEndingTomorrow');
    try {
      const notified = await subscriptionService.notifyCustomersEndingTomorrow();
      console.log(`✅ Notified ${notified} customers about subscriptions ending tomorrow`);
    } catch (err) {
      console.error('❌ Error in notifyCustomersEndingTomorrow:', err);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Ho_Chi_Minh'
  });

  // Run every day at 08:05 - Send admin digest for subscriptions ending today (T0)
  cron.schedule('0 5 8 * * *', async () => {
    console.log('🕐 Running scheduled job: sendAdminDigestForToday');
    try {
      const count = await subscriptionService.sendAdminDigestForToday();
      console.log(`✅ Sent admin digest for ${count} subscriptions ending today`);
    } catch (err) {
      console.error('❌ Error in sendAdminDigestForToday:', err);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Ho_Chi_Minh'
  });

  // Run every day at 08:10 - Notify customers about expired subscriptions (T0)
  cron.schedule('0 10 8 * * *', async () => {
    console.log('🕐 Running scheduled job: notifyCustomersExpiredToday');
    try {
      const notified = await subscriptionService.notifyCustomersExpiredToday();
      console.log(`✅ Notified ${notified} customers about expired subscriptions`);
    } catch (err) {
      console.error('❌ Error in notifyCustomersExpiredToday:', err);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Ho_Chi_Minh'
  });

  // Run every hour - Send payment reminders to users
  cron.schedule('0 * * * *', async () => {
    console.log('🕐 Running scheduled job: checkAndSendPaymentReminders');
    try {
      const result = await orderEmailSchedulerService.checkAndSendPaymentReminders();
      console.log(`✅ Payment reminders sent: ${result.count || 0} orders`);
    } catch (err) {
      console.error('❌ Error in checkAndSendPaymentReminders:', err);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Ho_Chi_Minh'
  });

  // Run every hour - Auto-cancel unpaid orders after 6 hours
  cron.schedule('0 * * * *', async () => {
    console.log('🕐 Running scheduled job: autoCancelUnpaidOrders');
    try {
      const result = await orderEmailSchedulerService.autoCancelUnpaidOrders();
      console.log(`✅ Auto-cancelled unpaid orders: ${result.count || 0} orders`);
    } catch (err) {
      console.error('❌ Error in autoCancelUnpaidOrders:', err);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Ho_Chi_Minh'
  });

  // Run every 6 hours - Send pending order reminders to admin
  cron.schedule('0 */6 * * *', async () => {
    console.log('🕐 Running scheduled job: checkAndSendPendingOrderReminders');
    try {
      const result = await orderEmailSchedulerService.checkAndSendPendingOrderReminders();
      console.log(`✅ Pending order reminders sent: ${result.count || 0} orders`);
    } catch (err) {
      console.error('❌ Error in checkAndSendPendingOrderReminders:', err);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Ho_Chi_Minh'
  });

  // Run every day at 20:00 - Send daily order summary to admin
  cron.schedule('0 20 * * *', async () => {
    console.log('🕐 Running scheduled job: sendDailyOrderSummary');
    try {
      const result = await orderEmailSchedulerService.sendDailyOrderSummary();
      console.log(`✅ Daily order summary sent: ${result.stats?.todayOrders || 0} orders today`);
    } catch (err) {
      console.error('❌ Error in sendDailyOrderSummary:', err);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Ho_Chi_Minh'
  });

  console.log('✅ Scheduler initialized');
}

module.exports = { initializeScheduler };

