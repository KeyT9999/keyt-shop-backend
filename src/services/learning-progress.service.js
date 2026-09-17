const mongoose = require('mongoose');
const VocabularyItem = require('../models/vocabulary-item.model');
const CourseLesson = require('../models/course-lesson.model');
const {
  UserVocabularyProgress,
  UserLessonProgress,
  UserCourseProgress
} = require('../models/user-progress.model');

function getStatusFromScore(score) {
  if (score >= 85) return 'mastered';
  if (score >= 60) return 'familiar';
  if (score >= 30) return 'learning';
  return 'new';
}

const learningProgressService = {
  /**
   * Record single vocabulary study attempt (Flashcard / Typing / Quiz)
   */
  async recordVocabularyResult(userId, vocabularyId, mode, isCorrect) {
    const item = await VocabularyItem.findById(vocabularyId).lean();
    if (!item) {
      throw new Error('Từ vựng không tồn tại');
    }

    // 1. Fetch or create UserVocabularyProgress
    let vocabProg = await UserVocabularyProgress.findOne({
      userId,
      vocabularyId
    });

    if (!vocabProg) {
      vocabProg = new UserVocabularyProgress({
        userId,
        courseId: item.courseId,
        courseCode: item.courseCode,
        lessonId: item.lessonId,
        vocabularyId: item._id,
        status: 'new',
        masteryScore: 0,
        streak: 0,
        correctCount: 0,
        wrongCount: 0,
        totalAttempts: 0,
        flashcardSeenCount: 0
      });
    }

    // 2. Adjust scores & streaks
    vocabProg.totalAttempts += 1;
    if (mode === 'flashcard') {
      vocabProg.flashcardSeenCount += 1;
    }

    if (isCorrect) {
      vocabProg.correctCount += 1;
      vocabProg.streak += 1;

      // Bonus point for typing (requires recall) vs flashcard (recognition)
      const delta = mode === 'typing' ? 20 : mode === 'multichoice' ? 15 : 12;
      vocabProg.masteryScore = Math.min(100, vocabProg.masteryScore + delta);
    } else {
      vocabProg.wrongCount += 1;
      vocabProg.streak = 0;
      const penalty = mode === 'typing' ? 10 : 15;
      vocabProg.masteryScore = Math.max(0, vocabProg.masteryScore - penalty);
    }

    vocabProg.status = getStatusFromScore(vocabProg.masteryScore);
    vocabProg.lastReviewedAt = new Date();

    await vocabProg.save();

    // 3. Recalculate UserLessonProgress
    const lesson = await CourseLesson.findById(item.lessonId).lean();
    const totalLessonItems = lesson.itemCount || 1;

    // Count all mastered and learning items in this lesson for this user
    const userLessonVocabs = await UserVocabularyProgress.find({
      userId,
      lessonId: item.lessonId
    }).lean();

    const masteredCount = userLessonVocabs.filter((v) => v.status === 'mastered').length;
    const learningCount = userLessonVocabs.filter((v) => v.status === 'learning' || v.status === 'familiar').length;
    const percentCompleted = Math.min(100, Math.round((masteredCount / totalLessonItems) * 100));

    const lessonProg = await UserLessonProgress.findOneAndUpdate(
      { userId, lessonId: item.lessonId },
      {
        $set: {
          userId,
          courseCode: item.courseCode,
          lessonId: item.lessonId,
          sectionType: 'vocabulary',
          totalItems: totalLessonItems,
          masteredItems: masteredCount,
          learningItems: learningCount,
          percentCompleted,
          lastStudiedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    // 4. Update UserCourseProgress
    await UserCourseProgress.findOneAndUpdate(
      { userId, courseCode: item.courseCode },
      {
        $set: {
          userId,
          courseCode: item.courseCode,
          lastAccessedLesson: {
            lessonId: lesson._id,
            slug: lesson.slug,
            sectionType: 'vocabulary',
            title: lesson.title,
            accessedAt: new Date()
          }
        }
      },
      { upsert: true }
    );

    return {
      vocabularyId: item._id,
      status: vocabProg.status,
      masteryScore: vocabProg.masteryScore,
      streak: vocabProg.streak,
      lessonProgress: {
        lessonId: lesson._id,
        masteredItems: masteredCount,
        totalItems: totalLessonItems,
        percentCompleted
      }
    };
  },

  /**
   * Toggle bookmark/favorite for vocabulary
   */
  async toggleBookmark(userId, vocabularyId) {
    const item = await VocabularyItem.findById(vocabularyId).lean();
    if (!item) throw new Error('Từ vựng không tồn tại');

    let vocabProg = await UserVocabularyProgress.findOne({ userId, vocabularyId });
    if (!vocabProg) {
      vocabProg = new UserVocabularyProgress({
        userId,
        courseId: item.courseId,
        courseCode: item.courseCode,
        lessonId: item.lessonId,
        vocabularyId: item._id,
        isBookmarked: true
      });
    } else {
      vocabProg.isBookmarked = !vocabProg.isBookmarked;
    }

    await vocabProg.save();
    return {
      vocabularyId: item._id,
      isBookmarked: vocabProg.isBookmarked
    };
  }
};

module.exports = learningProgressService;
