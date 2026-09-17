const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth.middleware');
const { optionalAuth } = require('../middleware/optionalAuth.middleware');
const learningProgressService = require('../services/learning-progress.service');
const quizEngineService = require('../services/quiz-engine.service');

const router = express.Router();

/**
 * POST /api/learning/vocabulary/:vocabularyId/record
 * Record a study attempt (flashcard, typing, multichoice)
 */
router.post(
  '/vocabulary/:vocabularyId/record',
  authenticateToken,
  [
    body('mode')
      .isIn(['flashcard', 'typing', 'multichoice'])
      .withMessage('Chế độ học không hợp lệ.'),
    body('isCorrect')
      .isBoolean()
      .withMessage('isCorrect phải là boolean.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { vocabularyId } = req.params;
      const { mode, isCorrect } = req.body;
      const userId = req.user.id;

      const result = await learningProgressService.recordVocabularyResult(
        userId,
        vocabularyId,
        mode,
        isCorrect
      );

      res.json({ success: true, data: result });
    } catch (err) {
      console.error('❌ Error recording learning result:', err);
      res.status(500).json({ success: false, message: err.message || 'Lỗi khi lưu kết quả học tập.' });
    }
  }
);

/**
 * POST /api/learning/vocabulary/:vocabularyId/bookmark
 * Toggle favorite / bookmark on a vocabulary item
 */
router.post(
  '/vocabulary/:vocabularyId/bookmark',
  authenticateToken,
  async (req, res) => {
    try {
      const { vocabularyId } = req.params;
      const userId = req.user.id;

      const result = await learningProgressService.toggleBookmark(userId, vocabularyId);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('❌ Error toggling bookmark:', err);
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật đánh dấu từ vựng.' });
    }
  }
);

/**
 * POST /api/learning/typing/verify
 * Real-time verification of user typed answer
 */
router.post(
  '/typing/verify',
  optionalAuth,
  [
    body('vocabularyId').notEmpty().withMessage('vocabularyId không được để trống.'),
    body('input').isString().withMessage('input phải là chuỗi ký tự.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { vocabularyId, input, direction } = req.body;
      const result = await quizEngineService.verifyTypingAnswer(
        vocabularyId,
        input,
        direction || 'ja-to-vi'
      );

      res.json({ success: true, data: result });
    } catch (err) {
      console.error('❌ Error verifying typing answer:', err);
      res.status(500).json({ success: false, message: 'Lỗi khi kiểm tra câu trả lời.' });
    }
  }
);

module.exports = router;
