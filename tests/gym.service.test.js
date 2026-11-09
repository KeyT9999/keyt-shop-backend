const {
  sanitizeCustomDays,
  sanitizeFemaleBodyProfile,
  sanitizeCycleTracking,
  sanitizeExerciseRestrictions,
  sanitizeAiChatHistory,
  mergeExerciseLogs,
  upgradeUntouchedLegacyDays,
} = require('../src/services/gym.service');
const {
  buildGymUserContextBlock,
  buildDeterministicCoachReply,
} = require('../src/services/gym-ai.service');

describe('gym.service & gym-ai.service pure helpers', () => {
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

  it('sanitizes custom days and merges exercise logs keeping latest updatedAtMs', () => {
    const sanitized = sanitizeCustomDays([
      { id: 'day1', dayLabel: 'Ngày 1', title: 'Ngực', exerciseIds: ['hammer_curl', ''] },
    ]);
    expect(sanitized[0].exerciseIds).toEqual(['hammer_curl']);

    const merged = mergeExerciseLogs(
      [{ exerciseId: 'hammer_curl', weightKg: 10, updatedAtMs: 100 }],
      [{ exerciseId: 'hammer_curl', weightKg: 14, updatedAtMs: 200 }]
    );
    expect(merged[0].weightKg).toBe(14);
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
    });
    expect(profile.nickname).toBe('Quỳnh Anh');
    expect(profile.heightCm).toBe(162);
    expect(profile.hipCm).toBe(93);
    expect(profile.primaryGoal).toBe('glute_sculpt');

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
});
