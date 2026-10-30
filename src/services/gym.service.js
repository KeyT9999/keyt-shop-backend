const GymProfile = require('../models/gym-profile.model');

const MAX_SPLIT_DAYS = 10;
const MAX_EXERCISES_PER_DAY = 20;
const MAX_EXERCISE_LOGS = 100;

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
    existing.clientUpdatedAt = incomingTs;
  }

  await existing.save();
  return serializeGymProfile(existing);
}

module.exports = {
  sanitizeCustomDays,
  mergeExerciseLogs,
  upgradeUntouchedLegacyDays,
  getGymProfileByUserId,
  upsertGymProfileByUserId,
};
