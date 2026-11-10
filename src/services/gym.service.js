const GymProfile = require('../models/gym-profile.model');

const MAX_SPLIT_DAYS = 10;
const MAX_EXERCISES_PER_DAY = 20;
const MAX_EXERCISE_LOGS = 100;
const MAX_SETS_PER_EXERCISE = 10;
const MAX_RESTRICTIONS = 40;
const MAX_CHAT_HISTORY = 20;
const MAX_WORKOUT_HISTORY = 60;
const MAX_BODY_METRICS_HISTORY = 24;

const VALID_GENDERS = new Set(['male', 'female']);
const VALID_PRIMARY_GOALS = new Set([
  'glute_sculpt',
  'fat_loss',
  'toned_curves',
  'strength_health',
]);
const VALID_MALE_GOALS = new Set([
  'chest_shoulder_3d',
  'lean_abs_cut',
  'mass_bulking',
  'strength_power',
]);
const VALID_EXPERIENCE_LEVELS = new Set(['beginner', 'intermediate', 'advanced']);
const VALID_CYCLE_PHASES = new Set([
  'auto',
  'menstrual',
  'follicular',
  'ovulatory',
  'luteal',
]);
const VALID_RESTRICTION_KINDS = new Set(['dislike', 'injury', 'busy']);

function clampNumber(val, min, max, fallback) {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function computeEstimated1RM(weightKg, reps = 10) {
  const w = Number(weightKg) || 0;
  if (w <= 0) return 0;
  const r = clampNumber(reps, 1, 20, 10);
  if (r <= 1) return Math.round(w * 10) / 10;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

function parseRepsFromNote(repsNote) {
  if (typeof repsNote !== 'string') return 10;
  const match = repsNote.match(/(\d{1,2})\s*(?:reps?|lần)?$/i) || repsNote.match(/×\s*(\d{1,2})/);
  if (match) return clampNumber(Number(match[1]), 1, 30, 10);
  return 10;
}

function sanitizeFemaleBodyProfile(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    gender: VALID_GENDERS.has(src.gender) ? src.gender : 'female',
    nickname: String(src.nickname || 'Challenger').trim().slice(0, 60) || 'Challenger',
    age: clampNumber(src.age, 12, 90, 23),
    heightCm: clampNumber(src.heightCm, 100, 230, 160),
    weightKg: clampNumber(src.weightKg, 30, 200, 50),
    waistCm: clampNumber(src.waistCm, 40, 160, 63),
    hipCm: clampNumber(src.hipCm, 50, 180, 92),
    chestCm: clampNumber(src.chestCm, 50, 180, 96),
    armCm: clampNumber(src.armCm, 15, 70, 34),
    workoutsPerWeek: clampNumber(src.workoutsPerWeek, 1, 7, 4),
    primaryGoal: VALID_PRIMARY_GOALS.has(src.primaryGoal)
      ? src.primaryGoal
      : 'glute_sculpt',
    maleGoal: VALID_MALE_GOALS.has(src.maleGoal)
      ? src.maleGoal
      : 'chest_shoulder_3d',
    experienceLevel: VALID_EXPERIENCE_LEVELS.has(src.experienceLevel)
      ? src.experienceLevel
      : 'beginner',
    avoidHeavyQuads:
      typeof src.avoidHeavyQuads === 'boolean' ? src.avoidHeavyQuads : true,
    protectLowerBackKnee: Boolean(src.protectLowerBackKnee),
    shoulderSafe: Boolean(src.shoulderSafe),
    maleEnergyLevel: clampNumber(src.maleEnergyLevel, 1, 5, 4),
    waterIntakeMlToday: clampNumber(src.waterIntakeMlToday, 0, 10000, 0),
    waterDateKey: String(src.waterDateKey || '').trim().slice(0, 20),
    personalNotes: String(src.personalNotes || '').trim().slice(0, 400),
    updatedAtMs: Number(src.updatedAtMs) || 0,
  };
}

function sanitizeCycleTracking(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const todaySymptoms = Array.isArray(src.todaySymptoms)
    ? src.todaySymptoms
        .filter((s) => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 32))
        .slice(0, 15)
    : [];
  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : true,
    lastPeriodStartDate: String(src.lastPeriodStartDate || '').trim().slice(0, 20),
    cycleLengthDays: clampNumber(src.cycleLengthDays, 15, 60, 28),
    periodDurationDays: clampNumber(src.periodDurationDays, 2, 12, 5),
    manualPhaseOverride: VALID_CYCLE_PHASES.has(src.manualPhaseOverride)
      ? src.manualPhaseOverride
      : 'auto',
    todayEnergyLevel: clampNumber(src.todayEnergyLevel, 1, 5, 4),
    todaySymptoms,
    updatedAtMs: Number(src.updatedAtMs) || 0,
  };
}

