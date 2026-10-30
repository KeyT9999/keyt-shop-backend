const {
  sanitizeCustomDays,
  mergeExerciseLogs,
  upgradeUntouchedLegacyDays,
} = require('../src/services/gym.service');

describe('gym.service pure helpers', () => {
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
});
