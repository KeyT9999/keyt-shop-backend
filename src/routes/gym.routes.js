const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth.middleware');
const gymService = require('../services/gym.service');
const gymAiService = require('../services/gym-ai.service');

const router = express.Router();

const gymAiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đang gửi câu hỏi hơi nhanh. Vui lòng đợi vài giây rồi hỏi tiếp nhé!',
  },
});

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
 * Load authenticated user's synced gym routine (Male & Female), body profile, cycle, PRs & history
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
 * Sync LocalStorage workout cycle, per-gender custom splits, body profile, history & exercise PRs
 */
router.put(
  '/profile',
  ensureGymFeatureEnabled,
  authenticateToken,
  [
    body('activeDayId').optional().isString().isLength({ max: 40 }),
    body('activeMaleDayId').optional().isString().isLength({ max: 40 }),
    body('activeFemaleDayId').optional().isString().isLength({ max: 40 }),
    body('completedExerciseIdsToday').optional().isArray({ max: 30 }),
    body('sessionDateKey').optional().isString().isLength({ max: 20 }),
    body('workoutStreak').optional().isInt({ min: 0, max: 10000 }),
    body('customDays').optional().isArray({ max: 10 }),
    body('maleCustomDays').optional().isArray({ max: 10 }),
    body('femaleCustomDays').optional().isArray({ max: 10 }),
    body('exerciseLogs').optional().isArray({ max: 100 }),
    body('workoutHistory').optional().isArray({ max: 60 }),
    body('bodyMetricsHistory').optional().isArray({ max: 24 }),
    body('userProfile').optional().isObject(),
    body('cycleTracking').optional().isObject(),
    body('exerciseRestrictions').optional().isArray({ max: 40 }),
    body('aiChatHistory').optional().isArray({ max: 25 }),
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
        message: 'Đã đồng bộ lịch tập và hồ sơ thành công.',
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

/**
 * POST /api/gym/sessions/complete
 * Record a completed workout session, compute smart streak, detect new PRs & advance active split day
 */
router.post(
  '/sessions/complete',
  ensureGymFeatureEnabled,
  authenticateToken,
  [
    body('dateKey').optional().isString().isLength({ max: 20 }),
    body('gender').optional().isIn(['male', 'female']),
    body('dayId').optional().isString().isLength({ max: 40 }),
    body('dayTitle').optional().isString().isLength({ max: 100 }),
    body('nextDayId').optional().isString().isLength({ max: 40 }),
    body('durationMinutes').optional().isNumeric(),
    body('totalVolumeKg').optional().isNumeric(),
    body('completedExercisesCount').optional().isInt({ min: 0, max: 40 }),
    body('caloriesBurned').optional().isNumeric(),
    body('prCount').optional().isInt({ min: 0, max: 30 }),
    body('prHighlights').optional().isArray({ max: 10 }),
    body('exerciseLogs').optional().isArray({ max: 100 }),
  ],
  async (req, res) => {
    const flowId = createFlowId();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin tổng kết buổi tập không hợp lệ.',
        errors: errors.array(),
      });
    }

    const userId = req.user.id || req.user._id;

    try {
      const result = await gymService.completeWorkoutSessionByUserId(userId, req.body || {});
      return res.json({
        success: true,
        data: result,
        message: 'Chúc mừng bạn đã hoàn thành buổi tập hôm nay!',
      });
    } catch (error) {
      console.error('❌ [GymAPI][POST /sessions/complete]', {
        flowId,
        userId,
        error: error.message,
      });
      return res.status(500).json({
        success: false,
        message: 'Không thể lưu tổng kết buổi tập lên Cloud lúc này.',
      });
    }
  }
);

/**
 * POST /api/gym/ai-chat
 * Personal AI Coach that knows everything about the user's body metrics, readiness/cycle phase,
 * current split, PRs & weight logs. Open to both Guest (localStorage snapshot) and Authenticated users.
 */
router.post(
  '/ai-chat',
  ensureGymFeatureEnabled,
  gymAiChatLimiter,
  [
    body('question')
      .isString()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Vui lòng nhập câu hỏi (tối đa 1000 ký tự).'),
    body('history').optional().isArray({ max: 12 }),
    body('userSnapshot').optional().isObject(),
  ],
  async (req, res) => {
    const flowId = createFlowId();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Câu hỏi gửi lên không hợp lệ.',
        errors: errors.array(),
      });
    }

    try {
      const result = await gymAiService.askGymAiCoach({
        question: req.body.question,
        history: req.body.history || [],
        userSnapshot: req.body.userSnapshot || {},
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('❌ [GymAPI][POST /ai-chat]', {
        flowId,
        error: error.message,
      });
      return res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message ||
          'Huấn luyện viên AI đang bận trong giây lát. Vui lòng thử lại nhé!',
      });
    }
  }
);

module.exports = router;
