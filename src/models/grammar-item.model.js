const mongoose = require('mongoose');

const grammarItemSchema = new mongoose.Schema(
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
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseLesson',
      required: true
    },
    order: {
      type: Number,
      default: 0
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    pattern: {
      type: String,
      required: true,
      trim: true
    },
    meaning: {
      type: String,
      required: true,
      trim: true
    },
    explanation: {
      type: String,
      trim: true
    },
    structures: [
      {
        type: String,
        trim: true
      }
    ],
    examples: [
      {
        japanese: { type: String, trim: true },
        reading: { type: String, trim: true },
        vietnamese: { type: String, trim: true }
      }
    ],
    notes: [
      {
        type: String,
        trim: true
      }
    ],
    tags: [
      {
        type: String,
        trim: true
      }
    ]
  },
  {
    timestamps: true
  }
);

grammarItemSchema.index({ lessonId: 1, order: 1 });
grammarItemSchema.index({ courseCode: 1, lessonId: 1 });

const GrammarItem = mongoose.model('GrammarItem', grammarItemSchema);

module.exports = GrammarItem;
