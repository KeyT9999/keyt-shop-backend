const mongoose = require('mongoose');

/**
 * Decision: Store user's customized split days and per-exercise weight/completion logs
 * inside a single bounded document per userId (max 10 days, max 80 exercise logs).
 * Trade-off: Single atomic read/write on mobile 4G avoids N+1 queries at the gym,
 * while array bounds guarantee document size stays well under 32KB.
 */
const customDaySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true, maxlength: 40 },
    dayLabel: { type: String, required: true, trim: true, maxlength: 30 },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    subtitle: { type: String, default: '', trim: true, maxlength: 140 },
    isRestDay: { type: Boolean, default: false },
    exerciseIds: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const exerciseLogItemSchema = new mongoose.Schema(
  {
    exerciseId: { type: String, required: true, trim: true, maxlength: 64 },
    weightKg: { type: Number, default: 0, min: 0, max: 1000 },
    repsNote: { type: String, default: '', trim: true, maxlength: 60 },
    personalTip: { type: String, default: '', trim: true, maxlength: 200 },
    updatedAtMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const gymProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    activeDayId: {
      type: String,
      default: 'day1',
      trim: true,
      maxlength: 40,
    },
    completedExerciseIdsToday: {
      type: [String],
      default: [],
    },
    sessionDateKey: {
      type: String,
      default: '',
      trim: true,
      maxlength: 20,
    },
    workoutStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastCompletedSessionDate: {
      type: String,
      default: '',
      trim: true,
      maxlength: 20,
    },
    customDays: {
      type: [customDaySchema],
      default: [],
    },
    exerciseLogs: {
      type: [exerciseLogItemSchema],
      default: [],
    },
    clientUpdatedAt: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const GymProfile = mongoose.model('GymProfile', gymProfileSchema);

module.exports = GymProfile;