function sanitizeExerciseRestrictions(rawList = []) {
  if (!Array.isArray(rawList)) return [];
  const map = new Map();
  for (const item of rawList.slice(0, MAX_RESTRICTIONS)) {
    if (!item || typeof item.exerciseId !== 'string' || !item.exerciseId.trim()) continue;
    const id = item.exerciseId.trim().slice(0, 64);
    const kind = VALID_RESTRICTION_KINDS.has(item.kind) ? item.kind : 'dislike';
    map.set(id, {
      exerciseId: id,
      kind,
      updatedAtMs: Number(item.updatedAtMs) || Date.now(),
    });
  }
  return Array.from(map.values()).slice(0, MAX_RESTRICTIONS);
}

function sanitizeAiChatHistory(rawList = []) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .filter(
      (msg) =>
        msg &&
        (msg.role === 'user' || msg.role === 'assistant') &&
        typeof msg.content === 'string' &&
        msg.content.trim().length > 0
    )
    .slice(-MAX_CHAT_HISTORY)
    .map((msg, idx) => ({
      id: String(msg.id || `msg_${idx}_${Date.now()}`).slice(0, 64),
      role: msg.role,
      content: msg.content.trim().slice(0, 3000),
      createdAtMs: Number(msg.createdAtMs) || Date.now(),
    }));
}

function sanitizeSetDetails(rawSets = []) {
  if (!Array.isArray(rawSets)) return [];
  return rawSets.slice(0, MAX_SETS_PER_EXERCISE).map((item, idx) => ({
    setNumber: clampNumber(item?.setNumber, 0, 12, idx + 1),
    weightKg: clampNumber(item?.weightKg, 0, 1000, 0),
    reps: clampNumber(item?.reps, 0, 200, 10),
    isWarmup: Boolean(item?.isWarmup),
    completed: Boolean(item?.completed),
  }));
}

function sanitizeCompletedSetIndices(rawIndices = []) {
  if (!Array.isArray(rawIndices)) return [];
  const unique = new Set();
  for (const val of rawIndices) {
    const num = Number(val);
    if (Number.isInteger(num) && num >= 0 && num <= 12) {
      unique.add(num);
    }
  }
  return Array.from(unique).sort((a, b) => a - b);
}

const LEGACY_V1_SPLIT_IDS = {
  day1: ['incline_dumbbell_press', 'barbell_bench_press', 'pec_deck_fly', 'cable_crossover'],
  day2: ['wide_lat_pulldown', 'seated_cable_row', 'tricep_rope_pushdown', 'overhead_db_tricep_ext'],
  day3: ['hammer_curl', 'barbell_ez_curl', 'dumbbell_shoulder_press', 'side_lateral_raise'],
  day4: ['barbell_squat', 'leg_press_45', 'romanian_deadlift', 'lying_leg_curl'],
  day5: ['active_mobility_recovery', 'core_plank'],
};

