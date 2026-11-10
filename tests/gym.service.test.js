const GymProfile = require('../src/models/gym-profile.model');
const {
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
  completeWorkoutSessionByUserId,
} = require('../src/services/gym.service');
const {
  buildGymUserContextBlock,
  buildSystemInstruction,
  buildDeterministicCoachReply,
} = require('../src/services/gym-ai.service');

describe('gym.service & gym-ai.service pure helpers & v2 features', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('upgrades untouched legacy 4-exercise days to full BRTW/Impulse gym machines while preserving custom days', () => {
    const input = [
      {
        id: 'day1',
        dayLabel: 'Ngày 1',
        title: 'Ngực',
        subtitle: 'Ngực trên',
        exerciseIds: [
          'incline_dumbbell_press',
          'barbell_bench_press',
          'pec_deck_fly',
          'cable_crossover',
        ],
      },
      {
        id: 'day3',
        dayLabel: 'Ngày 3',
        title: 'Custom',
        subtitle: 'Custom',
        exerciseIds: ['hammer_curl'],
      },
    ];

    const { days, upgraded } = upgradeUntouchedLegacyDays(input);
    expect(upgraded).toBe(true);
    expect(days[0].exerciseIds).toContain('brtw_incline_chest_press');
    expect(days[0].exerciseIds).toContain('assisted_chest_dip');
    expect(days[1].exerciseIds).toEqual(['hammer_curl']);
  });

  it('sanitizes custom days and merges exercise logs keeping latest updatedAtMs while preserving lifetime PR', () => {
    const sanitized = sanitizeCustomDays([
      { id: 'day1', dayLabel: 'Ngày 1', title: 'Ngực', exerciseIds: ['hammer_curl', ''] },
    ]);
    expect(sanitized[0].exerciseIds).toEqual(['hammer_curl']);

    const merged = mergeExerciseLogs(
      [
        {
          exerciseId: 'machine_hip_thrust',
          weightKg: 45,
          personalRecordKg: 45,
          seatPinNote: 'Ghế nấc 3',
          updatedAtMs: 100,
        },
      ],
      [
        {
          // Menstrual deload day: weight lowered to 35kg, but lifetime PR 45kg MUST remain intact!
          exerciseId: 'machine_hip_thrust',
          weightKg: 35,
          repsNote: '4 hiệp × 12',
          setsCompletedToday: [1, 2, 3],
          setsDetail: [
            { setNumber: 1, weightKg: 35, reps: 12, completed: true },
            { setNumber: 2, weightKg: 35, reps: 12, completed: true },
          ],
          updatedAtMs: 200,
        },
      ]
    );
    expect(merged[0].weightKg).toBe(35);
    expect(merged[0].personalRecordKg).toBe(45);
    expect(merged[0].seatPinNote).toBe('Ghế nấc 3');
    expect(merged[0].setsCompletedToday).toEqual([1, 2, 3]);
    expect(merged[0].setsDetail).toHaveLength(2);
    expect(merged[0].estimated1RM).toBeGreaterThanOrEqual(45);
  });

  it('computes Epley 1RM and smart workout streak across recovery days accurately', () => {
    expect(computeEstimated1RM(0, 10)).toBe(0);
    expect(computeEstimated1RM(60, 10)).toBe(80); // 60 * (1 + 10/30) = 80

    // Same day completion should not double-increment streak
    expect(computeSmartWorkoutStreak(4, '2026-11-10', '2026-11-10')).toBe(4);
    // 1-2 rest days in between keeps streak growing
    expect(computeSmartWorkoutStreak(4, '2026-11-08', '2026-11-10')).toBe(5);
    // Gap > 3 days resets streak to 1
    expect(computeSmartWorkoutStreak(7, '2026-11-01', '2026-11-10')).toBe(1);
  });

  it('merges workoutHistory and bodyMetricsHistory with deduplication and strict bounds', () => {
    const history = mergeWorkoutHistory(
      [
        {
          id: 's1',
          dateKey: '2026-11-09',
          gender: 'female',
          dayTitle: 'Buổi 1: Mông',
          totalVolumeKg: 3200,
          createdAtMs: 1000,
        },
      ],
      [
        {
          id: 's2',
          dateKey: '2026-11-10',
          gender: 'female',
          dayTitle: 'Buổi 2: Lưng Eo',
          totalVolumeKg: 2800,
          prCount: 1,
          prHighlights: ['Hip Thrust: 50kg'],
          createdAtMs: 2000,
        },
      ]
    );
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe('s2'); // Newest first
    expect(history[0].prHighlights).toEqual(['Hip Thrust: 50kg']);

    const metrics = mergeBodyMetricsHistory(
      [{ dateKey: '2026-11-01', gender: 'female', weightKg: 51, waistCm: 64, hipCm: 91, createdAtMs: 10 }],
      [
        { dateKey: '2026-11-01', gender: 'female', weightKg: 50.5, waistCm: 63.5, hipCm: 91.5, createdAtMs: 20 },
        { dateKey: '2026-11-10', gender: 'female', weightKg: 50, waistCm: 62.5, hipCm: 93, createdAtMs: 30 },
      ]
    );
    expect(metrics).toHaveLength(2);
    expect(metrics[0].weightKg).toBe(50.5);
    expect(metrics[1].hipCm).toBe(93);
  });

  it('completes workout session, detects new PRs, advances gender day and increments streak', async () => {
    const fakeSave = jest.fn().mockResolvedValue(true);
    const existingDoc = {
      activeDayId: 'm_session_1',
      activeMaleDayId: 'm_session_1',
      activeFemaleDayId: 'f_session_1',
      workoutStreak: 3,
      lastCompletedSessionDate: '2026-11-09',
      exerciseLogs: [
        {
          exerciseId: 'brtw_incline_chest_press',
          weightKg: 30,
          personalRecordKg: 30,
          updatedAtMs: 100,
        },
      ],
      workoutHistory: [],
      bodyMetricsHistory: [],
      userProfile: { gender: 'male', nickname: 'Minh Tuấn' },
      cycleTracking: {},
      save: fakeSave,
    };
    jest.spyOn(GymProfile, 'findOne').mockResolvedValue(existingDoc);

    const result = await completeWorkoutSessionByUserId('user_123', {
      dateKey: '2026-11-11',
      gender: 'male',
      dayId: 'm_session_1',
      dayTitle: 'Buổi 1: Ngực Dày & Vai 3D',
      nextDayId: 'm_session_2',
      durationMinutes: 55,
      totalVolumeKg: 5400,
      completedExercisesCount: 5,
      caloriesBurned: 340,
      exerciseLogs: [
        {
          exerciseId: 'brtw_incline_chest_press',
          weightKg: 35,
          updatedAtMs: 500,
        },
      ],
    });

    expect(fakeSave).toHaveBeenCalledTimes(1);
    expect(result.profile.workoutStreak).toBe(4);
    expect(result.profile.activeMaleDayId).toBe('m_session_2');
    expect(result.profile.activeFemaleDayId).toBe('f_session_1'); // Untouched!
    expect(result.newPrHighlights).toContain('brtw_incline_chest_press: 35kg');
    expect(result.profile.workoutHistory[0].totalVolumeKg).toBe(5400);
  });

  it('sanitizes female body profile, cycle tracking, restrictions and chat history safely', () => {
    const profile = sanitizeFemaleBodyProfile({
      nickname: '  Quỳnh Anh  ',
      age: 24,
      heightCm: 162,
      weightKg: 49,
      waistCm: 61,
      hipCm: 93,
      primaryGoal: 'glute_sculpt',
      avoidHeavyQuads: true,
      shoulderSafe: true,
      maleEnergyLevel: 5,
      waterIntakeMlToday: 1500,
    });
    expect(profile.nickname).toBe('Quỳnh Anh');
    expect(profile.heightCm).toBe(162);
    expect(profile.hipCm).toBe(93);
    expect(profile.primaryGoal).toBe('glute_sculpt');
    expect(profile.shoulderSafe).toBe(true);
    expect(profile.waterIntakeMlToday).toBe(1500);

    const cycle = sanitizeCycleTracking({
      enabled: true,
      cycleLengthDays: 29,
      periodDurationDays: 5,
      manualPhaseOverride: 'menstrual',
      todayEnergyLevel: 2,
      todaySymptoms: ['cramps', 'back_pain', ''],
    });
    expect(cycle.manualPhaseOverride).toBe('menstrual');
    expect(cycle.todayEnergyLevel).toBe(2);
    expect(cycle.todaySymptoms).toEqual(['cramps', 'back_pain']);

    const restrictions = sanitizeExerciseRestrictions([
      { exerciseId: 'barbell_squat', kind: 'injury', updatedAtMs: 500 },
      { exerciseId: '', kind: 'dislike' },
    ]);
    expect(restrictions).toHaveLength(1);
    expect(restrictions[0].exerciseId).toBe('barbell_squat');
    expect(restrictions[0].kind).toBe('injury');

    const chat = sanitizeAiChatHistory([
      { id: '1', role: 'user', content: 'Hôm nay tập gì?' },
      { id: '2', role: 'invalid', content: 'Ignored' },
    ]);
    expect(chat).toHaveLength(1);
    expect(chat[0].role).toBe('user');
  });

  it('builds rich Vietnamese user context block and deterministic coach reply with exact user metrics', () => {
    const snapshot = {
      userProfile: {
        nickname: 'Quỳnh Anh',
        age: 24,
        heightCm: 162,
        weightKg: 50,
        waistCm: 62,
        hipCm: 94,
        primaryGoal: 'glute_sculpt',
        avoidHeavyQuads: true,
      },
      cycleTracking: {
        enabled: true,
        manualPhaseOverride: 'menstrual',
        todayEnergyLevel: 2,
        todaySymptoms: ['cramps', 'back_pain'],
      },
      resolvedCyclePhase: 'menstrual',
      activeDayTitle: 'Ngày 4: Thân dưới & Mông',
      currentExerciseName: 'BRTW Hip Thrust Machine',
      workoutStreak: 7,
    };

    const contextBlock = buildGymUserContextBlock(snapshot);
    expect(contextBlock).toContain('Quỳnh Anh');
    expect(contextBlock).toContain('162cm');
    expect(contextBlock).toContain('62cm');
    expect(contextBlock).toContain('94cm');
    expect(contextBlock).toContain('Pha Hành Kinh');

    const fallbackReply = buildDeterministicCoachReply('Hôm nay nên tập mức tạ nào?', snapshot);
    expect(fallbackReply).toContain('Quỳnh Anh');
    expect(fallbackReply).toContain('Deload');
    expect(fallbackReply).toContain('Hip Thrust');
  });

  it('supports male gender profile (/gym/nam) with chest/arm measurements, full BRTW machines, and ZERO menstrual leak', () => {
    const maleProfile = sanitizeFemaleBodyProfile({
      gender: 'male',
      nickname: 'Minh Tuấn',
      heightCm: 175,
      weightKg: 70,
      chestCm: 100,
      waistCm: 76,
      armCm: 37,
      workoutsPerWeek: 5,
      maleGoal: 'chest_shoulder_3d',
      maleEnergyLevel: 2,
      shoulderSafe: true,
    });
    expect(maleProfile.gender).toBe('male');
    expect(maleProfile.chestCm).toBe(100);
    expect(maleProfile.armCm).toBe(37);
    expect(maleProfile.maleGoal).toBe('chest_shoulder_3d');

    const maleContext = buildGymUserContextBlock({
      userProfile: maleProfile,
      // Even if stale cycle state exists in localStorage, male context must NEVER mention menstrual phases!
      cycleTracking: { manualPhaseOverride: 'menstrual', todaySymptoms: ['cramps'] },
      resolvedCyclePhase: 'menstrual',
      prSummary: ['BRTW Incline Press: 35kg (1RM 46.7kg)'],
    });
    expect(maleContext).toContain('Nam giới (/gym/nam)');
    expect(maleContext).toContain('Vòng ngực 100cm');
    expect(maleContext).toContain('Bắp tay 37cm');
    expect(maleContext).toContain('Cần bảo vệ khớp vai trước');
    expect(maleContext).toContain('BRTW Incline Press: 35kg');
    expect(maleContext).not.toContain('Pha Hành Kinh');
    expect(maleContext).not.toContain('Đau bụng dưới');

    const maleSystem = buildSystemInstruction({ userProfile: maleProfile });
    expect(maleSystem).toContain('brtw_incline_chest_press');
    expect(maleSystem).toContain('machine_bicep_curl');
    expect(maleSystem).toContain('machine_shoulder_press');

    const maleFallback = buildDeterministicCoachReply('Hôm nay hơi mệt nên tập sao?', {
      userProfile: maleProfile,
    });
    expect(maleFallback).toContain('10% mức tạ');
    expect(maleFallback).toContain('phở bò tái nạc');
  });
});
