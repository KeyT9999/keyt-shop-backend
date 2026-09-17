const express = require('express');
const multer = require('multer');
const speakingService = require('../services/speaking.service');
const { optionalAuth } = require('../middleware/optionalAuth.middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

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

/**
 * POST /api/courses/:courseCode/speaking/evaluate
 * Evaluate reading audio via Python Speech AI Microservice (:8001)
 */
router.post('/:courseCode/speaking/evaluate', optionalAuth, upload.single('audio'), async (req, res) => {
  try {
    const { courseCode } = req.params;

    const { expectedText, passageId } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp file ghi âm (audio).' });
    }
    if (!expectedText) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp câu mẫu (expectedText).' });
    }

    const aiServiceUrl = process.env.SPEECH_AI_URL || 'http://127.0.0.1:8001';

    const formData = new FormData();
    const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });
    formData.append('audio', audioBlob, req.file.originalname || 'speech.webm');
    formData.append('expectedText', expectedText);
    formData.append('courseCode', courseCode || 'jpd123');
    if (passageId) formData.append('passageId', passageId);

    const aiRes = await fetch(`${aiServiceUrl}/api/pronunciation/evaluate`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000)
    });

    if (!aiRes.ok) {
      const errData = await aiRes.json().catch(() => ({}));
      return res.status(aiRes.status).json({
        success: false,
        message: errData.detail || 'Lỗi từ AI Speech Microservice khi chấm điểm.'
      });
    }

    const result = await aiRes.json();
    return res.json(result);
  } catch (err) {
    console.error('❌ Error evaluating speech in Node backend:', err);
    if (err.cause?.code === 'ECONNREFUSED' || err.name === 'TimeoutError') {
      return res.status(503).json({
        success: false,
        message: 'Dịch vụ AI Speech Microservice (cổng 8001) chưa khởi động hoặc phản hồi quá lâu.'
      });
    }
    return res.status(500).json({ success: false, message: 'Lỗi xử lý chấm phát âm.' });
  }
});

/**
 * POST /api/courses/:courseCode/speaking/evaluate-qa
 * Evaluate Q&A audio answer via Python Speech AI Microservice (:8001)
 */
router.post('/:courseCode/speaking/evaluate-qa', optionalAuth, upload.single('audio'), async (req, res) => {
  try {
    const { questionJapanese, keywords, grammarPattern, referenceAnswers } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp file ghi âm câu trả lời.' });
    }
    if (!questionJapanese) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp câu hỏi tiếng Nhật.' });
    }

    const aiServiceUrl = process.env.SPEECH_AI_URL || 'http://127.0.0.1:8001';

    const formData = new FormData();
    const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });
    formData.append('audio', audioBlob, req.file.originalname || 'qa_answer.webm');
    formData.append('questionJapanese', questionJapanese);
    if (keywords) formData.append('keywords', typeof keywords === 'string' ? keywords : JSON.stringify(keywords));
    if (grammarPattern) formData.append('grammarPattern', grammarPattern);
    if (referenceAnswers) formData.append('referenceAnswers', typeof referenceAnswers === 'string' ? referenceAnswers : JSON.stringify(referenceAnswers));

    const aiRes = await fetch(`${aiServiceUrl}/api/pronunciation/evaluate-qa`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000)
    });

    if (!aiRes.ok) {
      const errData = await aiRes.json().catch(() => ({}));
      return res.status(aiRes.status).json({
        success: false,
        message: errData.detail || 'Lỗi từ AI Speech Microservice khi chấm Q&A.'
      });
    }

    const result = await aiRes.json();
    return res.json(result);
  } catch (err) {
    console.error('❌ Error evaluating QA in Node backend:', err);
    if (err.cause?.code === 'ECONNREFUSED' || err.name === 'TimeoutError') {
      return res.status(503).json({
        success: false,
        message: 'Dịch vụ AI Speech Microservice (cổng 8001) chưa khởi động hoặc phản hồi quá lâu.'
      });
    }
    return res.status(500).json({ success: false, message: 'Lỗi xử lý chấm Q&A.' });
  }
});

/**
 * POST /api/courses/:courseCode/speaking/evaluate-greeting
 * Evaluate greeting manners audio via Python Speech AI Microservice (:8001)
 */
router.post('/:courseCode/speaking/evaluate-greeting', optionalAuth, upload.single('audio'), async (req, res) => {
  try {
    const { targetPhrase } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp file ghi âm lời chào.' });
    }

    const aiServiceUrl = process.env.SPEECH_AI_URL || 'http://127.0.0.1:8001';

    const formData = new FormData();
    const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });
    formData.append('audio', audioBlob, req.file.originalname || 'greeting.webm');
    formData.append('targetPhrase', targetPhrase || '失礼します');

    const aiRes = await fetch(`${aiServiceUrl}/api/pronunciation/evaluate-greeting`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000)
    });

    if (!aiRes.ok) {
      const errData = await aiRes.json().catch(() => ({}));
      return res.status(aiRes.status).json({
        success: false,
        message: errData.detail || 'Lỗi từ AI Speech Microservice khi chấm tác phong chào hỏi.'
      });
    }

    const result = await aiRes.json();
    return res.json(result);
  } catch (err) {
    console.error('❌ Error evaluating greeting in Node backend:', err);
    if (err.cause?.code === 'ECONNREFUSED' || err.name === 'TimeoutError') {
      return res.status(503).json({
        success: false,
        message: 'Dịch vụ AI Speech Microservice (cổng 8001) chưa khởi động hoặc phản hồi quá lâu.'
      });
    }
    return res.status(500).json({ success: false, message: 'Lỗi xử lý chấm tác phong chào hỏi.' });
  }
});

module.exports = router;


