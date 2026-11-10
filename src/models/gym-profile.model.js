const mongoose = require('mongoose');

/**
 * Decision: Store user's customized split days (separated per gender), set-by-set exercise logs,
 * personal records (PRs), bounded workout history (max 60) and body metrics history (max 24)
 * inside a single bounded document per userId.
 * Trade-off: Single atomic read/write on mobile 4G avoids N+1 queries at the gym,
 * while strict array bounds guarantee document size stays well under 32KB.
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

const setDetailItemSchema = new mongoose.Schema(
  {
    setNumber: { type: Number, required: true, min: 0, max: 12 },
    weightKg: { type: Number, default: 0, min: 0, max: 1000 },
    reps: { type: Number, default: 10, min: 0, max: 200 },
    isWarmup: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const exerciseLogItemSchema = new mongoose.Schema(
  {
    exerciseId: { type: String, required: true, trim: true, maxlength: 64 },
    weightKg: { type: Number, default: 0, min: 0, max: 1000 },
    repsNote: { type: String, default: '', trim: true, maxlength: 60 },
    personalTip: { type: String, default: '', trim: true, maxlength: 200 },
    seatPinNote: { type: String, default: '', trim: true, maxlength: 120 },
    personalRecordKg: { type: Number, default: 0, min: 0, max: 1000 },
    estimated1RM: { type: Number, default: 0, min: 0, max: 1500 },
    setsCompletedToday: { type: [Number], default: [] },
    setsCompletedDateKey: { type: String, default: '', trim: true, maxlength: 20 },
    setsDetail: { type: [setDetailItemSchema], default: [] },
    updatedAtMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const femaleBodyProfileSchema = new mongoose.Schema(
  {
    gender: {
      type: String,
      enum: ['male', 'female'],
      default: 'female',
    },
    nickname: { type: String, default: 'Challenger', trim: true, maxlength: 60 },
    age: { type: Number, default: 23, min: 12, max: 90 },
    heightCm: { type: Number, default: 160, min: 100, max: 230 },
    weightKg: { type: Number, default: 50, min: 30, max: 200 },
    waistCm: { type: Number, default: 63, min: 40, max: 160 },
    hipCm: { type: Number, default: 92, min: 50, max: 180 },
    chestCm: { type: Number, default: 96, min: 50, max: 180 },
    armCm: { type: Number, default: 34, min: 15, max: 70 },
    workoutsPerWeek: { type: Number, default: 4, min: 1, max: 7 },
    primaryGoal: {
      type: String,
      enum: ['glute_sculpt', 'fat_loss', 'toned_curves', 'strength_health'],
      default: 'glute_sculpt',
    },
    maleGoal: {
      type: String,
      enum: ['chest_shoulder_3d', 'lean_abs_cut', 'mass_bulking', 'strength_power'],
      default: 'chest_shoulder_3d',
    },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    avoidHeavyQuads: { type: Boolean, default: true },
    protectLowerBackKnee: { type: Boolean, default: false },
    shoulderSafe: { type: Boolean, default: false },
    maleEnergyLevel: { type: Number, default: 4, min: 1, max: 5 },
    waterIntakeMlToday: { type: Number, default: 0, min: 0, max: 10000 },
    waterDateKey: { type: String, default: '', trim: true, maxlength: 20 },
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

const workoutHistoryItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true, maxlength: 64 },
    dateKey: { type: String, required: true, trim: true, maxlength: 20 },
    gender: { type: String, enum: ['male', 'female'], default: 'female' },
    dayId: { type: String, default: 'day1', trim: true, maxlength: 40 },
    dayTitle: { type: String, default: 'Buổi tập', trim: true, maxlength: 100 },
    durationMinutes: { type: Number, default: 45, min: 1, max: 360 },
    totalVolumeKg: { type: Number, default: 0, min: 0, max: 500000 },
    completedExercisesCount: { type: Number, default: 0, min: 0, max: 40 },
    caloriesBurned: { type: Number, default: 0, min: 0, max: 5000 },
    prCount: { type: Number, default: 0, min: 0, max: 30 },
    prHighlights: { type: [String], default: [] },
    createdAtMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const bodyMetricItemSchema = new mongoose.Schema(
  {
    dateKey: { type: String, required: true, trim: true, maxlength: 20 },
    gender: { type: String, enum: ['male', 'female'], default: 'female' },
    weightKg: { type: Number, default: 50, min: 30, max: 200 },
    waistCm: { type: Number, default: 63, min: 40, max: 160 },
    hipCm: { type: Number, default: 92, min: 50, max: 180 },
    chestCm: { type: Number, default: 96, min: 50, max: 180 },
    armCm: { type: Number, default: 34, min: 15, max: 70 },
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
    activeMaleDayId: {
      type: String,
      default: 'm_session_1',
      trim: true,
      maxlength: 40,
    },
    activeFemaleDayId: {
      type: String,
      default: 'f_session_1',
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
    maleCustomDays: {
      type: [customDaySchema],
      default: [],
    },
    femaleCustomDays: {
      type: [customDaySchema],
      default: [],
    },
    exerciseLogs: {
      type: [exerciseLogItemSchema],
      default: [],
    },
    workoutHistory: {
      type: [workoutHistoryItemSchema],
      default: [],
    },
    bodyMetricsHistory: {
      type: [bodyMetricItemSchema],
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
