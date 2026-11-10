/**
 * KeyT Gym 3D Coach — Personal AI Trainer Service (Male V-Taper & Female Cycle-Aware)
 * Multi-provider failover (DeepSeek -> SiliconFlow -> xKiro) with intelligent rule-based fallback.
 */

const GOAL_LABELS_VI = {
  glute_sculpt: 'Độ mông đào căng tròn & hạn chế to đùi trước (Glute Sculpt)',
  fat_loss: 'Đốt mỡ toàn thân & siết vòng eo con kiến (Fat Loss & Core)',
  toned_curves: 'Săn chắc đường cong S-Line & cải thiện tư thế (Toned Curves)',
  strength_health: 'Tăng thể lực, sức bền & sức khỏe nội tiết (Strength & Wellness)',
  chest_shoulder_3d: 'Ngực dày vuông, Vai 3D rộng & Lưng chữ V nam tính (V-Taper Hypertrophy)',
  lean_abs_cut: 'Siết mỡ khô nét & Lộ cơ bụng 6 múi (Cutting & Shred)',
  mass_bulking: 'Tăng cân tăng cơ thoát gầy (Clean Mass Bulking)',
  strength_power: 'Tăng sức mạnh tối đa & Nội tiết nam Testosterone (Strength & Power)',
};

const PHASE_LABELS_VI = {
  menstrual: 'Pha Hành Kinh (Kỳ Dâu — Nên giảm 15-20% mức tạ, tránh ép bụng/lưng dưới nặng)',
  follicular: 'Pha Nang Trứng (Năng lượng tăng cao — Thời điểm vàng tăng mức tạ & tập bài mông/đùi)',
  ovulatory: 'Pha Rụng Trứng (Đỉnh sức mạnh — Có thể phá kỷ lục mức tạ nhưng chú ý khởi động kỹ khớp gối)',
  luteal: 'Pha Hoàng Thể / PMS (Dễ giữ nước, nhanh mệt — Ưu tiên tạ vừa phải, số rep 12-15 và giãn cơ)',
};

const SYMPTOM_LABELS_VI = {
  cramps: 'Đau bụng dưới / co thắt',
  back_pain: 'Mỏi / đau lưng dưới',
  bloating: 'Đầy hơi / giữ nước',
  fatigue: 'Uể oải / thiếu năng lượng',
  headache: 'Đau đầu',
  cravings: 'Thèm đồ ngọt / tinh bột',
  low_mood: 'Tụt mood / nhạy cảm',
};