const UPGRADED_REAL_GYM_DAYS = {
  day1: {
    subtitle: 'Máy BRTW Incline & Laydown • Tạ đơn • Pec Fly • Cáp đôi • Xà kép ngực dưới',
    exerciseIds: [
      'brtw_incline_chest_press',
      'brtw_laydown_chest_press',
      'incline_dumbbell_press',
      'barbell_bench_press',
      'pec_deck_fly',
      'cable_crossover',
      'assisted_chest_dip',
    ],
  },
  day2: {
    subtitle: 'Kéo xô BRTW • Máy Impulse Row • Hít xà & Dip trợ lực • Cáp tay sau',
    exerciseIds: [
      'wide_lat_pulldown',
      'iso_high_pulldown',
      'chest_supported_row',
      'brtw_iso_low_row',
      'seated_cable_row',
      'assisted_pullup',
      'tricep_rope_pushdown',
      'assisted_tricep_dip',
      'overhead_db_tricep_ext',
    ],
  },
  day3: {
    subtitle: 'Máy BRTW Biceps Curl • Hammer Curl • Máy Shoulder Press & Lateral Raise • Vai sau',
    exerciseIds: [
      'machine_bicep_curl',
      'hammer_curl',
      'barbell_ez_curl',
      'machine_shoulder_press',
      'smith_shoulder_press',
      'dumbbell_shoulder_press',
      'machine_lateral_raise',
      'side_lateral_raise',
      'reverse_pec_deck',
    ],
  },
  day4: {
    subtitle: 'Super Squat • Leg Press • Đá/Cuốn đùi • Hip Thrust • Mở mông & Ép đùi • Bắp chân',
    exerciseIds: [
      'super_squat_machine',
      'barbell_squat',
      'leg_press_45',
      'leg_extension',
      'seated_leg_curl',
      'lying_leg_curl',
      'machine_hip_thrust',
      'hip_abductor_adductor',
      'hip_adductor_inner',
      'romanian_deadlift',
      'standing_calf_raise',
    ],
  },
  day5: {
    subtitle: 'Giãn cơ phục hồi • Ghế lưng dưới 45° • Core Plank',
    exerciseIds: ['active_mobility_recovery', 'back_extension_45', 'core_plank'],
  },
};

function upgradeUntouchedLegacyDays(days = []) {
  if (!Array.isArray(days)) return { days: [], upgraded: false };
  let upgraded = false;
  const nextDays = days.map((day) => {
    const legacy = LEGACY_V1_SPLIT_IDS[day.id];
    const target = UPGRADED_REAL_GYM_DAYS[day.id];
    const cur = Array.isArray(day.exerciseIds) ? day.exerciseIds : [];
    const isExactLegacy =
      legacy && cur.length === legacy.length && cur.every((id, i) => id === legacy[i]);
    if (isExactLegacy && target) {
      upgraded = true;
      return {
        ...day,
        subtitle: target.subtitle,
        exerciseIds: [...target.exerciseIds],
      };
    }
    return day;
  });
  return { days: nextDays, upgraded };
}

/**
 * Pure sanitizer ensuring bounded arrays and clean primitives before DB persistence.
 */
function sanitizeCustomDays(rawDays) {
  if (!Array.isArray(rawDays)) return [];
  return rawDays.slice(0, MAX_SPLIT_DAYS).map((day, idx) => ({
    id: String(day.id || `day${idx + 1}`).slice(0, 40),
    dayLabel: String(day.dayLabel || `Ngày ${idx + 1}`).slice(0, 30),
    title: String(day.title || 'Buổi tập').slice(0, 80),
    subtitle: String(day.subtitle || '').slice(0, 140),
    isRestDay: Boolean(day.isRestDay),
    exerciseIds: Array.isArray(day.exerciseIds)
      ? day.exerciseIds
          .filter((id) => typeof id === 'string' && id.trim().length > 0)
          .slice(0, MAX_EXERCISES_PER_DAY)
      : [],
  }));
}

