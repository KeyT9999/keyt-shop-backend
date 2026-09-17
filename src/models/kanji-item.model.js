const mongoose = require('mongoose');

const kanjiItemSchema = new mongoose.Schema(
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
    character: {
      type: String,
      required: true,
      trim: true
    },
    meaning: [
      {
        type: String,
        trim: true
      }
    ],
    onyomi: [
      {
        type: String,
        trim: true
      }
    ],
    kunyomi: [
      {
        type: String,
        trim: true
      }
    ],
    strokeCount: {
      type: Number
    },
    strokeOrderSvg: {
      type: String,
      trim: true
    },
    mnemonic: {
      type: String,
      trim: true
    },
    jlptLevel: {
      type: String,
      enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
      default: 'N5'
    },
    exampleWords: [
      {
        term: { type: String, trim: true },
        reading: { type: String, trim: true },
        meaning: { type: String, trim: true }
      }
    ],
    order: {
      type: Number,
      default: 0
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

kanjiItemSchema.index({ lessonId: 1, order: 1 });
kanjiItemSchema.index({ courseCode: 1, character: 1 });

const KanjiItem = mongoose.model('KanjiItem', kanjiItemSchema);

module.exports = KanjiItem;
