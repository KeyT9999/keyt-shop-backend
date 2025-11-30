const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const subscriptionService = require('../services/subscription.service');

const router = express.Router();

/**
 * Get all subscriptions with filters (Admin only)
 * GET /api/subscriptions?q=search&status=active&before=dd/MM/yyyy
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { q, status, before } = req.query;
    const subscriptions = await subscriptionService.search(q, status, before);
    res.json(subscriptions);
  } catch (err) {
    console.error('❌ Error fetching subscriptions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Create subscription (Admin only)
 * POST /api/subscriptions
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { customerEmail, contactZalo, contactInstagram, serviceName, startDate, endDate } = req.body;

    if (!customerEmail || !serviceName || !startDate || !endDate) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc.' });
    }

    const subscription = await subscriptionService.save({
      customerEmail,
      contactZalo,
      contactInstagram,
      serviceName,
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    res.status(201).json(subscription);
  } catch (err) {
    console.error('❌ Error creating subscription:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Update subscription (Admin only)
 * PUT /api/subscriptions/:id
 */
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const subscription = await subscriptionService.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: 'Không tìm thấy subscription.' });
    }

    // Update fields
    if (req.body.customerEmail) subscription.customerEmail = req.body.customerEmail.trim().toLowerCase();
    if (req.body.contactZalo !== undefined) subscription.contactZalo = req.body.contactZalo || null;
    if (req.body.contactInstagram !== undefined) subscription.contactInstagram = req.body.contactInstagram || null;
    if (req.body.serviceName) subscription.serviceName = req.body.serviceName.trim();
    if (req.body.startDate) subscription.startDate = new Date(req.body.startDate);
    if (req.body.endDate) subscription.endDate = new Date(req.body.endDate);
    if (req.body.preExpiryNotified !== undefined) subscription.preExpiryNotified = req.body.preExpiryNotified;

    await subscription.save();
    res.json(subscription);
  } catch (err) {
    console.error('❌ Error updating subscription:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Delete subscription (Admin only)
 * DELETE /api/subscriptions/:id
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const deleted = await subscriptionService.deleteById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy subscription.' });
    }
    res.json({ message: 'Đã xóa subscription thành công.' });
  } catch (err) {
    console.error('❌ Error deleting subscription:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Import subscriptions from text (Admin only)
 * POST /api/subscriptions/import
 */
router.post('/import', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ message: 'Dữ liệu import không được để trống.' });
    }

    const result = await subscriptionService.importFromText(data);
    res.json(result);
  } catch (err) {
    console.error('❌ Error importing subscriptions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Send reminder for subscription (Admin only)
 * POST /api/subscriptions/:id/send-reminder
 */
router.post('/:id/send-reminder', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const success = await subscriptionService.sendReminderNow(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Không tìm thấy gói dịch vụ để gửi nhắc.' });
    }
    res.json({ message: 'Đã gửi email nhắc khách hàng.' });
  } catch (err) {
    console.error('❌ Error sending reminder:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