function normalizeLogRecord(item, fallbackPrev = null) {
  const key = String(item.exerciseId).trim().slice(0, 64);
  const weightKg = clampNumber(item.weightKg, 0, 1000, 0);
  const repsNote = String(item.repsNote ?? fallbackPrev?.repsNote ?? '').slice(0, 60);
  const personalTip = String(item.personalTip ?? fallbackPrev?.personalTip ?? '').slice(0, 200);
  const seatPinNote = String(item.seatPinNote ?? fallbackPrev?.seatPinNote ?? '').slice(0, 120);
  const setsDetail = Array.isArray(item.setsDetail)
    ? sanitizeSetDetails(item.setsDetail)
    : sanitizeSetDetails(fallbackPrev?.setsDetail || []);
  const setsCompletedToday = Array.isArray(item.setsCompletedToday)
    ? sanitizeCompletedSetIndices(item.setsCompletedToday)
    : sanitizeCompletedSetIndices(fallbackPrev?.setsCompletedToday || []);
  const setsCompletedDateKey = String(
    item.setsCompletedDateKey ?? fallbackPrev?.setsCompletedDateKey ?? ''
  )
    .trim()
    .slice(0, 20);

  let maxSetWeight = 0;
  let maxSet1RM = 0;
  for (const s of setsDetail) {
    if (s.completed && !s.isWarmup && s.weightKg > 0) {
      if (s.weightKg > maxSetWeight) maxSetWeight = s.weightKg;
      const e1rm = computeEstimated1RM(s.weightKg, s.reps || 10);
      if (e1rm > maxSet1RM) maxSet1RM = e1rm;
    }
  }

  const parsedReps = parseRepsFromNote(repsNote);
  const base1RM = computeEstimated1RM(weightKg, parsedReps);

  const personalRecordKg = Math.max(
    clampNumber(fallbackPrev?.personalRecordKg, 0, 1000, 0),
    clampNumber(fallbackPrev?.weightKg, 0, 1000, 0),
    clampNumber(item.personalRecordKg, 0, 1000, 0),
    weightKg,
    maxSetWeight
  );

  const estimated1RM = Math.max(
    clampNumber(fallbackPrev?.estimated1RM, 0, 1500, 0),
    clampNumber(item.estimated1RM, 0, 1500, 0),
    base1RM,
    maxSet1RM
  );

  return {
    exerciseId: key,
    weightKg,
    repsNote,
    personalTip,
    seatPinNote,
    personalRecordKg,
    estimated1RM,
    setsCompletedToday,
    setsCompletedDateKey,
    setsDetail,
    updatedAtMs: Number(item.updatedAtMs) || 0,
  };
}

/**
 * Pure merge of incoming exercise logs with existing DB logs using per-exercise updatedAtMs
 * while preserving lifetime personalRecordKg (PR) even during deload days.
 */
function mergeExerciseLogs(existingLogs = [], incomingLogs = []) {
  const mergedMap = new Map();

  for (const item of existingLogs) {
    if (item && item.exerciseId) {
      const normalized = normalizeLogRecord(item, null);
      mergedMap.set(normalized.exerciseId, normalized);
    }
  }

  if (Array.isArray(incomingLogs)) {
    for (const raw of incomingLogs.slice(0, MAX_EXERCISE_LOGS)) {
      if (!raw || typeof raw.exerciseId !== 'string' || !raw.exerciseId.trim()) continue;
      const key = raw.exerciseId.trim().slice(0, 64);
      const prev = mergedMap.get(key);
      const incomingTs = Number(raw.updatedAtMs) || Date.now();

      if (!prev || incomingTs >= (prev.updatedAtMs || 0)) {
        mergedMap.set(
          key,
          normalizeLogRecord({ ...raw, exerciseId: key, updatedAtMs: incomingTs }, prev)
        );
      } else if (prev) {
        // Even if incoming log is older, never lose a higher historical PR recorded offline
        const incomingPr = Math.max(
          clampNumber(raw.personalRecordKg, 0, 1000, 0),
          clampNumber(raw.weightKg, 0, 1000, 0)
        );
        if (incomingPr > prev.personalRecordKg) {
          prev.personalRecordKg = incomingPr;
          prev.estimated1RM = Math.max(
            prev.estimated1RM,
            computeEstimated1RM(incomingPr, parseRepsFromNote(raw.repsNote))
          );
        }
      }
    }
  }

  return Array.from(mergedMap.values()).slice(0, MAX_EXERCISE_LOGS);
}

