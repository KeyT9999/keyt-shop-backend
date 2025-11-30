const ServiceSubscription = require('../models/service-subscription.model');
const { parseFlexibleDate, formatDate } = require('../utils/date.util');
const emailService = require('./email.service');

class SubscriptionService {
  /**
   * Save subscription
   * @param {Object} subscriptionData - Subscription data
   * @returns {Promise<Object>} - Saved subscription
   */
  async save(subscriptionData) {
    if (subscriptionData.customerEmail) {
      subscriptionData.customerEmail = subscriptionData.customerEmail.trim().toLowerCase();
    }
    return await ServiceSubscription.create(subscriptionData);
  }

  /**
   * Delete subscription by ID
   * @param {string} id - Subscription ID
   * @returns {Promise<boolean>} - True if deleted
   */
  async deleteById(id) {
    const result = await ServiceSubscription.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * Find subscription by ID
   * @param {string} id - Subscription ID
   * @returns {Promise<Object|null>} - Found subscription or null
   */
  async findById(id) {
    return await ServiceSubscription.findById(id);
  }

  /**
   * Get all subscriptions
   * @returns {Promise<Array>} - All subscriptions
   */
  async findAll() {
    return await ServiceSubscription.find({}).sort({ endDate: 1 });
  }

  /**
   * Search subscriptions with filters
   * @param {string} q - Search query
   * @param {string} status - Status filter (active, expired, notified, pending)
   * @param {string} before - End date before (dd/MM/yyyy)
   * @returns {Promise<Array>} - Filtered subscriptions
   */
  async search(q, status, before) {
    let query = {};

    // Text search
    if (q && q.trim()) {
      const searchRegex = { $regex: q.trim(), $options: 'i' };
      query.$or = [
        { customerEmail: searchRegex },
        { serviceName: searchRegex },
        { contactZalo: searchRegex },
        { contactInstagram: searchRegex }
      ];
    }

    // Status filter
    if (status) {
      const now = new Date();
      if (status === 'active') {
        query.endDate = { $gte: now };
      } else if (status === 'expired') {
        query.endDate = { $lt: now };
      } else if (status === 'notified') {
        query.preExpiryNotified = true;
      } else if (status === 'pending') {
        query.preExpiryNotified = false;
      }
    }

    // Before date filter
    if (before) {
      try {
        const beforeDate = parseFlexibleDate(before);
        query.endDate = { ...query.endDate, $lte: beforeDate };
      } catch (err) {
        // Invalid date, ignore filter
        console.warn('Invalid before date:', before);
      }
    }

    return await ServiceSubscription.find(query).sort({ endDate: 1 });
  }

  /**
   * Find subscriptions ending tomorrow
   * @returns {Promise<Array>} - Subscriptions ending tomorrow
   */
  async findEndingTomorrow() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    return await ServiceSubscription.find({
      endDate: { $gte: tomorrow, $lte: tomorrowEnd }
    });
  }

  /**
   * Find subscriptions ending today
   * @returns {Promise<Array>} - Subscriptions ending today
   */
  async findEndingToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    return await ServiceSubscription.find({
      endDate: { $gte: today, $lte: todayEnd }
    });
  }

  /**
   * Find subscriptions ending tomorrow and not yet notified
   * @returns {Promise<Array>} - Subscriptions to notify
   */
  async findEndingTomorrowAndNotNotified() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    return await ServiceSubscription.find({
      endDate: { $gte: tomorrow, $lte: tomorrowEnd },
      preExpiryNotified: false
    });
  }

  /**
   * Notify customers ending tomorrow
   * @returns {Promise<number>} - Number of notifications sent
   */
  async notifyCustomersEndingTomorrow() {
    const due = await this.findEndingTomorrowAndNotNotified();
    if (due.length === 0) return 0;

    let notified = 0;
    for (const subscription of due) {
      try {
        await emailService.sendSubscriptionExpiryReminderToCustomer(
          subscription.customerEmail,
          subscription.serviceName,
          subscription.endDate
        );
        subscription.preExpiryNotified = true;
        await subscription.save();
        notified++;
      } catch (err) {
        console.error(`Failed to notify ${subscription.customerEmail}:`, err);
      }
    }

    // Send digest to admin
    if (notified > 0) {
      await emailService.sendSubscriptionExpiryDigestToAdmin(due);
    }

    return notified;
  }

  /**
   * Send admin digest for subscriptions ending today
   * @returns {Promise<number>} - Number of subscriptions in digest
   */
  async sendAdminDigestForToday() {
    const dueToday = await this.findEndingToday();
    if (dueToday.length === 0) return 0;

    await emailService.sendSubscriptionExpiryTodayDigestToAdmin(dueToday);
    return dueToday.length;
  }

  /**
   * Send reminder now for a subscription
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<boolean>} - True if sent successfully
   */
  async sendReminderNow(subscriptionId) {
    const subscription = await this.findById(subscriptionId);
    if (!subscription) return false;

    try {
      await emailService.sendSubscriptionExpiryReminderToCustomer(
        subscription.customerEmail,
        subscription.serviceName,
        subscription.endDate
      );
      subscription.preExpiryNotified = true;
      await subscription.save();
      return true;
    } catch (err) {
      console.error('Failed to send reminder:', err);
      return false;
    }
  }

  /**
   * Import subscriptions from text
   * @param {string} rawText - Raw text data (tab or space separated)
   * @returns {Promise<Object>} - Import result with success, failed counts and errors
   */
  async importFromText(rawText) {
    if (!rawText || !rawText.trim()) {
      return { success: 0, failed: 0, errors: ['Dữ liệu trống'] };
    }

    const lines = rawText.replace(/\r/g, '').split('\n');
    let success = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      // Try tab first, then 2+ spaces, then single spaces
      let parts = line.split('\t');
      if (parts.length < 4) {
        parts = line.split(/\s{2,}/);
      }
      if (parts.length < 4) {
        parts = line.split(/\s+/);
      }

      if (parts.length < 4) {
        failed++;
        errors.push(`Dòng ${i + 1}: Không đúng định dạng (cần 4 cột: email, dịch vụ, bắt đầu, kết thúc)`);
        continue;
      }

      const email = parts[0].trim();
      if (!email) {
        continue; // Skip rows without email
      }

      const service = parts[1].trim();
      const startStr = parts[2].trim();
      const endStr = parts[3].trim();
      const zalo = parts[4] ? parts[4].trim() : null;
      const instagram = parts[5] ? parts[5].trim() : null;

      try {
        const startDate = parseFlexibleDate(startStr);
        const endDate = parseFlexibleDate(endStr);

        await this.save({
          customerEmail: email,
          serviceName: service,
          startDate,
          endDate,
          contactZalo: zalo || null,
          contactInstagram: instagram || null
        });

        success++;
      } catch (err) {
        failed++;
        errors.push(`Dòng ${i + 1}: ${err.message}`);
      }
    }

    return { success, failed, errors };
  }
}

module.exports = new SubscriptionService();

