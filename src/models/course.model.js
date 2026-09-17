const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    shortDescription: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    level: {
      type: String,
      enum: ['N5', 'N4', 'N3', 'N2', 'N1', 'OTHER'],
      default: 'N5'
    },
    thumbnail: {
      type: String,
      trim: true
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    stats: {
      totalVocabulary: { type: Number, default: 0 },
      totalKanji: { type: Number, default: 0 },
      totalGrammar: { type: Number, default: 0 },
      totalExams: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

courseSchema.index({ isPublished: 1, sortOrder: 1 });

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
