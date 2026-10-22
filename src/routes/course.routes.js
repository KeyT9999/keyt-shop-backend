const express = require('express');
const { optionalAuth } = require('../middleware/optionalAuth.middleware');
const courseService = require('../services/course.service');
const quizEngineService = require('../services/quiz-engine.service');
const ttsService = require('../services/tts.service');

const router = express.Router();

/**
 * GET /api/courses/tts?text=...&lang=ja-JP|zh-CN|en-US
 * Stream Microsoft Azure Neural TTS audio with persistent VPS SSD caching
 */
router.get('/tts', async (req, res) => {
  try {
    const text = String(req.query.text || '').trim();
    const lang = String(req.query.lang || 'en-US').trim();

    if (!text) {
      return res.status(400).json({ success: false, message: 'Thiếu nội dung văn bản cần phát âm.' });
    }

    const { buffer, engine, voice } = await ttsService.synthesizeSpeech(text, lang);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-TTS-Engine': engine,
      'X-TTS-Voice': voice,
    });
    return res.send(buffer);
  } catch (err) {
    console.error('❌ Error synthesizing Neural TTS:', err.message);
    return res.status(500).json({ success: false, message: 'Không thể tạo âm thanh Neural TTS.' });
  }
});

/**
 * GET /api/courses/:courseCode
 * Get course overview and sections with optional user progress
 */
router.get('/:courseCode', optionalAuth, async (req, res) => {
  try {
    const { courseCode } = req.params;
    const userId = req.user?.id || null;

    const data = await courseService.getCourseOverview(courseCode, userId);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Khóa học không tồn tại.' });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('❌ Error fetching course overview:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi tải thông tin khóa học.' });
  }
});

/**
 * GET /api/courses/:courseCode/:sectionType/lessons
 * Get list of lessons in a section (e.g. vocabulary, kanji, grammar)
 */
router.get('/:courseCode/:sectionType/lessons', optionalAuth, async (req, res) => {
  try {
    const { courseCode, sectionType } = req.params;
    const userId = req.user?.id || null;

    const validSections = ['vocabulary', 'kanji', 'grammar', 'exam'];
    if (!validSections.includes(sectionType)) {
      return res.status(400).json({ success: false, message: 'Phân mục không hợp lệ.' });
    }

    const lessons = await courseService.getSectionLessons(courseCode, sectionType, userId);
    res.json({ success: true, data: lessons });
  } catch (err) {
    console.error('❌ Error fetching section lessons:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách bài học.' });
  }
});

/**
 * GET /api/courses/:courseCode/:sectionType/lessons/:lessonSlug
 * Get single lesson metadata
 */
router.get('/:courseCode/:sectionType/lessons/:lessonSlug', optionalAuth, async (req, res) => {
  try {
    const { courseCode, sectionType, lessonSlug } = req.params;
    const lesson = await courseService.getLessonBySlug(courseCode, sectionType, lessonSlug);

    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Bài học không tồn tại.' });
    }

    res.json({ success: true, data: lesson });
  } catch (err) {
    console.error('❌ Error fetching lesson:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi tải thông tin bài học.' });
  }
});

/**
 * GET /api/courses/:courseCode/:sectionType/lessons/:lessonSlug/items
 * Get all study items in a lesson with user progress
 */
router.get('/:courseCode/:sectionType/lessons/:lessonSlug/items', optionalAuth, async (req, res) => {
  try {
    const { courseCode, sectionType, lessonSlug } = req.params;
    const userId = req.user?.id || null;

    const result = await courseService.getLessonItems(courseCode, sectionType, lessonSlug, userId);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Bài học không tồn tại.' });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('❌ Error fetching lesson items:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi tải nội dung bài học.' });
  }
});

/**
 * GET /api/courses/:courseCode/vocabulary/lessons/:lessonSlug/quiz
 * Generate dynamic multiple choice quiz questions
 */
router.get('/:courseCode/vocabulary/lessons/:lessonSlug/quiz', optionalAuth, async (req, res) => {
  try {
    const { courseCode, lessonSlug } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;

    const questions = await quizEngineService.generateVocabularyQuiz(courseCode, lessonSlug, limit);
    if (!questions) {
      return res.status(404).json({ success: false, message: 'Bài học không tồn tại.' });
    }

    res.json({ success: true, data: questions });
  } catch (err) {
    console.error('❌ Error generating quiz:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi tạo bài kiểm tra trắc nghiệm.' });
  }
});

module.exports = router;
