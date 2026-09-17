const mongoose = require('mongoose');

const userVocabularyProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    courseCode: {
      type: String,
      required: true,
      uppercase: true
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseLesson',
      required: true
    },
    vocabularyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VocabularyItem',
      required: true
    },
    status: {
      type: String,
      enum: ['new', 'learning', 'familiar', 'mastered'],
      default: 'new'
    },
    masteryScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    correctCount: {
      type: Number,
      default: 0
    },
    wrongCount: {
      type: Number,
      default: 0
    },
    totalAttempts: {
      type: Number,
      default: 0
    },
    flashcardSeenCount: {
      type: Number,
      default: 0
    },
    streak: {
      type: Number,
      default: 0
    },
    isBookmarked: {
      type: Boolean,
      default: false
    },
    lastReviewedAt: {
      type: Date
    },
    nextReviewAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

userVocabularyProgressSchema.index({ userId: 1, vocabularyId: 1 }, { unique: true });
userVocabularyProgressSchema.index({ userId: 1, lessonId: 1 });
userVocabularyProgressSchema.index({ userId: 1, courseCode: 1 });

const userLessonProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    courseCode: {
      type: String,
      required: true,
      uppercase: true
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseLesson',
      required: true
    },
    sectionType: {
      type: String,
      enum: ['vocabulary', 'kanji', 'grammar', 'exam'],
      required: true
    },
    totalItems: {
      type: Number,
      default: 0
    },
    masteredItems: {
      type: Number,
      default: 0
    },
    learningItems: {
      type: Number,
      default: 0
    },
    percentCompleted: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastStudiedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

userLessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
userLessonProgressSchema.index({ userId: 1, courseCode: 1 });

const userCourseProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    courseCode: {
      type: String,
      required: true,
      uppercase: true
    },
    overallPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    vocabularyCompleted: {
      type: Number,
      default: 0
    },
    kanjiCompleted: {
      type: Number,
      default: 0
    },
    grammarCompleted: {
      type: Number,
      default: 0
    },
    examCompleted: {
      type: Number,
      default: 0
    },
    lastAccessedLesson: {
      lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseLesson' },
      slug: String,
      sectionType: String,
      title: String,
      accessedAt: Date
    }
  },
  {
    timestamps: true
  }
);

userCourseProgressSchema.index({ userId: 1, courseCode: 1 }, { unique: true });

const UserVocabularyProgress = mongoose.model('UserVocabularyProgress', userVocabularyProgressSchema);
const UserLessonProgress = mongoose.model('UserLessonProgress', userLessonProgressSchema);
const UserCourseProgress = mongoose.model('UserCourseProgress', userCourseProgressSchema);

module.exports = {
  UserVocabularyProgress,
  UserLessonProgress,
  UserCourseProgress
};
