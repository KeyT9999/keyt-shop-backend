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

const femaleBodyProfileSchema = new mongoose.Schema(
  {
    nickname: { type: String, default: 'Challenger', trim: true, maxlength: 60 },
    age: { type: Number, default: 23, min: 12, max: 90 },
    heightCm: { type: Number, default: 160, min: 100, max: 230 },
    weightKg: { type: Number, default: 50, min: 30, max: 200 },
    waistCm: { type: Number, default: 63, min: 40, max: 160 },
    hipCm: { type: Number, default: 92, min: 50, max: 180 },
    primaryGoal: {
      type: String,
      enum: ['glute_sculpt', 'fat_loss', 'toned_curves', 'strength_health'],
      default: 'glute_sculpt',
    },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    avoidHeavyQuads: { type: Boolean, default: true },
    protectLowerBackKnee: { type: Boolean, default: false },
    personalNotes: { type: String, default: '', trim: true, maxlength: 400 },
    updatedAtMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const cycleTrackingSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    lastPeriodStartDate: { type: String, default: '', trim: true, maxlength: 20 },
    cycleLengthDays: { type: Number, default: 28, min: 15, max: 60 },
    periodDurationDays: { type: Number, default: 5, min: 2, max: 12 },
    manualPhaseOverride: {
      type: String,
      enum: ['auto', 'menstrual', 'follicular', 'ovulatory', 'luteal'],
      default: 'auto',
    },
    todayEnergyLevel: { type: Number, default: 4, min: 1, max: 5 },
    todaySymptoms: { type: [String], default: [] },
    updatedAtMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const exerciseRestrictionSchema = new mongoose.Schema(
  {
    exerciseId: { type: String, required: true, trim: true, maxlength: 64 },
    kind: {
      type: String,
      enum: ['dislike', 'injury', 'busy'],
      default: 'dislike',
    },
    updatedAtMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const aiChatMessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true, maxlength: 64 },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, trim: true, maxlength: 3000 },
    createdAtMs: { type: Number, default: 0 },
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
    userProfile: {
      type: femaleBodyProfileSchema,
      default: () => ({}),
    },
    cycleTracking: {
      type: cycleTrackingSchema,
      default: () => ({}),
    },
    exerciseRestrictions: {
      type: [exerciseRestrictionSchema],
      default: [],
    },
    aiChatHistory: {
      type: [aiChatMessageSchema],
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