const GYM_CATALOG_SUMMARY = [
  // Thân trên - Ngực (Chest)
  'brtw_incline_chest_press (Máy đẩy ngực trên BRTW Incline Chest Press lắp tạ bánh - Làm đầy rãnh ngực trên, an toàn khớp vai)',
  'brtw_laydown_chest_press (Máy nằm đẩy ngực ngang BRTW Laydown Press - Bơm dày toàn bộ cơ ngực)',
  'incline_dumbbell_press (Đẩy ngực trên tạ đơn ghế dốc 30 độ - Cân bằng lực 2 tay & săn chắc vòng 1)',
  'barbell_bench_press (Đẩy ngực ngang thanh đòn Bench Press - Bài đa khớp kinh điển tăng sức mạnh)',
  'pec_deck_fly (Máy ép ngực cánh bướm Pec Fly - Cô lập rãnh ngực trong)',
  'cable_crossover (Kéo cáp đôi ép ngực dưới & trong Cable Crossover)',
  'assisted_chest_dip (Xà kép ngực dưới có trợ lực gối quỳ Assisted Chest Dip)',
  // Thân trên - Lưng Xô (Back & Lats)
  'wide_lat_pulldown (Kéo xô rộng tay Lat Pulldown - Mở rộng lưng chữ V giúp eo trông nhỏ hơn)',
  'iso_high_pulldown (Máy kéo xô độc lập từng bên BRTW Iso High Pulldown)',
  'chest_supported_row (Máy kéo lưng tựa ngực Impulse Row - Dày lưng giữa, không áp lực lưng dưới)',
  'brtw_iso_low_row (Máy chèo lưng dưới BRTW Iso Low Row lắp tạ bánh - Làm dày xô dưới)',
  'seated_cable_row (Ngồi kéo cáp lưng giữa Seated Cable Row)',
  'assisted_pullup (Máy hít xà đơn trợ lực gối quỳ Assisted Pull-up)',
  // Thân trên - Vai & Tay (Shoulders & Arms)
  'machine_shoulder_press (Máy đẩy vai ngồi BRTW Shoulder Press - Xây dựng cầu vai trước/giữa an toàn)',
  'smith_shoulder_press (Đẩy vai trên khung trượt Smith Machine)',
  'dumbbell_shoulder_press (Ngồi đẩy vai tạ đơn Dumbbell Shoulder Press)',
  'machine_lateral_raise (Máy bay vai giữa Seated Lateral Raise - Tạo bờ vai 3D / vai mắc áo)',
  'side_lateral_raise (Bay vai tạ đơn Side Lateral Raise)',
  'reverse_pec_deck (Máy ép vai sau Reverse Pec Deck - Dày vai sau, chống gù lưng mở vai)',
  'machine_bicep_curl (Máy cuốn tay trước tì khuỷu BRTW Bicep Curl - Cô lập đỉnh chuột Biceps)',
  'hammer_curl (Cuốn tạ đơn búa Hammer Curl - Làm dày tay trước & cẳng tay)',
  'barbell_ez_curl (Cuốn thanh đòn cong EZ-Bar Curl)',
  'tricep_rope_pushdown (Kéo cáp dây thừng tay sau Tricep Rope Pushdown - Nét móng ngựa / thon bắp tay)',
  'assisted_tricep_dip (Nhún xà kép tay sau trợ lực Assisted Tricep Dip)',
  'overhead_db_tricep_ext (Đưa tạ đơn qua đầu tập đầu dài tay sau)',
  // Thân dưới - Mông, Đùi & Core (Glutes, Legs & Core)
  'machine_hip_thrust (Máy đẩy hông Hip Thrust BRTW - Vua độ mông căng tròn không to đùi trước)',
  'hip_abductor_adductor (Máy mở mông ngang Hip Abductor - Làm đầy hõm mông hai bên)',
  'hip_adductor_inner (Máy ép đùi trong Hip Adductor - Săn gọn đùi trong)',
  'romanian_deadlift (Romanian Deadlift tạ đòn/tạ đơn - Kéo giãn mông dưới & đùi sau)',
  'seated_leg_curl (Máy ngồi gập đùi sau Seated Leg Curl - Cô lập đùi sau an toàn lưng)',
  'lying_leg_curl (Máy nằm cuốn đùi sau Lying Leg Curl)',
  'leg_press_45 (Máy đạp đùi 45 độ Leg Press - Đặt chân cao ăn mông, đặt chân thấp ăn đùi trước)',
  'super_squat_machine (Máy gánh đùi tựa lưng BRTW Super Squat)',
  'barbell_squat (Gánh đùi khung trượt Smith BRTW)',
  'leg_extension (Máy đá đùi trước Leg Extension - Cắt nét cơ tứ đầu đùi)',
  'standing_calf_raise (Nhón bắp chân trên máy Standing Calf Raise)',
  'back_extension_45 (Ghế tập lưng dưới & mông trên 45 độ)',
  'core_plank (Plank siết cơ bụng sâu Core Transverse)',
  'active_mobility_recovery (Giãn cơ mở khớp hông, vai & cột sống - Phục hồi linh hoạt)',
].join('\n- ');

