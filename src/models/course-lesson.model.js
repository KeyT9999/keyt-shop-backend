const mongoose = require('mongoose');

const courseLessonSchema = new mongoose.Schema(
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
    sectionType: {
      type: String,
      required: true,
      enum: ['vocabulary', 'kanji', 'grammar', 'exam']
    },
    lessonCode: {
      type: String,
      required: true,
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
    order: {
      type: Number,
      required: true,
      default: 0
    },
    itemCount: {
      type: Number,
      default: 0
    },
    isPublished: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

courseLessonSchema.index({ courseCode: 1, sectionType: 1, slug: 1 }, { unique: true });
courseLessonSchema.index({ courseId: 1, sectionType: 1, order: 1 });
courseLessonSchema.index({ courseCode: 1, lessonCode: 1 });

const CourseLesson = mongoose.model('CourseLesson', courseLessonSchema);

module.exports = CourseLesson;
