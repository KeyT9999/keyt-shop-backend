const GymProfile = require('../models/gym-profile.model');

const MAX_SPLIT_DAYS = 10;
const MAX_EXERCISES_PER_DAY = 20;
const MAX_EXERCISE_LOGS = 100;
const MAX_RESTRICTIONS = 40;
const MAX_CHAT_HISTORY = 20;

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

/**
 * Pure merge of incoming exercise logs with existing DB logs using per-exercise updatedAtMs
 * so offline logs recorded on a phone at the gym are never overwritten by stale browser tabs.
 */
function mergeExerciseLogs(existingLogs = [], incomingLogs = []) {
  const mergedMap = new Map();

  for (const item of existingLogs) {
    if (item && item.exerciseId) {
      mergedMap.set(item.exerciseId, {
        exerciseId: String(item.exerciseId).slice(0, 64),
        weightKg: Math.max(0, Math.min(1000, Number(item.weightKg) || 0)),
        repsNote: String(item.repsNote || '').slice(0, 60),
        personalTip: String(item.personalTip || '').slice(0, 200),
        updatedAtMs: Number(item.updatedAtMs) || 0,
      });
    }
  }

  if (Array.isArray(incomingLogs)) {
    for (const raw of incomingLogs.slice(0, MAX_EXERCISE_LOGS)) {
      if (!raw || typeof raw.exerciseId !== 'string' || !raw.exerciseId.trim()) continue;
      const key = raw.exerciseId.trim().slice(0, 64);
      const prev = mergedMap.get(key);
      const incomingTs = Number(raw.updatedAtMs) || Date.now();

      if (!prev || incomingTs >= (prev.updatedAtMs || 0)) {
        mergedMap.set(key, {
          exerciseId: key,
          weightKg: Math.max(0, Math.min(1000, Number(raw.weightKg) || 0)),
          repsNote: String(raw.repsNote || '').slice(0, 60),
          personalTip: String(raw.personalTip || '').slice(0, 200),
          updatedAtMs: incomingTs,
        });
      }
    }
  }

  return Array.from(mergedMap.values()).slice(0, MAX_EXERCISE_LOGS);
}

function serializeGymProfile(doc) {
  if (!doc) return null;
  return {
    activeDayId: doc.activeDayId || 'day1',
    completedExerciseIdsToday: doc.completedExerciseIdsToday || [],
    sessionDateKey: doc.sessionDateKey || '',
    workoutStreak: doc.workoutStreak || 0,
    lastCompletedSessionDate: doc.lastCompletedSessionDate || '',
    customDays: doc.customDays || [],
    exerciseLogs: doc.exerciseLogs || [],
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

async function upsertGymProfileByUserId(userId, payload) {
  const existing = await GymProfile.findOne({ userId });
  const incomingTs = Number(payload.clientUpdatedAt) || Date.now();

  const mergedLogs = mergeExerciseLogs(
    existing ? existing.exerciseLogs : [],
    payload.exerciseLogs
  );

  // Only overwrite schedule & active session state if incoming client timestamp is newer or equal
  const isNewerSessionState = !existing || incomingTs >= (existing.clientUpdatedAt || 0);

  if (!existing) {
    const created = await GymProfile.create({
      userId,
      activeDayId: String(payload.activeDayId || 'day1').slice(0, 40),
      completedExerciseIdsToday: Array.isArray(payload.completedExerciseIdsToday)
        ? payload.completedExerciseIdsToday.slice(0, 30)
        : [],
      sessionDateKey: String(payload.sessionDateKey || '').slice(0, 20),
      workoutStreak: Math.max(0, Number(payload.workoutStreak) || 0),
      lastCompletedSessionDate: String(payload.lastCompletedSessionDate || '').slice(0, 20),
      customDays: sanitizeCustomDays(upgradeUntouchedLegacyDays(payload.customDays).days),
      exerciseLogs: mergedLogs,
      userProfile: sanitizeFemaleBodyProfile(payload.userProfile),
      cycleTracking: sanitizeCycleTracking(payload.cycleTracking),
      exerciseRestrictions: sanitizeExerciseRestrictions(payload.exerciseRestrictions),
      aiChatHistory: sanitizeAiChatHistory(payload.aiChatHistory),
      clientUpdatedAt: incomingTs,
    });
    return serializeGymProfile(created);
  }

  existing.exerciseLogs = mergedLogs;
  if (isNewerSessionState) {
    if (payload.activeDayId) {
      existing.activeDayId = String(payload.activeDayId).slice(0, 40);
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
    if (payload.userProfile && typeof payload.userProfile === 'object') {
      existing.userProfile = sanitizeFemaleBodyProfile(payload.userProfile);
    }
    if (payload.cycleTracking && typeof payload.cycleTracking === 'object') {
      existing.cycleTracking = sanitizeCycleTracking(payload.cycleTracking);
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

module.exports = {
  sanitizeCustomDays,
  sanitizeFemaleBodyProfile,
  sanitizeCycleTracking,
  sanitizeExerciseRestrictions,
  sanitizeAiChatHistory,
  mergeExerciseLogs,
  upgradeUntouchedLegacyDays,
  getGymProfileByUserId,
  upsertGymProfileByUserId,
};
