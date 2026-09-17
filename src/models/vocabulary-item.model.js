const mongoose = require('mongoose');

const vocabularyItemSchema = new mongoose.Schema(
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
      required: true
    },
    term: {
      type: String,
      required: true,
      trim: true
    },
    reading: {
      type: String,
      required: true,
      trim: true
    },
    romaji: {
      type: String,
      trim: true
    },
    partOfSpeech: {
      type: String,
      required: true,
      trim: true
    },
    meaning: {
      type: String,
      required: true,
      trim: true
    },
    examples: [
      {
        japanese: { type: String, trim: true },
        reading: { type: String, trim: true },
        vietnamese: { type: String, trim: true }
      }
    ],
    audioUrl: {
      type: String,
      trim: true
    },
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

vocabularyItemSchema.index({ lessonId: 1, order: 1 });
vocabularyItemSchema.index({ courseCode: 1, lessonId: 1 });
vocabularyItemSchema.index({ courseId: 1, term: 1 });

const VocabularyItem = mongoose.model('VocabularyItem', vocabularyItemSchema);

module.exports = VocabularyItem;