function sanitizeWorkoutHistoryEntry(raw, idx = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const dateKey = String(raw.dateKey || '').trim().slice(0, 20);
  if (!dateKey) return null;
  const gender = VALID_GENDERS.has(raw.gender) ? raw.gender : 'female';
  const dayId = String(raw.dayId || 'day1').trim().slice(0, 40);
  const createdAtMs = Number(raw.createdAtMs) || Date.now() - idx;
  const id = String(raw.id || `wh_${dateKey}_${gender}_${dayId}`).trim().slice(0, 64);
  const prHighlights = Array.isArray(raw.prHighlights)
    ? raw.prHighlights
        .filter((s) => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 80))
        .slice(0, 10)
    : [];

  return {
    id,
    dateKey,
    gender,
    dayId,
    dayTitle: String(raw.dayTitle || 'Buổi tập').trim().slice(0, 100),
    durationMinutes: clampNumber(raw.durationMinutes, 1, 360, 45),
    totalVolumeKg: Math.round(clampNumber(raw.totalVolumeKg, 0, 500000, 0)),
    completedExercisesCount: clampNumber(raw.completedExercisesCount, 0, 40, 0),
    caloriesBurned: Math.round(clampNumber(raw.caloriesBurned, 0, 5000, 0)),
    prCount: clampNumber(raw.prCount, 0, 30, prHighlights.length),
    prHighlights,
    createdAtMs,
  };
}

function mergeWorkoutHistory(existingList = [], incomingList = []) {
  const map = new Map();
  const ingest = (list) => {
    if (!Array.isArray(list)) return;
    list.forEach((raw, idx) => {
      const entry = sanitizeWorkoutHistoryEntry(raw, idx);
      if (!entry) return;
      const prev = map.get(entry.id);
      if (!prev || entry.createdAtMs >= prev.createdAtMs) {
        map.set(entry.id, entry);
      }
    });
  };
  ingest(existingList);
  ingest(incomingList);

  return Array.from(map.values())
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, MAX_WORKOUT_HISTORY);
}

function sanitizeBodyMetricEntry(raw, idx = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const dateKey = String(raw.dateKey || '').trim().slice(0, 20);
  if (!dateKey) return null;
  const gender = VALID_GENDERS.has(raw.gender) ? raw.gender : 'female';
  return {
    dateKey,
    gender,
    weightKg: clampNumber(raw.weightKg, 30, 200, 50),
    waistCm: clampNumber(raw.waistCm, 40, 160, 63),
    hipCm: clampNumber(raw.hipCm, 50, 180, 92),
    chestCm: clampNumber(raw.chestCm, 50, 180, 96),
    armCm: clampNumber(raw.armCm, 15, 70, 34),
    createdAtMs: Number(raw.createdAtMs) || Date.now() - idx,
  };
}

function mergeBodyMetricsHistory(existingList = [], incomingList = []) {
  const map = new Map();
  const ingest = (list) => {
    if (!Array.isArray(list)) return;
    list.forEach((raw, idx) => {
      const entry = sanitizeBodyMetricEntry(raw, idx);
      if (!entry) return;
      const key = `${entry.dateKey}_${entry.gender}`;
      const prev = map.get(key);
      if (!prev || entry.createdAtMs >= prev.createdAtMs) {
        map.set(key, entry);
      }
    });
  };
  ingest(existingList);
  ingest(incomingList);

  return Array.from(map.values())
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(-MAX_BODY_METRICS_HISTORY);
}

/**
 * Smart streak updater:
 * - Same dateKey: preserves current streak (at least 1) without double incrementing
 * - Gap 1..3 days: increments streak + 1 (respects scheduled recovery/rest days in 3-5 day splits)
 * - Gap > 3 days: starts fresh at 1
 */
