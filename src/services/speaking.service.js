const path = require('path');
const fs = require('fs');

class SpeakingService {
  constructor() {
    this.speakingDataCache = new Map();
    this.feExamsCache = new Map();
  }

  /**
   * Load speaking data for course
   */
  getSpeakingData(courseCode = 'JPD123') {
    const code = courseCode.toUpperCase();
    if (this.speakingDataCache.has(code)) {
      return this.speakingDataCache.get(code);
    }

    const filePath = path.join(
      __dirname,
      `../data/courses/${code.toLowerCase()}/speaking/speaking.json`
    );

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        this.speakingDataCache.set(code, data);
        return data;
      } catch (err) {
        console.error(`❌ Error parsing speaking data for ${code}:`, err);
      }
    }

    return null;
  }

  /**
   * Load FE exams data
   */
  getFeExamsData(courseCode = 'JPD123') {
    const code = courseCode.toUpperCase();
    if (this.feExamsCache.has(code)) {
      return this.feExamsCache.get(code);
    }

    const filePath = path.join(
      __dirname,
      `../data/courses/${code.toLowerCase()}/exams/fe-exams.json`
    );

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        this.feExamsCache.set(code, data);
        return data;
      } catch (err) {
        console.error(`❌ Error parsing FE exams data for ${code}:`, err);
      }
    }

    return null;
  }

  /**
   * Get all reading passages (Mã đề A)
   */
  async getReadingPassages(courseCode = 'JPD123') {
    const data = this.getSpeakingData(courseCode);
    return data ? (data.readingPassages || data.passages || []) : [];
  }

  /**
   * Get reading passage by ID (e.g. "A-0", "A-1")
   */
  async getReadingPassageById(courseCode = 'JPD123', id) {
    const passages = await this.getReadingPassages(courseCode);
    return passages.find((p) => p.id === id || p.code === id) || null;
  }

  /**
   * Get Q&A questions with optional filter by lesson and image
   */
  async getQAQuestions(courseCode = 'JPD123', filters = {}) {
    const data = this.getSpeakingData(courseCode);
    const rawQuestions = data ? (data.qaQuestions || data.questions || []) : [];
    if (rawQuestions.length === 0) return [];

    let questions = [...rawQuestions];

    if (filters.lesson) {
      const lessonNum = parseInt(filters.lesson, 10);
      if (!Number.isNaN(lessonNum)) {
        questions = questions.filter((q) => q.lesson === lessonNum);
      }
    }

    if (filters.hasImage !== undefined) {
      const hasImg = filters.hasImage === 'true' || filters.hasImage === true;
      questions = questions.filter((q) => q.hasImage === hasImg);
    }

    return questions;
  }

  /**
   * Get random Mock Exam Pack (1 Đề A + 1 Đề B với 3 câu hỏi: 1 có tranh + 2 không tranh)
   */
  async getMockExamPack(courseCode = 'JPD123') {
    const passages = await this.getReadingPassages(courseCode);
    const questions = await this.getQAQuestions(courseCode);

    if (passages.length === 0 || questions.length === 0) {
      return null;
    }

    // 1. Pick random passage
    const randomPassage = passages[Math.floor(Math.random() * passages.length)];

    // 2. Pick 1 image question (Câu 1)
    const imageQuestions = questions.filter((q) => q.hasImage);
    const q1 = imageQuestions.length > 0
      ? imageQuestions[Math.floor(Math.random() * imageQuestions.length)]
      : questions[0];

    // 3. Pick 2 non-image questions from different lessons if possible (Câu 2, 3)
    const nonImageQuestions = questions.filter((q) => !q.hasImage && q.id !== q1.id);
    const shuffledNonImg = nonImageQuestions.sort(() => 0.5 - Math.random());
    const q2 = shuffledNonImg[0] || questions[1];
    const q3 = shuffledNonImg[1] || questions[2];

    return {
      examCode: `MOCK-${Date.now().toString().slice(-4)}`,
      readingPassage: randomPassage,
      qaQuestions: [q1, q2, q3],
      durationEstimateMinutes: 8,
      prepTimeSeconds: 20
    };
  }

  /**
   * Get Survival Kit & Cheat Sheet
   */
  async getSurvivalKit(courseCode = 'JPD123') {
    const data = this.getSpeakingData(courseCode);
    return data ? data.survivalKit : null;
  }

  /**
   * Get all FE Mock tests
   */
  async getFeExams(courseCode = 'JPD123') {
    const data = this.getFeExamsData(courseCode);
    if (!data) return [];
    const list = Array.isArray(data) ? data : (data.exams || []);
    return list.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      description: e.description,
      durationMinutes: e.durationMinutes,
      passingScore: e.passingScore,
      totalQuestions: e.questions ? e.questions.length : (e.totalQuestions || 0)
    }));
  }

  /**
   * Get FE exam detail with questions by slug or id
   */
  async getFeExamBySlug(courseCode = 'JPD123', slug) {
    const data = this.getFeExamsData(courseCode);
    if (!data) return null;
    const list = Array.isArray(data) ? data : (data.exams || []);
    return list.find((e) => e.slug === slug || e.id === slug) || null;
  }
}

module.exports = new SpeakingService();
