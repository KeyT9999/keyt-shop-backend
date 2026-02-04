const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const Announcement = require('../models/announcement.model');

const router = express.Router();

async function getLatestAnnouncement() {
  return await Announcement.findOne({}).sort({ updatedAt: -1, createdAt: -1 });
}

/**
 * GET /api/announcements/active
 * Logged-in users: get active announcement (or null)
 */
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const announcement = await Announcement.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1 });
    if (!announcement) return res.json(null);

    res.json({
      _id: announcement._id,
      title: announcement.title,
      message: announcement.message,
      isActive: announcement.isActive,
      updatedAt: announcement.updatedAt
    });
  } catch (err) {
    console.error('Error fetching active announcement:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/announcements/admin/current
 * Admin: get current (latest) announcement (or null)
 */
router.get('/admin/current', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const announcement = await getLatestAnnouncement();
    if (!announcement) return res.json(null);

    res.json({
      _id: announcement._id,
      title: announcement.title,
      message: announcement.message,
      isActive: announcement.isActive,
      updatedAt: announcement.updatedAt
    });
  } catch (err) {
    console.error('Error fetching admin current announcement:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/announcements/admin/current
 * Admin: upsert current announcement and enforce single active announcement
 */
router.put(
  '/admin/current',
  authenticateToken,
  requireAdmin,
  [
    body('title').optional().isString().trim(),
    body('message').notEmpty().withMessage('Message is required').isString().trim(),
    body('isActive').optional().isBoolean()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title = '', message, isActive = false } = req.body;

      // Enforce only one active announcement at a time
      if (isActive === true) {
        await Announcement.updateMany({ isActive: true }, { $set: { isActive: false } });
      }

      const announcement = await Announcement.create({
        title,
        message,
        isActive: !!isActive,
        updatedBy: req.user?.id || null
      });

      res.json({
        message: 'Cập nhật thông báo thành công',
        announcement: {
          _id: announcement._id,
          title: announcement.title,
          message: announcement.message,
          isActive: announcement.isActive,
          updatedAt: announcement.updatedAt
        }
      });
    } catch (err) {
      console.error('Error updating announcement:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;

