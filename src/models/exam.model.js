const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  order: {
    type: Number,
    default: 0
  },
  type: {
    type: String,
    enum: ['multiple_choice', 'typing', 'fill_blank', 'matching', 'ordering'],
    default: 'multiple_choice'
  },
  sectionType: {
    type: String,
    enum: ['vocabulary', 'kanji', 'grammar', 'reading', 'listening', 'mixed'],
    default: 'mixed'
  },
  prompt: {
    type: String,
    required: true,
    trim: true
  },
  readingPrompt: {
    type: String,
    trim: true
  },
  options: [
    {
      id: { type: String, required: true },
      text: { type: String, required: true }
    }
  ],
  correctAnswer: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    trim: true
  },
  points: {
    type: Number,
    default: 1
  }
});

const examSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    courseCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    durationMinutes: {
      type: Number,
      default: 45
    },
    passingScore: {
      type: Number,
      default: 60
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    questions: [questionSchema],
    isPublished: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

examSchema.index({ courseCode: 1, slug: 1 }, { unique: true });
examSchema.index({ courseId: 1, order: 1 });

const examAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true
    },
    courseCode: {
      type: String,
      required: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    submittedAt: {
      type: Date
    },
    durationSeconds: {
      type: Number,
      default: 0
    },
    score: {
      type: Number,
      default: 0
    },
    correctCount: {
      type: Number,
      default: 0
    },
    wrongCount: {
      type: Number,
      default: 0
    },
    isPassed: {
      type: Boolean,
      default: false
    },
    answers: [
      {
        questionId: { type: String, required: true },
        userAnswer: { type: String },
        isCorrect: { type: Boolean, default: false }
      }
    ]
  },
  {
    timestamps: true
  }
);

examAttemptSchema.index({ userId: 1, examId: 1, createdAt: -1 });

const Exam = mongoose.model('Exam', examSchema);
const ExamAttempt = mongoose.model('ExamAttempt', examAttemptSchema);

module.exports = { Exam, ExamAttempt };
