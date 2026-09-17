const Course = require('../models/course.model');
const CourseLesson = require('../models/course-lesson.model');
const VocabularyItem = require('../models/vocabulary-item.model');
const KanjiItem = require('../models/kanji-item.model');
const GrammarItem = require('../models/grammar-item.model');
const { Exam } = require('../models/exam.model');
const {
  UserVocabularyProgress,
  UserLessonProgress,
  UserCourseProgress
} = require('../models/user-progress.model');

const courseService = {
  /**
   * Get Course overview with sections and user progress
   */
  async getCourseOverview(courseCode, userId = null) {
    const code = (courseCode || '').toUpperCase();
    const course = await Course.findOne({ code, isPublished: true }).lean();

    if (!course) {
      return null;
    }

    // Aggregate counts for sections
    const [vocabLessons, kanjiLessons, grammarLessons, exams] = await Promise.all([
      CourseLesson.find({ courseCode: code, sectionType: 'vocabulary', isPublished: true }).lean(),
      CourseLesson.find({ courseCode: code, sectionType: 'kanji', isPublished: true }).lean(),
      CourseLesson.find({ courseCode: code, sectionType: 'grammar', isPublished: true }).lean(),
      Exam.find({ courseCode: code, isPublished: true }).lean()
    ]);

    const totalVocabItems = vocabLessons.reduce((acc, l) => acc + (l.itemCount || 0), 0);
    const totalKanjiItems = kanjiLessons.reduce((acc, l) => acc + (l.itemCount || 0), 0);
    const totalGrammarItems = grammarLessons.reduce((acc, l) => acc + (l.itemCount || 0), 0);

    let userProgressData = {
      overallPercent: 0,
      lastAccessedLesson: null,
      sections: {
        vocabulary: { mastered: 0, percent: 0 },
        kanji: { mastered: 0, percent: 0 },
        grammar: { mastered: 0, percent: 0 },
        exam: { mastered: 0, percent: 0 }
      }
    };

    if (userId) {
      const [courseProg, lessonProgs] = await Promise.all([
        UserCourseProgress.findOne({ userId, courseCode: code }).lean(),
        UserLessonProgress.find({ userId, courseCode: code }).lean()
      ]);

      if (courseProg) {
        userProgressData.overallPercent = courseProg.overallPercentage || 0;
        userProgressData.lastAccessedLesson = courseProg.lastAccessedLesson || null;
      }

      if (lessonProgs && lessonProgs.length > 0) {
        let vocabMastered = 0;
        let kanjiMastered = 0;
        let grammarMastered = 0;

        lessonProgs.forEach((lp) => {
          if (lp.sectionType === 'vocabulary') vocabMastered += lp.masteredItems || 0;
          if (lp.sectionType === 'kanji') kanjiMastered += lp.masteredItems || 0;
          if (lp.sectionType === 'grammar') grammarMastered += lp.masteredItems || 0;
        });

        userProgressData.sections.vocabulary = {
          mastered: vocabMastered,
          percent: totalVocabItems > 0 ? Math.min(100, Math.round((vocabMastered / totalVocabItems) * 100)) : 0
        };
        userProgressData.sections.kanji = {
          mastered: kanjiMastered,
          percent: totalKanjiItems > 0 ? Math.min(100, Math.round((kanjiMastered / totalKanjiItems) * 100)) : 0
        };
        userProgressData.sections.grammar = {
          mastered: grammarMastered,
          percent: totalGrammarItems > 0 ? Math.min(100, Math.round((grammarMastered / totalGrammarItems) * 100)) : 0
        };
      }
    }

    const sections = [
      {
        type: 'kanji',
        title: 'Hán Tự',
        japaneseTitle: '漢字',
        kanjiChar: '漢',
        description: 'Nhớ mặt chữ Hán, số nét, âm On/Kun và các từ ghép thường gặp.',
        totalLessons: kanjiLessons.length,
        totalItems: totalKanjiItems,
        userMastered: userProgressData.sections.kanji.mastered,
        percent: userProgressData.sections.kanji.percent,
        colorTheme: 'rose'
      },
      {
        type: 'vocabulary',
        title: 'Từ Vựng',
        japaneseTitle: '単語',
        kanjiChar: '単',
        description: 'Luyện tập Flashcard, gõ từ và trắc nghiệm phản xạ từ vựng.',
        totalLessons: vocabLessons.length,
        totalItems: totalVocabItems,
        userMastered: userProgressData.sections.vocabulary.mastered,
        percent: userProgressData.sections.vocabulary.percent,
        colorTheme: 'orange'
      },
      {
        type: 'grammar',
        title: 'Ngữ Pháp',
        japaneseTitle: '文法',
        kanjiChar: '文',
        description: 'Các mẫu câu trọng tâm, công thức chia động từ và ví dụ thực tế.',
        totalLessons: grammarLessons.length,
        totalItems: totalGrammarItems,
        userMastered: userProgressData.sections.grammar.mastered,
        percent: userProgressData.sections.grammar.percent,
        colorTheme: 'indigo'
      },
      {
        type: 'exam',
        title: 'Luyện Thi',
        japaneseTitle: '試験',
        kanjiChar: '試',
        description: 'Đề thi thử định dạng chuẩn JLPT có chấm điểm và đồng hồ bấm giờ.',
        totalLessons: exams.length,
        totalItems: exams.length,
        userMastered: userProgressData.sections.exam.mastered,
        percent: userProgressData.sections.exam.percent,
        colorTheme: 'emerald'
      }
    ];

    return {
      course,
      sections,
      userProgress: userProgressData
    };
  },

  /**
   * Get all lessons in a section
   */
  async getSectionLessons(courseCode, sectionType, userId = null) {
    const code = (courseCode || '').toUpperCase();
    const lessons = await CourseLesson.find({
      courseCode: code,
      sectionType,
      isPublished: true
    })
      .sort({ order: 1 })
      .lean();

    if (!userId || lessons.length === 0) {
      return lessons.map((l) => ({
        ...l,
        userProgress: { masteredItems: 0, percentCompleted: 0 }
      }));
    }

    const lessonIds = lessons.map((l) => l._id);
    const progressList = await UserLessonProgress.find({
      userId,
      lessonId: { $in: lessonIds }
    }).lean();

    const progressMap = new Map();
    progressList.forEach((p) => {
      progressMap.set(p.lessonId.toString(), p);
    });

    return lessons.map((l) => {
      const prog = progressMap.get(l._id.toString());
      return {
        ...l,
        userProgress: {
          masteredItems: prog ? prog.masteredItems : 0,
          percentCompleted: prog ? prog.percentCompleted : 0
        }
      };
    });
  },

  /**
   * Helper: flexible lesson lookup by slug, lessonCode or order
   */
  async findLessonFlexibly(courseCode, sectionType, slug) {
    const code = (courseCode || '').toUpperCase();
    let lesson = await CourseLesson.findOne({
      courseCode: code,
      sectionType,
      slug,
      isPublished: true
    }).lean();

    if (lesson) return lesson;

    // Check if slug contains lesson number (e.g. kanji-jpd123-n5-4 or lesson-4 or bai-4)
    const numMatch = slug.match(/(\d+)$/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      lesson = await CourseLesson.findOne({
        courseCode: code,
        sectionType,
        $or: [
          { lessonCode: `LESSON-${num}` },
          { slug: new RegExp(`(bai-${num}|n5-${num})`, 'i') }
        ],
        isPublished: true
      }).lean();
      if (lesson) return lesson;
    }

    return null;
  },

  /**
   * Get single lesson by slug
   */
  async getLessonBySlug(courseCode, sectionType, slug) {
    return this.findLessonFlexibly(courseCode, sectionType, slug);
  },

  /**
   * Get items for a lesson with user progress
   */
  async getLessonItems(courseCode, sectionType, slug, userId = null) {
    const code = (courseCode || '').toUpperCase();
    const lesson = await this.findLessonFlexibly(courseCode, sectionType, slug);

    if (!lesson) {
      return null;
    }

    let items = [];

    if (sectionType === 'vocabulary') {
      items = await VocabularyItem.find({ lessonId: lesson._id })
        .sort({ order: 1 })
        .lean();

      if (userId && items.length > 0) {
        const itemIds = items.map((i) => i._id);
        const progressDocs = await UserVocabularyProgress.find({
          userId,
          vocabularyId: { $in: itemIds }
        }).lean();

        const progressMap = new Map();
        progressDocs.forEach((p) => {
          progressMap.set(p.vocabularyId.toString(), p);
        });

        items = items.map((item) => {
          const userProg = progressMap.get(item._id.toString());
          return {
            ...item,
            userProgress: userProg
              ? {
                  status: userProg.status,
                  masteryScore: userProg.masteryScore,
                  streak: userProg.streak,
                  isBookmarked: userProg.isBookmarked || false
                }
              : {
                  status: 'new',
                  masteryScore: 0,
                  streak: 0,
                  isBookmarked: false
                }
          };
        });
      } else {
        items = items.map((item) => ({
          ...item,
          userProgress: {
            status: 'new',
            masteryScore: 0,
            streak: 0,
            isBookmarked: false
          }
        }));
      }
    } else if (sectionType === 'kanji') {
      const KANJI_HANVIET_MAP = {
        '東': 'ĐÔNG', '京': 'KINH', '名': 'DANH', '前': 'TIỀN', '国': 'QUỐC',
        '南': 'NAM', '女': 'NỮ', '男': 'NAM', '区': 'KHU', '市': 'THỊ',
        '先': 'TIÊN', '週': 'CHU', '毎': 'MỖI', '午': 'NGỌ', '後': 'HẬU',
        '見': 'KIẾN', '食': 'THỰC', '飲': 'ẨM', '買': 'MÃI', '物': 'VẬT',
        '行': 'HÀNH', '休': 'HƯU',
        '今': 'KIM', '来': 'LAI', '帰': 'QUY', '会': 'HỘI', '社': 'XÃ',
        '聞': 'VĂN', '読': 'ĐỘC', '書': 'THƯ', '話': 'THOẠI',
        '寺': 'TỰ', '言': 'NGÔN', '貝': 'BỐI', '田': 'ĐIỀN', '力': 'LỰC',
        '門': 'MÔN', '肉': 'NHỤC', '料': 'LIỆU', '理': 'LÝ', '野': 'DÃ',
        '半': 'BÁN'
      };

      const rawItems = await KanjiItem.find({ lessonId: lesson._id })
        .sort({ order: 1 })
        .lean();

      items = rawItems.map((item) => ({
        ...item,
        hanViet: item.hanViet || KANJI_HANVIET_MAP[item.character] || '',
        userProgress: {
          status: 'new',
          masteryScore: 0,
          streak: 0,
          isBookmarked: false
        }
      }));
    } else if (sectionType === 'grammar') {
      items = await GrammarItem.find({ lessonId: lesson._id })
        .sort({ order: 1 })
        .lean();
    } else if (sectionType === 'exam') {
      const exam = await Exam.findOne({ courseCode: code, slug }).lean();
      return {
        lesson,
        items: exam ? [exam] : []
      };
    }

    return {
      lesson,
      items
    };
  }
};

module.exports = courseService;