function computeSmartWorkoutStreak(prevStreak = 0, prevDateKey = '', nextDateKey = '') {
  const current = Math.max(0, Number(prevStreak) || 0);
  if (!nextDateKey) return Math.max(1, current);
  if (!prevDateKey) return Math.max(1, current + 1);
  if (prevDateKey === nextDateKey) return Math.max(1, current);

  const prevMs = Date.parse(`${prevDateKey}T00:00:00Z`);
  const nextMs = Date.parse(`${nextDateKey}T00:00:00Z`);
  if (!Number.isFinite(prevMs) || !Number.isFinite(nextMs)) {
    return current + 1;
  }
  const diffDays = Math.round((nextMs - prevMs) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return Math.max(1, current);
  if (diffDays <= 3) return current + 1;
  return 1;
}

function serializeGymProfile(doc) {
  if (!doc) return null;
  return {
    activeDayId: doc.activeDayId || 'day1',
    activeMaleDayId: doc.activeMaleDayId || 'm_session_1',
    activeFemaleDayId: doc.activeFemaleDayId || 'f_session_1',
    completedExerciseIdsToday: doc.completedExerciseIdsToday || [],
    sessionDateKey: doc.sessionDateKey || '',
    workoutStreak: doc.workoutStreak || 0,
    lastCompletedSessionDate: doc.lastCompletedSessionDate || '',
    customDays: doc.customDays || [],
    maleCustomDays: doc.maleCustomDays || [],
    femaleCustomDays: doc.femaleCustomDays || [],
    exerciseLogs: doc.exerciseLogs || [],
    workoutHistory: doc.workoutHistory || [],
    bodyMetricsHistory: doc.bodyMetricsHistory || [],
    userProfile: sanitizeFemaleBodyProfile(doc.userProfile),
    cycleTracking: sanitizeCycleTracking(doc.cycleTracking),
    exerciseRestrictions: doc.exerciseRestrictions || [],
    aiChatHistory: doc.aiChatHistory || [],
    clientUpdatedAt: doc.clientUpdatedAt || 0,
    updatedAt: doc.updatedAt,
  };
}

async function getGymProfileByUserId(userId) {
  const doc = await GymProfile.findOne({ userId });
  if (!doc) return null;

  const { days, upgraded } = upgradeUntouchedLegacyDays(doc.toObject().customDays);
  if (upgraded) {
    doc.customDays = sanitizeCustomDays(days);
    doc.clientUpdatedAt = Date.now();
    await doc.save();
  }
  return serializeGymProfile(doc);
}

async function upsertGymProfileByUserId(userId, payload = {}) {
  const existing = await GymProfile.findOne({ userId });
  const incomingTs = Number(payload.clientUpdatedAt) || Date.now();

  const mergedLogs = mergeExerciseLogs(
    existing ? existing.exerciseLogs : [],
    payload.exerciseLogs
  );
  const mergedWorkoutHistory = mergeWorkoutHistory(
    existing ? existing.workoutHistory : [],
    payload.workoutHistory
  );
  const mergedBodyMetrics = mergeBodyMetricsHistory(
    existing ? existing.bodyMetricsHistory : [],
    payload.bodyMetricsHistory
  );

  const isNewerSessionState = !existing || incomingTs >= (existing.clientUpdatedAt || 0);

  if (!existing) {
    const sanitizedProfile = sanitizeFemaleBodyProfile(payload.userProfile);
    const created = await GymProfile.create({
      userId,
      activeDayId: String(payload.activeDayId || 'day1').slice(0, 40),
      activeMaleDayId: String(payload.activeMaleDayId || 'm_session_1').slice(0, 40),
      activeFemaleDayId: String(payload.activeFemaleDayId || 'f_session_1').slice(0, 40),
      completedExerciseIdsToday: Array.isArray(payload.completedExerciseIdsToday)
        ? payload.completedExerciseIdsToday.slice(0, 30)
        : [],
      sessionDateKey: String(payload.sessionDateKey || '').slice(0, 20),
      workoutStreak: Math.max(0, Number(payload.workoutStreak) || 0),
      lastCompletedSessionDate: String(payload.lastCompletedSessionDate || '').slice(0, 20),
      customDays: sanitizeCustomDays(upgradeUntouchedLegacyDays(payload.customDays).days),
      maleCustomDays: sanitizeCustomDays(payload.maleCustomDays),
      femaleCustomDays: sanitizeCustomDays(payload.femaleCustomDays),
      exerciseLogs: mergedLogs,
      workoutHistory: mergedWorkoutHistory,
      bodyMetricsHistory: mergedBodyMetrics,
      userProfile: sanitizedProfile,
      cycleTracking: sanitizeCycleTracking(payload.cycleTracking),
      exerciseRestrictions: sanitizeExerciseRestrictions(payload.exerciseRestrictions),
      aiChatHistory: sanitizeAiChatHistory(payload.aiChatHistory),
      clientUpdatedAt: incomingTs,
    });
    return serializeGymProfile(created);
  }

  existing.exerciseLogs = mergedLogs;
  existing.workoutHistory = mergedWorkoutHistory;
  existing.bodyMetricsHistory = mergedBodyMetrics;

  // Sub-document timestamp-aware merging for userProfile & cycleTracking
  if (payload.userProfile && typeof payload.userProfile === 'object') {
    const nextProfile = sanitizeFemaleBodyProfile(payload.userProfile);
    const prevProfileTs = Number(existing.userProfile?.updatedAtMs) || 0;
    if ((nextProfile.updatedAtMs || incomingTs) >= prevProfileTs || isNewerSessionState) {
      existing.userProfile = nextProfile;
    }
  }

  if (payload.cycleTracking && typeof payload.cycleTracking === 'object') {
    const nextCycle = sanitizeCycleTracking(payload.cycleTracking);
    const prevCycleTs = Number(existing.cycleTracking?.updatedAtMs) || 0;
    if ((nextCycle.updatedAtMs || incomingTs) >= prevCycleTs || isNewerSessionState) {
      existing.cycleTracking = nextCycle;
    }
  }

  if (isNewerSessionState) {
    if (payload.activeDayId) {
      existing.activeDayId = String(payload.activeDayId).slice(0, 40);
    }
    if (payload.activeMaleDayId) {
      existing.activeMaleDayId = String(payload.activeMaleDayId).slice(0, 40);
    }
    if (payload.activeFemaleDayId) {
      existing.activeFemaleDayId = String(payload.activeFemaleDayId).slice(0, 40);
    }
    if (Array.isArray(payload.completedExerciseIdsToday)) {
      existing.completedExerciseIdsToday = payload.completedExerciseIdsToday
        .filter((id) => typeof id === 'string')
        .slice(0, 30);
    }
    if (typeof payload.sessionDateKey === 'string') {
      existing.sessionDateKey = payload.sessionDateKey.slice(0, 20);
    }
    if (typeof payload.workoutStreak === 'number') {
      existing.workoutStreak = Math.max(existing.workoutStreak || 0, payload.workoutStreak);
    }
    if (typeof payload.lastCompletedSessionDate === 'string' && payload.lastCompletedSessionDate) {
      existing.lastCompletedSessionDate = payload.lastCompletedSessionDate.slice(0, 20);
    }
    if (Array.isArray(payload.customDays) && payload.customDays.length > 0) {
      existing.customDays = sanitizeCustomDays(
        upgradeUntouchedLegacyDays(payload.customDays).days
      );
    }
    if (Array.isArray(payload.maleCustomDays) && payload.maleCustomDays.length > 0) {
      existing.maleCustomDays = sanitizeCustomDays(payload.maleCustomDays);
    }
    if (Array.isArray(payload.femaleCustomDays) && payload.femaleCustomDays.length > 0) {
      existing.femaleCustomDays = sanitizeCustomDays(payload.femaleCustomDays);
    }
    if (Array.isArray(payload.exerciseRestrictions)) {
      existing.exerciseRestrictions = sanitizeExerciseRestrictions(
        payload.exerciseRestrictions
      );
    }
    if (Array.isArray(payload.aiChatHistory)) {
      existing.aiChatHistory = sanitizeAiChatHistory(payload.aiChatHistory);
    }
    existing.clientUpdatedAt = incomingTs;
  }

  await existing.save();
  return serializeGymProfile(existing);
}

/**
 * Atomically records a completed gym session, detects new personal records (PRs),
 * updates smart workoutStreak, and advances the active gender split day.
 */
async function completeWorkoutSessionByUserId(userId, sessionPayload = {}) {
  let doc = await GymProfile.findOne({ userId });
  const nowMs = Date.now();
  const dateKey =
    String(sessionPayload.dateKey || new Date().toISOString().slice(0, 10))
      .trim()
      .slice(0, 20);
  const gender = VALID_GENDERS.has(sessionPayload.gender) ? sessionPayload.gender : 'female';

  const prevPrMap = new Map();
  if (doc && Array.isArray(doc.exerciseLogs)) {
    for (const item of doc.exerciseLogs) {
      prevPrMap.set(
        item.exerciseId,
        Math.max(Number(item.personalRecordKg) || 0, Number(item.weightKg) || 0)
      );
    }
  }

  const mergedLogs = mergeExerciseLogs(
    doc ? doc.exerciseLogs : [],
    sessionPayload.exerciseLogs
  );

  const detectedPrIds = [];
  for (const item of mergedLogs) {
    const oldPr = prevPrMap.get(item.exerciseId) || 0;
    if (oldPr > 0 && item.personalRecordKg > oldPr) {
      detectedPrIds.push(`${item.exerciseId}: ${item.personalRecordKg}kg`);
    }
  }

  const clientHighlights = Array.isArray(sessionPayload.prHighlights)
    ? sessionPayload.prHighlights
        .filter((s) => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 80))
    : [];

  const combinedHighlights = Array.from(new Set([...clientHighlights, ...detectedPrIds])).slice(
    0,
    10
  );

  const sessionEntry = sanitizeWorkoutHistoryEntry({
    id: sessionPayload.id || `wh_${dateKey}_${gender}_${nowMs}`,
    dateKey,
    gender,
    dayId: sessionPayload.dayId || 'day1',
    dayTitle: sessionPayload.dayTitle || 'Buổi tập hoàn thành',
    durationMinutes: sessionPayload.durationMinutes || 45,
    totalVolumeKg: sessionPayload.totalVolumeKg || 0,
    completedExercisesCount: sessionPayload.completedExercisesCount || 0,
    caloriesBurned: sessionPayload.caloriesBurned || 260,
    prCount: Math.max(Number(sessionPayload.prCount) || 0, combinedHighlights.length),
    prHighlights: combinedHighlights,
    createdAtMs: nowMs,
  });

  const nextStreak = computeSmartWorkoutStreak(
    doc ? doc.workoutStreak : 0,
    doc ? doc.lastCompletedSessionDate : '',
    dateKey
  );

  if (!doc) {
    doc = await GymProfile.create({
      userId,
      activeDayId: String(sessionPayload.nextDayId || 'day1').slice(0, 40),
      activeMaleDayId:
        gender === 'male' && sessionPayload.nextDayId
          ? String(sessionPayload.nextDayId).slice(0, 40)
          : 'm_session_1',
      activeFemaleDayId:
        gender === 'female' && sessionPayload.nextDayId
          ? String(sessionPayload.nextDayId).slice(0, 40)
          : 'f_session_1',
      completedExerciseIdsToday: [],
      sessionDateKey: dateKey,
      workoutStreak: nextStreak,
      lastCompletedSessionDate: dateKey,
      exerciseLogs: mergedLogs,
      workoutHistory: sessionEntry ? [sessionEntry] : [],
      clientUpdatedAt: nowMs,
    });
  } else {
    doc.exerciseLogs = mergedLogs;
    doc.workoutHistory = mergeWorkoutHistory(
      doc.workoutHistory,
      sessionEntry ? [sessionEntry] : []
    );
    doc.workoutStreak = nextStreak;
    doc.lastCompletedSessionDate = dateKey;
    doc.sessionDateKey = dateKey;
    doc.completedExerciseIdsToday = [];
    if (sessionPayload.nextDayId) {
      const cleanNext = String(sessionPayload.nextDayId).slice(0, 40);
      doc.activeDayId = cleanNext;
      if (gender === 'male') doc.activeMaleDayId = cleanNext;
      else doc.activeFemaleDayId = cleanNext;
    }
    doc.clientUpdatedAt = nowMs;
    await doc.save();
  }

  return {
    profile: serializeGymProfile(doc),
    sessionEntry,
    newPrHighlights: combinedHighlights,
  };
}

module.exports = {
  computeEstimated1RM,
  computeSmartWorkoutStreak,
  sanitizeCustomDays,
  sanitizeFemaleBodyProfile,
  sanitizeCycleTracking,
  sanitizeExerciseRestrictions,
  sanitizeAiChatHistory,
  mergeExerciseLogs,
  mergeWorkoutHistory,
  mergeBodyMetricsHistory,
  upgradeUntouchedLegacyDays,
  getGymProfileByUserId,
  upsertGymProfileByUserId,
  completeWorkoutSessionByUserId,
};
