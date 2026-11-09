/**
 * KeyT Gym 3D Coach — Personal AI Trainer Service (Female Fitness & Cycle-Aware)
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
  'machine_hip_thrust (Máy đẩy hông Hip Thrust BRTW - Vua độ mông không to đùi)',
  'hip_abductor_adductor (Máy mở mông ngang Hip Abductor - Làm đầy hõm mông hai bên)',
  'hip_adductor_inner (Máy ép đùi trong Hip Adductor - Thon gọn đùi trong)',
  'romanian_deadlift (Romanian Deadlift tạ đòn/tạ đơn - Kéo giãn mông & đùi sau)',
  'seated_leg_curl (Máy ngồi gập đùi sau Seated Leg Curl - Cô lập đùi sau)',
  'lying_leg_curl (Máy nằm cuốn đùi sau Lying Leg Curl)',
  'leg_press_45 (Máy đạp đùi 45 độ Leg Press - Đặt chân cao để ăn vào mông)',
  'super_squat_machine (Máy gánh đùi Super Squat BRTW)',
  'barbell_squat (Gánh đùi khung trượt Smith BRTW)',
  'leg_extension (Máy đá đùi trước Leg Extension)',
  'standing_calf_raise (Nhón bắp chân trên máy)',
  'wide_lat_pulldown (Kéo xô rộng tay Lat Pulldown - Tạo lưng chữ V giúp eo trông nhỏ hơn)',
  'iso_high_pulldown (Máy kéo xô độc lập BRTW Iso High Pulldown)',
  'chest_supported_row (Máy kéo lưng tựa ngực Impulse - An toàn cho lưng dưới)',
  'seated_cable_row (Ngồi kéo cáp lưng giữa)',
  'assisted_pullup (Máy hít xà trợ lực gối quỳ)',
  'machine_lateral_raise (Máy bay vai giữa Seated Lateral Raise - Tạo bờ vai mắc áo)',
  'side_lateral_raise (Bay vai tạ đơn)',
  'reverse_pec_deck (Máy ép vai sau Reverse Pec Deck - Chống gù lưng, mở vai)',
  'dumbbell_shoulder_press (Đẩy vai tạ đơn)',
  'tricep_rope_pushdown (Kéo cáp dây thừng tay sau - Thon gọn bắp tay sau)',
  'incline_dumbbell_press (Đẩy ngực trên tạ đơn 30 độ - Nâng đỡ vòng 1 săn chắc)',
  'pec_deck_fly (Máy ép ngực cánh bướm Pec Fly)',
  'active_mobility_recovery (Giãn cơ mở khớp hông & cột sống - Rất tốt cho ngày đèn đỏ)',
  'back_extension_45 (Ghế tập lưng dưới & mông trên 45 độ)',
  'core_plank (Plank siết cơ bụng sâu)',
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
 * Pure builder that formats all user profile, cycle, workout split, and weight logs
 * into a structured Vietnamese context for the AI Coach.
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

  const logsSummary = Array.isArray(snapshot.exerciseLogsSummary)
    ? snapshot.exerciseLogsSummary.slice(0, 15).join('; ')
    : 'Chưa có nhiều lịch sử mức tạ';

  const splitSummary = Array.isArray(snapshot.customDaysSummary)
    ? snapshot.customDaysSummary.slice(0, 7).join('\n  • ')
    : 'Lịch 5 ngày tiêu chuẩn tại phòng máy BRTW/Impulse';

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
      ? `- Ưu tiên cơ học: ${profile.avoidHeavyQuads !== false ? 'CÓ ưu tiên độ mông & hạn chế to đùi trước' : 'Phát triển đều thân dưới'} | ${profile.protectLowerBackKnee ? 'Cần bảo vệ lưng dưới & khớp gối' : 'Khớp bình thường'}`
      : null,
    profile.personalNotes ? `- Ghi chú cá nhân: ${profile.personalNotes}` : null,
    ``,
    `=== TRẠNG THÁI & NĂNG LƯỢNG HÔM NAY ===`,
    !isMale ? `- Theo dõi chu kỳ: ${cycle.enabled !== false ? 'Đang bật' : 'Tắt'}` : null,
    !isMale ? `- Pha chu kỳ hiện tại: ${phaseLabel}` : null,
    `- Mức năng lượng hôm nay: ${cycle.todayEnergyLevel || 4}/5`,
    !isMale ? `- Triệu chứng hôm nay: ${symptomsList || 'Không có triệu chứng khó chịu'}` : null,
    ``,
    `=== LỊCH TẬP & MỨC TẠ HIỆN TẠI ===`,
    `- Chuỗi ngày tập (Streak): ${streak} buổi`,
    `- Đang mở: ${activeDayTitle} | Bài đang xem: ${currentExerciseName}`,
    `- Tóm tắt lịch các ngày:\n  • ${splitSummary}`,
    `- Mức tạ đã ghi nhận: ${logsSummary}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildSystemInstruction(snapshot = {}) {
  const isMale = snapshot?.userProfile?.gender === 'male';
  if (isMale) {
    return [
      `Bạn là **KeyT Gym AI Coach (Phái Mạnh)** — Huấn luyện viên cá nhân AI chuyên sâu về Thể hình Nam (Tăng cơ Ngực dày, Vai 3D, Lưng xô V-Taper, Siết cơ bụng 6 múi, Tăng cân Bulking) và Dinh dưỡng tại phòng tập thực tế có dàn máy BRTW & Impulse.`,
      ``,
      `NGUYÊN TẮC TRẢ LỜI BẮT BUỘC:`,
      `1. **Lấy trực tiếp thông tin người dùng vừa nhập vào** (Chiều cao, Cân nặng, BMI, Vòng ngực, Vòng bụng, Vòng bắp tay, Mục tiêu Nam giới, Số buổi/tuần, Lộ trình bài tập & Calo/Đạm mục tiêu) để suy nghĩ, tính toán và trích dẫn ngay đầu câu trả lời.`,
      `2. Gợi ý cụ thể bài tập, mức tạ khởi điểm (kg), số hiệp × số lần và khẩu phần ăn (gram ức gà, thịt bò, trứng, cơm/khoai lang) khớp chính xác với cân nặng của học viên.`,
      `3. Trình bày ngắn gọn, súc tích (100–180 từ), chia gạch đầu dòng rõ ràng, dễ đọc trên điện thoại.`,
      `4. Danh sách mã bài tập tại phòng:\n- ${GYM_CATALOG_SUMMARY}`,
    ].join('\n');
  }

  return [
    `Bạn là **KeyT Neon Coach (Phái Đẹp)** — Huấn luyện viên cá nhân AI chuyên sâu về Fitness Nữ, Độ Mông (Glute Hypertrophy), Điều chỉnh lịch tập theo Chu kỳ kinh nguyệt (Cycle-Synced Training) và Dinh dưỡng giữ dáng tại phòng tập thực tế có dàn máy BRTW & Impulse.`,
    ``,
    `NGUYÊN TẮC TRẢ LỜI BẮT BUỘC:`,
    `1. **Lấy trực tiếp thông tin người dùng vừa nhập vào** (Chiều cao, Cân nặng, BMI, Vòng eo V2, Vòng mông V3, Tỷ lệ WHR, Pha chu kỳ kinh nguyệt hiện tại, Triệu chứng hôm nay, Lộ trình bài tập & Calo/Đạm mục tiêu) để suy nghĩ và trích dẫn ngay đầu câu trả lời.`,
    `2. Nếu học viên đang ở **Pha Hành Kinh (Kỳ Dâu)** hoặc có triệu chứng đau lưng/đau bụng/năng lượng thấp (1-2/5): khuyên giảm 15-20% mức tạ, tránh các bài ép ổ bụng/nén cột sống nặng, ưu tiên Máy Hip Thrust nhẹ, Máy Mở Mông (Hip Abductor) hoặc Giãn cơ phục hồi.`,
    `3. Nếu học viên có mục tiêu **Độ mông không to đùi trước**: hướng dẫn mẹo đặt bàn chân cao trên bàn đạp Leg Press, đẩy lực qua gót chân, ưu tiên Hip Thrust, Hip Abductor, Romanian Deadlift.`,
    `4. Trình bày ngắn gọn, súc tích (100–180 từ), chia gạch đầu dòng rõ ràng, dễ đọc ngay trên màn hình điện thoại.`,
    `5. Danh sách mã bài tập có sẵn tại phòng tập:\n- ${GYM_CATALOG_SUMMARY}`,
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
  const energy = Number(cycle.todayEnergyLevel) || 4;
  const isPeriodOrLow = !isMale && (phaseKey === 'menstrual' || energy <= 2);

  if (isMale) {
    return [
      `Chào **${name}**! Dựa trên thông tin bạn vừa nhập (**Nam • ${heightCm}cm • ${weightKg}kg • BMI ${bmi}**, Ngực **${chestCm}cm** • Bụng **${waistCm}cm** • Bắp tay **${armCm}cm**):`,
      ``,
      `- **Đề xuất tập luyện hôm nay:** Tập trung các bài máy đa khớp BRTW/Impulse (Đẩy ngực trên, Kéo xô rộng tay, Bay vai 3D) với nhịp hạ tạ chậm 2–3 giây, nghỉ 60–90 giây giữa các hiệp.`,
      `- **Đề xuất ăn uống (${weightKg}kg):** Nạp khoảng **${Math.round(weightKg * 2.0)}g Protein/ngày** (chia 4 bữa: ức gà, thăn bò, cá, trứng, khoai lang/cơm) và uống đủ **${(weightKg * 0.042).toFixed(1)} lít nước**.`,
    ].join('\n');
  }

  return [
    `Chào **${name}**! Dựa trên hồ sơ của bạn (**${heightCm}cm • ${weightKg}kg • BMI ${bmi}**, số đo Eo/Mông **${waistCm}/${hipCm}cm**) và trạng thái hôm nay (**Năng lượng ${energy}/5**):`,
    ``,
    isPeriodOrLow
      ? `- **Điều chỉnh theo chu kỳ hôm nay:** Cơ thể bạn đang cần sự êm ái hơn. Hôm nay hãy **giảm 15–20% mức tạ (Deload)**, nghỉ 90 giây giữa các hiệp và tránh gồng nén bụng quá gắt.`
      : `- **Phong độ hôm nay rất tốt:** Với mức năng lượng ${energy}/5, bạn có thể giữ nguyên hoặc **tăng nhẹ +2.5kg** ở bài chủ lực hôm nay để kích thích cơ mông phát triển tối ưu.`,
    profile.avoidHeavyQuads !== false
      ? `- **Mẹo Độ Mông Không To Đùi Trước:** Hãy ưu tiên **Máy đẩy hông (Hip Thrust)**, **Máy mở mông (Hip Abductor)** và **Romanian Deadlift**. Khi tập đạp đùi, hãy đặt hai bàn chân cao lên nửa trên bàn đạp và phát lực qua gót chân.`
      : `- **Gợi ý kỹ thuật:** Kiểm soát nhịp hạ tạ chậm 2–3 giây và thở ra dứt khoát ở điểm co cơ đỉnh.`,
    `- **Dinh dưỡng sau tập:** Với cân nặng ${weightKg}kg, bạn nên nạp khoảng **${Math.round(weightKg * 1.8)}g Protein/ngày** (ức gà, cá, trứng, sữa chua Hy Lạp hoặc Whey) kèm uống đủ 2 lít nước nhé!`,
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
    model: 'cycle-aware-v1',
  };
}

module.exports = {
  buildGymUserContextBlock,
  buildSystemInstruction,
  buildDeterministicCoachReply,
  askGymAiCoach,
};
