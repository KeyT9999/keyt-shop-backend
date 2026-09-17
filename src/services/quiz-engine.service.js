const VocabularyItem = require('../models/vocabulary-item.model');
const CourseLesson = require('../models/course-lesson.model');

/**
 * Fisher-Yates array shuffler
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Japanese text normalizer: strips spaces, normalizes half-width to full-width kana
 */
function normalizeJapanese(str) {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '') // remove whitespace & ideographic space
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)); // fullwidth ascii to halfwidth
}

const quizEngineService = {
  /**
   * Generate multiple choice questions dynamically for a vocabulary lesson
   */
  async generateVocabularyQuiz(courseCode, lessonSlug, limit = 10) {
    const code = (courseCode || '').toUpperCase();
    const lesson = await CourseLesson.findOne({
      courseCode: code,
      sectionType: 'vocabulary',
      slug: lessonSlug,
      isPublished: true
    }).lean();

    if (!lesson) return null;

    // 1. Fetch all items in current lesson
    const lessonItems = await VocabularyItem.find({ lessonId: lesson._id }).lean();
    if (!lessonItems || lessonItems.length === 0) return [];

    // 2. Fetch extra pool from course if lesson has < 4 items
    let courseItems = [];
    if (lessonItems.length < 5) {
      courseItems = await VocabularyItem.find({ courseCode: code }).limit(50).lean();
    }

    const allCandidatePool = [...lessonItems, ...courseItems];

    // Select questions up to limit
    const targetItems = shuffle(lessonItems).slice(0, limit);

    const questions = targetItems.map((target, idx) => {
      // Find 3 distractors:
      // P1: Same lesson, same part of speech, different meaning
      let pool = lessonItems.filter(
        (i) => i.meaning !== target.meaning && i.partOfSpeech === target.partOfSpeech
      );

      // P2: Same lesson, different part of speech
      if (pool.length < 3) {
        const extraSameLesson = lessonItems.filter(
          (i) => i.meaning !== target.meaning && !pool.some((p) => p.meaning === i.meaning)
        );
        pool = [...pool, ...extraSameLesson];
      }

      // P3: Course pool fallback
      if (pool.length < 3) {
        const extraCourse = allCandidatePool.filter(
          (i) => i.meaning !== target.meaning && !pool.some((p) => p.meaning === i.meaning)
        );
        pool = [...pool, ...extraCourse];
      }

      const selectedDistractors = shuffle(pool).slice(0, 3);

      // Construct 4 options
      const rawOptions = [
        { id: 'correct', text: target.meaning },
        ...selectedDistractors.map((d, dIdx) => ({
          id: `distractor_${dIdx}`,
          text: d.meaning
        }))
      ];

      const shuffledOptions = shuffle(rawOptions).map((opt, optIdx) => ({
        id: String.fromCharCode(65 + optIdx), // 'A', 'B', 'C', 'D'
        text: opt.text,
        isCorrect: opt.id === 'correct'
      }));

      return {
        questionNumber: idx + 1,
        vocabularyId: target._id,
        term: target.term,
        reading: target.reading,
        partOfSpeech: target.partOfSpeech,
        prompt: `Từ "${target.term}" (${target.reading}) có nghĩa là gì?`,
        options: shuffledOptions.map((o) => ({ id: o.id, text: o.text })),
        correctOptionId: shuffledOptions.find((o) => o.isCorrect)?.id,
        correctMeaning: target.meaning
      };
    });

    return questions;
  },

  /**
   * Verify typing answer
   */
  async verifyTypingAnswer(vocabularyId, input, direction = 'ja-to-vi') {
    const item = await VocabularyItem.findById(vocabularyId).lean();
    if (!item) {
      return { isCorrect: false, message: 'Từ vựng không tồn tại' };
    }

    const cleanInput = (input || '').trim().toLowerCase();

    if (direction === 'ja-to-vi') {
      // User typed Vietnamese meaning
      const cleanMeaning = item.meaning.trim().toLowerCase();
      const isCorrect = cleanInput === cleanMeaning || cleanMeaning.includes(cleanInput);
      return {
        isCorrect,
        correctAnswer: item.meaning,
        item
      };
    } else {
      // User typed Japanese reading (Hiragana/Katakana/Kanji)
      const cleanReading = normalizeJapanese(item.reading);
      const cleanTerm = normalizeJapanese(item.term);
      const cleanUser = normalizeJapanese(cleanInput);

      const isCorrect = cleanUser === cleanReading || cleanUser === cleanTerm;
      return {
        isCorrect,
        correctAnswer: `${item.term} (${item.reading})`,
        item
      };
    }
  }
};

module.exports = quizEngineService;
