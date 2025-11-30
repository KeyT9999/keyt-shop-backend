const cron = require('node-cron');
const subscriptionService = require('../services/subscription.service');

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

  console.log('✅ Scheduler initialized');
}

module.exports = { initializeScheduler };

