from services.text_analyzer import (
    analyze_japanese_text,
    clean_japanese_text,
    split_into_moras
)

def compute_levenshtein_distance(s1: str, s2: str) -> int:
    """Computes Levenshtein edit distance between two strings."""
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])

    return dp[m][n]


def evaluate_pronunciation(
    expected_text: str,
    asr_result: dict,
    pause_analysis: dict
) -> dict:
    """
    Evaluates Japanese reading performance based on 4 criteria:
    - Content Accuracy (40%)
    - Pronunciation Quality (35%)
    - Fluency (15%)
    - Rhythm & Completeness (10%)
    Returns structured feedback with token-level highlighting for FE.
    """
    spoken_transcript = asr_result.get("transcript", "").strip()
    asr_words = asr_result.get("words", [])

    exp_analysis = analyze_japanese_text(expected_text)
    spoken_analysis = analyze_japanese_text(spoken_transcript)

    clean_exp_hira = clean_japanese_text(exp_analysis["full_hiragana"])
    clean_spk_hira = clean_japanese_text(spoken_analysis["full_hiragana"])
    clean_exp_surf = clean_japanese_text(expected_text)
    clean_spk_surf = clean_japanese_text(spoken_transcript)

    # 1. Content Accuracy (40%)
    if not clean_spk_hira:
        accuracy = 0
        cer = 1.0
    else:
        edit_dist_hira = compute_levenshtein_distance(clean_exp_hira, clean_spk_hira)
        edit_dist_surf = compute_levenshtein_distance(clean_exp_surf, clean_spk_surf)
        # Use the better of hiragana vs surface to reward correct phonetics
        best_edit_dist = min(edit_dist_hira, edit_dist_surf)
        max_len = max(1, len(clean_exp_hira))
        cer = best_edit_dist / max_len
        accuracy = max(0, min(100, round((1.0 - cer) * 100)))

    # 2. Token Alignment & Word-level Pronunciation (35%)
    word_analysis = []
    word_scores = []
    spoken_hira_pool = clean_spk_hira

    for token in exp_analysis["tokens"]:
        surface = token["surface"]
        reading = token["reading"]
        romaji = token["romaji"]
        clean_token_hira = clean_japanese_text(reading)

        # Look for matching token in spoken hiragana
        matched = False
        confidence = 0.5
        matched_spoken = ""

        # Find in ASR words if possible
        for w in asr_words:
            if surface in w["word"] or clean_token_hira in clean_japanese_text(w["word"]):
                matched = True
                confidence = w["probability"]
                matched_spoken = w["word"]
                break

        if not matched and clean_token_hira and clean_token_hira in spoken_hira_pool:
            matched = True
            confidence = 0.82
            matched_spoken = surface

        if matched:
            if confidence >= 0.80:
                score = round(confidence * 100)
                status = "correct"
                feedback = "Phát âm chuẩn xác và rõ ràng."
            elif confidence >= 0.50:
                score = round(confidence * 100)
                status = "warning"
                feedback = "Phát âm được nhận diện nhưng còn hơi gượng hoặc thiếu rõ âm."
            else:
                score = round(confidence * 100)
                status = "warning"
                feedback = "Âm lượng hoặc độ chuẩn phát âm chưa cao."
        else:
            # Word was missed or mispronounced
            score = 20 if clean_spk_hira else 0
            status = "error" if clean_spk_hira else "missing"
            feedback = f"Từ này bị bỏ sót hoặc đọc sai. Chú ý cách đọc: 【{reading}】 ({romaji})."

        word_scores.append(score)
        word_analysis.append({
            "word": surface,
            "reading": reading,
            "romaji": romaji,
            "moras": token["moras"],
            "score": score,
            "status": status,
            "feedback": feedback,
            "spoken": matched_spoken
        })

    # Pronunciation score is average of word scores (or 0 if no speech)
    pronunciation = round(sum(word_scores) / len(word_scores)) if word_scores else 0

    # 3. Fluency (15%)
    speech_duration = pause_analysis.get("speech_duration_sec", 0.0)
    hesitation_count = pause_analysis.get("hesitation_count", 0)
    total_moras = exp_analysis["total_moras"]

    mora_rate = total_moras / max(0.5, speech_duration) if speech_duration > 0.3 else 0.0
    
    # Fluency calculation
    if not clean_spk_hira:
        fluency = 0
    else:
        fluency_base = 100
        # Hesitation penalties
        fluency_base -= min(40, hesitation_count * 8)
        # Speed penalties (ideal 3.5 - 6.5 mora/s)
        if mora_rate < 2.5:
            fluency_base -= 15  # too slow / hesitant
        elif mora_rate > 7.5:
            fluency_base -= 10  # rushed / slurred
        fluency = max(20, min(100, fluency_base))

    # 4. Rhythm & Completeness (10%)
    if not clean_spk_hira:
        rhythm = 0
        completeness = 0.0
    else:
        completeness = min(1.0, len(clean_spk_hira) / max(1, len(clean_exp_hira)))
        rhythm = max(15, min(100, round(completeness * 100)))

    # Total Score / 100
    total_score = round(
        0.40 * accuracy +
        0.35 * pronunciation +
        0.15 * fluency +
        0.10 * rhythm
    )

    # Convert to FE Exam scale (/45 points for Reading portion)
    fe_exam_score = min(45, max(0, round((total_score / 100.0) * 45)))

    # Determine Rank & AI Coach Advice
    if total_score >= 90:
        grade = "S"
        summary = "Tuyệt vời! Bạn đọc rất lưu loát, chuẩn xác âm vị và ngắt nghỉ tự nhiên đúng phong cách người Nhật bản xứ."
    elif total_score >= 80:
        grade = "A"
        summary = "Rất tốt! Bài đọc đạt chuẩn điểm cao trong kỳ thi FE. Chỉ cần lưu ý thêm một vài âm tiết để đạt điểm tuyệt đối."
    elif total_score >= 65:
        grade = "B"
        summary = "Khá tốt! Bạn nắm được phần lớn nội dung bài đọc, tuy nhiên cần chú ý tốc độ đọc và các chữ Hán biến âm."
    elif total_score >= 50:
        grade = "C"
        summary = "Đạt yêu cầu cơ bản. Hãy nghe lại AI đọc mẫu, luyện tập ngắt câu theo cụm từ (bunsetsu) để cải thiện độ trôi chảy."
    else:
        grade = "D"
        summary = "Chưa đạt. Hãy bấm '20s Chuẩn bị', xem trước phiên âm Furigana và đọc to, rõ từng chữ trước microphone nhé!"

    return {
        "expected": expected_text,
        "transcript": spoken_transcript,
        "score": total_score,
        "feScore": fe_exam_score,
        "grade": grade,
        "summary": summary,
        "metrics": {
            "accuracy": accuracy,
            "pronunciation": pronunciation,
            "fluency": fluency,
            "rhythm": rhythm
        },
        "details": {
            "moraRate": round(mora_rate, 2),
            "expectedMoras": total_moras,
            "speechDurationSec": speech_duration,
            "hesitationCount": hesitation_count,
            "characterErrorRate": round(cer, 3)
        },
        "words": word_analysis
    }
