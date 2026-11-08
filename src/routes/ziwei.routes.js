const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth.middleware');
const ziweiService = require('../services/ziwei.service');

const router = express.Router();

function createFlowId() {
  return crypto.randomBytes(4).toString('hex');
}

function ensureZiweiFeatureEnabled(req, res, next) {
  if (process.env.ENABLE_ZIWEI_API === 'false') {
    return res.status(503).json({
      success: false,
      message: 'Tính năng Tử Vi Đẩu Số AI tạm thời bảo trì.',
    });
  }
  return next();
}

/**
 * POST /api/ziwei/interpret
 * Luận giải lá số Tử Vi đơn theo học phái Nghê Hải Hạ《Thiên Kỷ》
 */
router.post(
  '/interpret',
  ensureZiweiFeatureEnabled,
  [
    body('chartSummary').isString().notEmpty().withMessage('Thiếu dữ liệu tóm tắt lá số.'),
    body('topic').optional().isString().isLength({ max: 40 }),
    body('messages').optional().isArray({ max: 20 }),
    body('apiKey').optional().isString().isLength({ max: 200 }),
  ],
  async (req, res) => {
    const flowId = createFlowId();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu yêu cầu luận giải không hợp lệ.',
        errors: errors.array(),
      });
    }

    try {
      const { chartSummary, topic, messages, apiKey } = req.body || {};
      const result = await ziweiService.interpretChart({
        chartSummary,
        topic,
        messages,
        apiKey,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const statusCode = error?.statusCode || 500;
      console.error('❌ [ZiweiAPI][POST /interpret]', {
        flowId,
        code: error?.code,
        error: error?.message,
      });
      return res.status(statusCode).json({
        success: false,
        code: error?.code || null,
        message: error?.message || 'Đã xảy ra lỗi khi luận giải lá số. Vui lòng thử lại sau.',
      });
    }
  }
);

/**
 * POST /api/ziwei/heming
 * Xem Hợp Hôn / Hợp Tác Đôi (Chấm 2 lá số A & B)
 */
router.post(
  '/heming',
  ensureZiweiFeatureEnabled,
  [
    body('chartASummary').isString().notEmpty().withMessage('Thiếu dữ liệu lá số A.'),
    body('chartBSummary').isString().notEmpty().withMessage('Thiếu dữ liệu lá số B.'),
    body('question').optional().isString().isLength({ max: 500 }),
    body('apiKey').optional().isString().isLength({ max: 200 }),
  ],
  async (req, res) => {
    const flowId = createFlowId();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin của cả hai lá số.',
        errors: errors.array(),
      });
    }

    try {
      const { chartASummary, chartBSummary, question, apiKey } = req.body || {};
      const result = await ziweiService.analyzeHeming({
        chartASummary,
        chartBSummary,
        question,
        apiKey,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const statusCode = error?.statusCode || 500;
      console.error('❌ [ZiweiAPI][POST /heming]', {
        flowId,
        code: error?.code,
        error: error?.message,
      });
      return res.status(statusCode).json({
        success: false,
        code: error?.code || null,
        message: error?.message || 'Đã xảy ra lỗi khi phân tích Hợp Hôn. Vui lòng thử lại sau.',
      });
    }
  }
);

/**
 * GET /api/ziwei/records
 * Tải danh sách lá số đã lưu của user đang đăng nhập
 */
router.get('/records', ensureZiweiFeatureEnabled, authenticateToken, async (req, res) => {
  const flowId = createFlowId();
  const userId = req.user.id || req.user._id;

  try {
    const records = await ziweiService.listUserRecords(userId);
    return res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error('❌ [ZiweiAPI][GET /records]', { flowId, userId, error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách lá số đã lưu lúc này.',
    });
  }
});

/**
 * POST /api/ziwei/records
 * Lưu lá số Tử Vi & kết quả luận giải AI vào tài khoản
 */
router.post(
  '/records',
  ensureZiweiFeatureEnabled,
  authenticateToken,
  [
    body('name').optional().isString().isLength({ max: 80 }),
    body('gender').isIn(['male', 'female']),
    body('year').isInt({ min: 1900, max: 2100 }),
    body('month').isInt({ min: 1, max: 12 }),
    body('day').isInt({ min: 1, max: 31 }),
  ],
  async (req, res) => {
    const flowId = createFlowId();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin lá số cần lưu không hợp lệ.',
        errors: errors.array(),
      });
    }

    const userId = req.user.id || req.user._id;
    try {
      const saved = await ziweiService.saveUserRecord(userId, req.body || {});
      return res.json({
        success: true,
        data: saved,
        message: 'Đã lưu lá số vào tài khoản thành công.',
      });
    } catch (error) {
      console.error('❌ [ZiweiAPI][POST /records]', { flowId, userId, error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lưu lá số lên hệ thống.',
      });
    }
  }
);

/**
 * DELETE /api/ziwei/records/:id
 * Xóa lá số đã lưu
 */
router.delete('/records/:id', ensureZiweiFeatureEnabled, authenticateToken, async (req, res) => {
  const flowId = createFlowId();
  const userId = req.user.id || req.user._id;
  try {
    await ziweiService.deleteUserRecord(userId, req.params.id);
    return res.json({
      success: true,
      message: 'Đã xóa lá số thành công.',
    });
  } catch (error) {
    console.error('❌ [ZiweiAPI][DELETE /records/:id]', { flowId, userId, error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Không thể xóa lá số này.',
    });
  }
});

module.exports = router;

