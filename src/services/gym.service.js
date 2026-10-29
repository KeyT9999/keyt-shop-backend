const GymProfile = require('../models/gym-profile.model');

const MAX_SPLIT_DAYS = 10;
const MAX_EXERCISES_PER_DAY = 20;
const MAX_EXERCISE_LOGS = 100;

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
  const doc = await GymProfile.findOne({ userId }).lean();
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
      customDays: sanitizeCustomDays(payload.customDays),
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
      existing.customDays = sanitizeCustomDays(payload.customDays);
    }
    existing.clientUpdatedAt = incomingTs;
  }

  await existing.save();
  return serializeGymProfile(existing);
}

module.exports = {
  sanitizeCustomDays,
  mergeExerciseLogs,
  getGymProfileByUserId,
  upsertGymProfileByUserId,
};
