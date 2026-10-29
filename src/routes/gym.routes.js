const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth.middleware');
const gymService = require('../services/gym.service');

const router = express.Router();

function createFlowId() {
  return crypto.randomBytes(4).toString('hex');
}

function ensureGymFeatureEnabled(req, res, next) {
  if (process.env.ENABLE_GYM_API === 'false') {
    return res.status(503).json({
      success: false,
      message: 'Tính năng đồng bộ lịch tập Gym tạm thời bảo trì.',
    });
  }
  return next();
}

/**
 * GET /api/gym/profile
 * Load authenticated user's synced 5-day gym routine & weight logs
 */
router.get('/profile', ensureGymFeatureEnabled, authenticateToken, async (req, res) => {
  const flowId = createFlowId();
  const userId = req.user.id || req.user._id;

  try {
    const profile = await gymService.getGymProfileByUserId(userId);
    return res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('❌ [GymAPI][GET /profile]', {
      flowId,
      userId,
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      message: 'Không thể tải dữ liệu lịch tập lúc này. Vui lòng thử lại sau.',
    });
  }
});

/**
 * PUT /api/gym/profile
 * Sync LocalStorage workout cycle, custom split & exercise weights with MongoDB
 */
router.put(
  '/profile',
  ensureGymFeatureEnabled,
  authenticateToken,
  [
    body('activeDayId').optional().isString().isLength({ max: 40 }),
    body('completedExerciseIdsToday').optional().isArray({ max: 30 }),
    body('sessionDateKey').optional().isString().isLength({ max: 20 }),
    body('workoutStreak').optional().isInt({ min: 0, max: 10000 }),
    body('customDays').optional().isArray({ max: 10 }),
    body('exerciseLogs').optional().isArray({ max: 100 }),
    body('clientUpdatedAt').optional().isNumeric(),
  ],
  async (req, res) => {
    const flowId = createFlowId();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu lịch tập gửi lên không hợp lệ.',
        errors: errors.array(),
      });
    }

    const userId = req.user.id || req.user._id;

    try {
      const synced = await gymService.upsertGymProfileByUserId(userId, req.body || {});
      return res.json({
        success: true,
        data: synced,
        message: 'Đã đồng bộ lịch tập và mức tạ thành công.',
      });
    } catch (error) {
      console.error('❌ [GymAPI][PUT /profile]', {
        flowId,
        userId,
        error: error.message,
      });
      return res.status(500).json({
        success: false,
        message: 'Lỗi đồng bộ dữ liệu lịch tập. Dữ liệu trên máy của bạn vẫn được giữ an toàn.',
      });
    }
  }
);

module.exports = router;