function getAiProviders() {
  const providers = [];

  const deepseekKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  if (deepseekKey) {
    const base = (process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com').replace(/\/+$/, '');
    providers.push({
      name: 'DeepSeek',
      endpoint: `${base}/chat/completions`,
      apiKey: deepseekKey,
      model: (process.env.DEEPSEEK_MODEL || 'deepseek-chat').trim(),
    });
  }

  const siliconKey = (process.env.SILICONFLOW_API_KEY || '').trim();
  if (siliconKey) {
    const base = (process.env.SILICONFLOW_API_BASE || 'https://api.siliconflow.com/v1').replace(
      /\/+$/,
      ''
    );
    providers.push({
      name: 'SiliconFlow',
      endpoint: `${base}/chat/completions`,
      apiKey: siliconKey,
      model: (process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-V3').trim(),
    });
  }

  const xkiroKey = (process.env.XKIRO_API_KEY || '').trim();
  if (xkiroKey) {
    const base = (process.env.XKIRO_API_BASE || 'https://api.xkiro.com/v1').replace(/\/+$/, '');
    providers.push({
      name: 'xKiro',
      endpoint: `${base}/chat/completions`,
      apiKey: xkiroKey,
      model: (process.env.XKIRO_MODEL || 'cohere/command-a').trim(),
    });
  }

  return providers;
}

/**
 * Pure builder that formats user profile, gender-specific readiness/cycle, workout split,
 * personal records (PRs), seat settings, and recent volume into a structured Vietnamese context.
 */
function buildGymUserContextBlock(snapshot = {}) {
  const profile = snapshot.userProfile || {};
  const cycle = snapshot.cycleTracking || {};
  const activeDayTitle = snapshot.activeDayTitle || 'Buổi tập hôm nay';
  const currentExerciseName = snapshot.currentExerciseName || 'Chưa chọn';
  const streak = Number(snapshot.workoutStreak) || 0;

  const isMale = profile.gender === 'male';
  const heightCm = Number(profile.heightCm) || (isMale ? 172 : 160);
  const weightKg = Number(profile.weightKg) || (isMale ? 68 : 50);
  const heightM = heightCm / 100;
  const bmi = heightM > 0 ? (weightKg / (heightM * heightM)).toFixed(1) : '20.0';
  const waistCm = Number(profile.waistCm) || (isMale ? 78 : 63);
  const hipCm = Number(profile.hipCm) || 92;
  const chestCm = Number(profile.chestCm) || 96;
  const armCm = Number(profile.armCm) || 35;
  const whr = hipCm > 0 ? (waistCm / hipCm).toFixed(2) : '0.68';

  const activeGoalKey = isMale
    ? profile.maleGoal || 'chest_shoulder_3d'
    : profile.primaryGoal || 'glute_sculpt';
  const goalLabel = GOAL_LABELS_VI[activeGoalKey] || GOAL_LABELS_VI.glute_sculpt;

  const phaseKey = snapshot.resolvedCyclePhase || cycle.manualPhaseOverride || 'follicular';
  const phaseLabel = PHASE_LABELS_VI[phaseKey] || PHASE_LABELS_VI.follicular;
  const symptomsList = Array.isArray(cycle.todaySymptoms)
    ? cycle.todaySymptoms.map((s) => SYMPTOM_LABELS_VI[s] || s).join(', ')
    : '';

  const energyLevel = isMale
    ? Number(profile.maleEnergyLevel || cycle.todayEnergyLevel) || 4
    : Number(cycle.todayEnergyLevel) || 4;

  const jointNotes = [];
  if (profile.protectLowerBackKnee) jointNotes.push('Cần bảo vệ lưng dưới & khớp gối');
  if (profile.shoulderSafe) jointNotes.push('Cần bảo vệ khớp vai trước (tránh ép sâu quá 90°)');

  const logsSummary = Array.isArray(snapshot.exerciseLogsSummary)
    ? snapshot.exerciseLogsSummary.slice(0, 15).join('; ')
    : 'Chưa có nhiều lịch sử mức tạ';

  const prSummary = Array.isArray(snapshot.prSummary) && snapshot.prSummary.length > 0
    ? snapshot.prSummary.slice(0, 8).join('; ')
    : '';

  const recentWorkoutSummary =
    typeof snapshot.recentWorkoutSummary === 'string' && snapshot.recentWorkoutSummary.trim()
      ? snapshot.recentWorkoutSummary.trim().slice(0, 300)
      : '';

  const splitSummary = Array.isArray(snapshot.customDaysSummary)
    ? snapshot.customDaysSummary.slice(0, 7).join('\n  • ')
    : 'Lịch tập tiêu chuẩn tại phòng máy BRTW/Impulse';

  return [
    `=== HỒ SƠ CÁ NHÂN CỦA HỌC VIÊN ===`,
    `- Giới tính: ${isMale ? 'Nam giới (/gym/nam)' : 'Nữ giới (/gym/nu)'}`,
    `- Tên/Biệt danh: ${profile.nickname || 'Challenger'} (${profile.age || 23} tuổi)`,
    `- Chỉ số hình thể: Cao ${heightCm}cm • Nặng ${weightKg}kg (BMI: ${bmi})`,
    isMale
      ? `- Số đo Nam Giới: Vòng ngực ${chestCm}cm • Vòng bụng ${waistCm}cm • Bắp tay ${armCm}cm`
      : `- Số đo Eo / Mông: Vòng eo ${waistCm}cm • Vòng mông ${hipCm}cm (Tỷ lệ Eo/Mông WHR: ${whr})`,
    `- Mục tiêu ưu tiên: ${goalLabel}`,
    `- Kinh nghiệm tập: ${profile.experienceLevel || 'beginner'} (${profile.workoutsPerWeek || 4} buổi/tuần)`,
    !isMale
      ? `- Ưu tiên cơ học Nữ: ${profile.avoidHeavyQuads !== false ? 'CÓ ưu tiên độ mông & hạn chế to đùi trước' : 'Phát triển đều thân dưới'}`
      : null,
    jointNotes.length > 0 ? `- Lưu ý bảo vệ khớp: ${jointNotes.join(' | ')}` : null,
    profile.waterIntakeMlToday
      ? `- Lượng nước đã uống hôm nay: ${profile.waterIntakeMlToday}ml`
      : null,
    profile.personalNotes ? `- Ghi chú cá nhân: ${profile.personalNotes}` : null,
    ``,
    `=== TRẠNG THÁI & SỨC SUNG HÔM NAY ===`,
    !isMale ? `- Theo dõi chu kỳ: ${cycle.enabled !== false ? 'Đang bật' : 'Tắt'}` : null,
    !isMale ? `- Pha chu kỳ hiện tại: ${phaseLabel}` : null,
    `- Mức năng lượng / Giấc ngủ hôm nay: ${energyLevel}/5`,
    !isMale ? `- Triệu chứng hôm nay: ${symptomsList || 'Không có triệu chứng khó chịu'}` : null,
    ``,
    `=== LỊCH TẬP, MỨC TẠ & KỶ LỤC CÁ NHÂN (PR) ===`,
    `- Chuỗi ngày tập (Streak): ${streak} buổi`,
    `- Đang mở: ${activeDayTitle} | Bài đang xem: ${currentExerciseName}`,
    `- Tóm tắt lịch các ngày:\n  • ${splitSummary}`,
    `- Mức tạ & nấc ghế đã ghi nhận: ${logsSummary}`,
    prSummary ? `- Kỷ lục cá nhân (PR / 1RM): ${prSummary}` : null,
    recentWorkoutSummary ? `- Buổi tập gần nhất: ${recentWorkoutSummary}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildSystemInstruction(snapshot = {}) {
  const isMale = snapshot?.userProfile?.gender === 'male';
  if (isMale) {
    return [
      `Bạn là **KeyT Gym AI Coach (Phái Mạnh)** — Huấn luyện viên cá nhân AI chuyên sâu về Thể hình Nam (Ngực dày vuông, Vai 3D, Lưng xô V-Taper, Siết cơ bụng 6 múi, Tăng cân Bulking) và Dinh dưỡng thực chiến tại phòng máy BRTW & Impulse.`,
      ``,
      `NGUYÊN TẮC TRẢ LỜI BẮT BUỘC:`,
      `1. **Trích dẫn trực tiếp số đo của học viên** (Chiều cao, Cân nặng, BMI, Ngực/Bụng/Tay, Mục tiêu Nam, Mức năng lượng hôm nay & Kỷ lục PR nếu có) ngay đầu câu trả lời. Tuyệt đối KHÔNG nhắc đến chu kỳ kinh nguyệt cho học viên Nam.`,
      `2. Gợi ý cụ thể tên máy tại phòng (BRTW/Impulse), mức tạ khởi điểm/tăng tiến hợp lý (làm tròn 2kg cho tạ đơn, 2.5kg cho cáp/bánh tạ), số hiệp × số rep và thời gian nghỉ.`,
      `3. Nếu học viên báo mỏi vai hoặc bật bảo vệ lưng/gối: ưu tiên máy dẫn hướng có tựa ngực/lưng (Chest Supported Row, BRTW Incline Press, Leg Press thay vì Squat/Deadlift tự do nặng).`,
      `4. Khi tư vấn ăn uống: quy đổi ra **món ăn bình dân Việt Nam dễ mua** (cơm tấm sườn nạc bỏ mỡ bì, bún bò/phở bò nạc ít béo, ức gà/trứng luộc cửa hàng tiện lợi, khoai lang, chuối, sữa chua không đường) khớp định lượng Protein theo cân nặng.`,
      `5. Trình bày ngắn gọn, súc tích (110–190 từ), chia gạch đầu dòng rõ ràng, dễ đọc nhanh giữa giờ nghỉ hiệp.`,
      `6. Danh sách mã bài tập & máy có sẵn tại phòng:\n- ${GYM_CATALOG_SUMMARY}`,
    ].join('\n');
  }

  return [
    `Bạn là **KeyT Neon Coach (Phái Đẹp)** — Huấn luyện viên cá nhân AI chuyên sâu về Fitness Nữ, Độ Mông Đào (Glute Hypertrophy), Điều chỉnh lịch tập theo Chu kỳ kinh nguyệt (Cycle-Synced Training) và Dinh dưỡng giữ dáng S-Line tại phòng máy BRTW & Impulse.`,
    ``,
    `NGUYÊN TẮC TRẢ LỜI BẮT BUỘC:`,
    `1. **Trích dẫn trực tiếp chỉ số học viên** (Chiều cao, Cân nặng, BMI, Vòng eo V2, Vòng mông V3, WHR, Pha chu kỳ hiện tại, Triệu chứng hôm nay & mức tạ đang tập) ngay đầu câu trả lời.`,
    `2. Nếu học viên đang ở **Pha Hành Kinh (Kỳ Dâu)** hoặc năng lượng thấp (1–2/5) / đau bụng / đau lưng: khuyên giảm 15–20% mức tạ, tránh gồng ép ổ bụng quá gắt, ưu tiên Máy Hip Thrust nhẹ, Máy Mở Mông (Hip Abductor), Kéo xô nhẹ hoặc Giãn cơ phục hồi.`,
    `3. Gợi ý mức tạ **an toàn và sát thực tế cho Nữ** (VD: tạ đơn thân trên 3–6kg/quả, kéo cáp 15–25kg, Hip Thrust máy 10–30kg tùy trình độ). Với mục tiêu **Độ mông không to đùi trước**, hướng dẫn đặt chân cao trên bàn đạp Leg Press và dồn lực qua gót chân.`,
    `4. Khi tư vấn dinh dưỡng: gợi ý cả thực đơn eat-clean lẫn **món Việt tiện lợi dễ áp dụng** (bún thịt nướng nạc ít mỡ hành, phở gà bỏ da, cơm gạo lứt/cơm trắng vừa phải + ức gà/cá/đậu hũ, trứng luộc, khoai lang, sữa chua Hy Lạp).`,
    `5. Trình bày ngắn gọn, súc tích (110–190 từ), chia gạch đầu dòng rõ ràng, dễ đọc ngay trên màn hình điện thoại.`,
    `6. Danh sách mã bài tập & máy có sẵn tại phòng:\n- ${GYM_CATALOG_SUMMARY}`,
  ].join('\n');
}

/**
 * Rule-based smart fallback when external AI providers are unreachable or unconfigured.
 * Guarantees 100% availability and still answers with the user's exact profile numbers.
 */
function buildDeterministicCoachReply(question, snapshot = {}) {
  const profile = snapshot.userProfile || {};
  const cycle = snapshot.cycleTracking || {};
  const isMale = profile.gender === 'male';
  const name = profile.nickname || 'Challenger';
  const heightCm = Number(profile.heightCm) || (isMale ? 172 : 160);
  const weightKg = Number(profile.weightKg) || (isMale ? 68 : 50);
  const waistCm = Number(profile.waistCm) || (isMale ? 78 : 63);
  const hipCm = Number(profile.hipCm) || 92;
  const chestCm = Number(profile.chestCm) || 96;
  const armCm = Number(profile.armCm) || 35;
  const bmi = ((weightKg / Math.pow(heightCm / 100, 2)) || 20).toFixed(1);
  const phaseKey = snapshot.resolvedCyclePhase || cycle.manualPhaseOverride || 'follicular';
  const energy = isMale
    ? Number(profile.maleEnergyLevel || cycle.todayEnergyLevel) || 4
    : Number(cycle.todayEnergyLevel) || 4;
  const isPeriodOrLow = !isMale && (phaseKey === 'menstrual' || energy <= 2);

  if (isMale) {
    const lowEnergyMale = energy <= 2;
    return [
      `Chào **${name}**! Dựa trên hồ sơ của bạn (**Nam • ${heightCm}cm • ${weightKg}kg • BMI ${bmi}**, Ngực **${chestCm}cm** • Bụng **${waistCm}cm** • Bắp tay **${armCm}cm**, Sung sức **${energy}/5**):`,
      ``,
      lowEnergyMale
        ? `- **Điều tiết tải hôm nay:** Năng lượng đang thấp (${energy}/5), hãy giảm nhẹ **10% mức tạ**, ưu tiên các máy dẫn hướng an toàn (**BRTW Incline Chest Press, Impulse Chest-Supported Row, Máy Bay Vai**) 3 hiệp × 10–12 reps, nghỉ 90 giây.`
        : `- **Chiến lược tập hôm nay:** Khởi động 1–2 hiệp nhẹ, sau đó vào 3–4 hiệp chính trên dàn máy **BRTW Incline Press, Lat Pulldown & Seated Lateral Raise** (hạ tạ chậm 2–3 giây, nghỉ 75–90 giây). Nếu hiệp cuối dư 2 reps, buổi tới tăng **+2.5kg**!`,
      `- **Dinh dưỡng thực chiến (${weightKg}kg):** Mục tiêu **${Math.round(weightKg * 2.0)}g Protein/ngày** — dễ áp dụng với ức gà/thăn bò, trứng luộc, hoặc ăn ngoài chọn **phở bò tái nạc / cơm tấm sườn nạc bỏ mỡ bì**, uống đủ **${(weightKg * 0.042).toFixed(1)} lít nước**.`,
    ].join('\n');
  }

  return [
    `Chào **${name}**! Dựa trên hồ sơ của bạn (**${heightCm}cm • ${weightKg}kg • BMI ${bmi}**, số đo Eo/Mông **${waistCm}/${hipCm}cm**) và trạng thái hôm nay (**Năng lượng ${energy}/5**):`,
    ``,
    isPeriodOrLow
      ? `- **Điều chỉnh theo chu kỳ hôm nay:** Cơ thể bạn đang cần sự êm ái hơn. Hôm nay hãy **giảm 15–20% mức tạ (Deload)**, nghỉ 90 giây giữa các hiệp và tránh gồng nén bụng quá gắt.`
      : `- **Phong độ hôm nay rất tốt:** Với mức năng lượng ${energy}/5, bạn có thể giữ chuẩn form hoặc **tăng nhẹ +2kg đến +2.5kg** ở bài chủ lực hôm nay để kích thích cơ mông phát triển tối ưu.`,
    profile.avoidHeavyQuads !== false
      ? `- **Mẹo Độ Mông Không To Đùi Trước:** Hãy ưu tiên **Máy đẩy hông (Hip Thrust)**, **Máy mở mông (Hip Abductor)** và **Romanian Deadlift**. Khi tập đạp đùi, hãy đặt hai bàn chân cao lên nửa trên bàn đạp và phát lực qua gót chân.`
      : `- **Gợi ý kỹ thuật:** Kiểm soát nhịp hạ tạ chậm 2–3 giây và thở ra dứt khoát ở điểm co cơ đỉnh.`,
    `- **Dinh dưỡng tiện lợi (${weightKg}kg):** Nạp khoảng **${Math.round(weightKg * 1.8)}g Protein/ngày** (ức gà, cá, trứng, đậu hũ, sữa chua Hy Lạp hoặc phở gà bỏ da ít bánh) kèm uống đủ **${(weightKg * 0.038).toFixed(1)} lít nước** nhé!`,
  ].join('\n');
}

async function askGymAiCoach({ question, history = [], userSnapshot = {} }) {
  const cleanQuestion = String(question || '').trim().slice(0, 1000);
  if (!cleanQuestion) {
    const err = new Error('Vui lòng nhập câu hỏi cho Huấn luyện viên AI.');
    err.statusCode = 400;
    throw err;
  }

  const contextBlock = buildGymUserContextBlock(userSnapshot);
  const systemInstruction = buildSystemInstruction(userSnapshot);

  const recentHistory = Array.isArray(history)
    ? history
        .slice(-6)
        .map(
          (m) =>
            `${m.role === 'assistant' ? 'Coach AI' : 'Học viên'}: ${String(m.content || '').slice(0, 600)}`
        )
        .join('\n')
    : '';

  const fullUserPrompt = [
    contextBlock,
    recentHistory ? `\n=== LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY ===\n${recentHistory}` : '',
    `\n=== CÂU HỎI HIỆN TẠI CỦA HỌC VIÊN ===\n${cleanQuestion}`,
  ]
    .filter(Boolean)
    .join('\n');

  const providers = getAiProviders();

  for (const provider of providers) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 35000);

      const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: fullUserPrompt },
          ],
          temperature: 0.55,
          max_tokens: 900,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`[${provider.name} HTTP ${response.status}] ${errText.slice(0, 160)}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim()) {
        return {
          reply: content.trim(),
          provider: provider.name,
          model: provider.model,
        };
      }
    } catch (err) {
      console.warn(`⚠️ [GymAICoach] Provider ${provider.name} failed:`, err.message);
    }
  }

  // Graceful rule-based fallback so user never gets a 502 error at the gym
  return {
    reply: buildDeterministicCoachReply(cleanQuestion, userSnapshot),
    provider: 'KeyT Smart Engine',
    model: 'cycle-aware-v2',
  };
}

module.exports = {
  buildGymUserContextBlock,
  buildSystemInstruction,
  buildDeterministicCoachReply,
  askGymAiCoach,
};
