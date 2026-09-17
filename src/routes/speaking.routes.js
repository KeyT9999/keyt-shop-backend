const express = require('express');
const speakingService = require('../services/speaking.service');
const { optionalAuth } = require('../middleware/optionalAuth.middleware');

const router = express.Router();

/**
 * GET /api/courses/:courseCode/speaking/passages
 * Get all reading passages (Mã đề A)
 */
router.get('/:courseCode/speaking/passages', optionalAuth, async (req, res) => {
  try {
    const { courseCode } = req.params;
    const passages = await speakingService.getReadingPassages(courseCode);
    res.json({ success: true, data: passages });
  } catch (err) {
    console.error('❌ Error getting speaking passages:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách bài đọc.' });
  }
});

/**
 * GET /api/courses/:courseCode/speaking/passages/:id
 * Get single reading passage
 */
router.get('/:courseCode/speaking/passages/:id', optionalAuth, async (req, res) => {
  try {
    const { courseCode, id } = req.params;
    const passage = await speakingService.getReadingPassageById(courseCode, id);
    if (!passage) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài đọc.' });
    }
    res.json({ success: true, data: passage });
  } catch (err) {
    console.error('❌ Error getting speaking passage by id:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải chi tiết bài đọc.' });
  }
});

/**
 * GET /api/courses/:courseCode/speaking/questions
 * Get Q&A questions with optional filter ?lesson=4&hasImage=true
 */
router.get('/:courseCode/speaking/questions', optionalAuth, async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { lesson, hasImage } = req.query;
    const questions = await speakingService.getQAQuestions(courseCode, { lesson, hasImage });
    res.json({ success: true, data: questions });
  } catch (err) {
    console.error('❌ Error getting speaking questions:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải ngân hàng câu hỏi vấn đáp.' });
  }
});

/**
 * GET /api/courses/:courseCode/speaking/mock-exam-pack
 * Generate a random mock speaking exam pack (1 A passage + 3 B questions)
 */
router.get('/:courseCode/speaking/mock-exam-pack', optionalAuth, async (req, res) => {
  try {
    const { courseCode } = req.params;
    const examPack = await speakingService.getMockExamPack(courseCode);
    if (!examPack) {
      return res.status(404).json({ success: false, message: 'Chưa có đủ dữ liệu để tạo đề thi thử.' });
    }
    res.json({ success: true, data: examPack });
  } catch (err) {
    console.error('❌ Error generating mock exam pack:', err);
    res.status(500).json({ success: false, message: 'Lỗi tạo bộ đề thi thử.' });
  }
});

/**
 * GET /api/courses/:courseCode/speaking/survival-kit
 * Get manners, rescue phrases, scoring rubric, and particle cheat sheet
 */
router.get('/:courseCode/speaking/survival-kit', optionalAuth, async (req, res) => {
  try {
    const { courseCode } = req.params;
    const kit = await speakingService.getSurvivalKit(courseCode);
    res.json({ success: true, data: kit });
  } catch (err) {
    console.error('❌ Error getting survival kit:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải cẩm nang phòng thi.' });
  }
});

/**
 * GET /api/courses/:courseCode/exams/fe-tests
 * Get list of FE mock tests
 */
router.get('/:courseCode/exams/fe-tests', optionalAuth, async (req, res) => {
  try {
    const { courseCode } = req.params;
    const exams = await speakingService.getFeExams(courseCode);
    res.json({ success: true, data: exams });
  } catch (err) {
    console.error('❌ Error getting FE mock tests:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách đề thi FE.' });
  }
});

/**
 * GET /api/courses/:courseCode/exams/fe-tests/:slug
 * Get FE mock test detail with questions
 */
router.get('/:courseCode/exams/fe-tests/:slug', optionalAuth, async (req, res) => {
  try {
    const { courseCode, slug } = req.params;
    const exam = await speakingService.getFeExamBySlug(courseCode, slug);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề thi.' });
    }
    res.json({ success: true, data: exam });
  } catch (err) {
    console.error('❌ Error getting FE mock test detail:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải chi tiết đề thi FE.' });
  }
});

module.exports = router;
