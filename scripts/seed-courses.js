require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

const Course = require('../src/models/course.model');
const CourseLesson = require('../src/models/course-lesson.model');
const VocabularyItem = require('../src/models/vocabulary-item.model');
const KanjiItem = require('../src/models/kanji-item.model');
const GrammarItem = require('../src/models/grammar-item.model');
const { Exam } = require('../src/models/exam.model');

async function seedSingleCourse(courseSlug, coursesDir) {
  const courseFolder = path.join(coursesDir, courseSlug);
  if (!fs.existsSync(courseFolder)) {
    console.warn(`Directory not found for course: ${courseFolder}`);
    return;
  }

  console.log(`\n==============================================`);
  console.log(`🚀 Seeding Course: [${courseSlug.toUpperCase()}]`);
  console.log(`==============================================`);

  // 1. Seed Course Metadata
  const courseMetaPath = path.join(courseFolder, 'course.json');
  if (!fs.existsSync(courseMetaPath)) {
    console.warn(`No course.json found in ${courseFolder}`);
    return;
  }
  const courseData = JSON.parse(fs.readFileSync(courseMetaPath, 'utf8'));

  const course = await Course.findOneAndUpdate(
    { code: courseData.code },
    { $set: courseData },
    { upsert: true, new: true }
  );
  console.log(`✅ Upserted Course: [${course.code}] ${course.title} (ID: ${course._id})`);

  // 2. Seed Vocabulary Lessons
  const vocabLessonsPath = path.join(courseFolder, 'vocabulary/lessons.json');
  const vocabLessonMap = {};
  if (fs.existsSync(vocabLessonsPath)) {
    const vocabLessons = JSON.parse(fs.readFileSync(vocabLessonsPath, 'utf8'));
    for (const l of vocabLessons) {
      const lessonDoc = await CourseLesson.findOneAndUpdate(
        { courseCode: course.code, sectionType: 'vocabulary', slug: l.slug },
        {
          $set: {
            courseId: course._id,
            courseCode: course.code,
            sectionType: 'vocabulary',
            lessonCode: l.lessonCode,
            slug: l.slug,
            title: l.title,
            description: l.description,
            order: l.order,
            itemCount: l.itemCount,
            isPublished: true
          }
        },
        { upsert: true, new: true }
      );
      vocabLessonMap[l.lessonCode] = lessonDoc;
    }
    console.log(`✅ Upserted ${vocabLessons.length} Vocabulary Lessons for ${course.code}`);

    // Seed Vocabulary Items for all lesson-*.json files dynamically
    const vocabDir = path.join(courseFolder, 'vocabulary');
    const lessonFiles = fs.readdirSync(vocabDir).filter((f) => f.startsWith('lesson-') && f.endsWith('.json'));

    for (const file of lessonFiles) {
      const match = file.match(/^lesson-([0-9]+-[0-9]+)\.json$/);
      if (match) {
        const lessonCode = match[1];
        const lessonDoc = vocabLessonMap[lessonCode];
        if (lessonDoc) {
          const items = JSON.parse(fs.readFileSync(path.join(vocabDir, file), 'utf8'));
          for (const item of items) {
            await VocabularyItem.findOneAndUpdate(
              { lessonId: lessonDoc._id, order: item.order },
              {
                $set: {
                  courseId: course._id,
                  courseCode: course.code,
                  lessonId: lessonDoc._id,
                  order: item.order,
                  term: item.term,
                  reading: item.reading,
                  romaji: item.romaji || '',
                  partOfSpeech: item.partOfSpeech || 'Danh từ',
                  meaning: item.meaning,
                  examples: item.examples || []
                }
              },
              { upsert: true, new: true }
            );
          }
          await CourseLesson.findByIdAndUpdate(lessonDoc._id, { itemCount: items.length });
          console.log(`✅ Upserted ${items.length} Vocabulary Items into Lesson ${lessonCode}`);
        }
      }
    }
  }

  // 3. Seed Kanji Lessons & Items
  const kanjiLessonsPath = path.join(courseFolder, 'kanji/lessons.json');
  if (fs.existsSync(kanjiLessonsPath)) {
    const kanjiLessons = JSON.parse(fs.readFileSync(kanjiLessonsPath, 'utf8'));
    for (const l of kanjiLessons) {
      const kanjiLessonDoc = await CourseLesson.findOneAndUpdate(
        { courseCode: course.code, sectionType: 'kanji', slug: l.slug },
        {
          $set: {
            courseId: course._id,
            courseCode: course.code,
            sectionType: 'kanji',
            lessonCode: l.lessonCode,
            slug: l.slug,
            title: l.title,
            description: l.description,
            order: l.order,
            itemCount: l.itemCount,
            isPublished: true
          }
        },
        { upsert: true, new: true }
      );

      if (Array.isArray(l.items) && l.items.length > 0) {
        for (const item of l.items) {
          await KanjiItem.findOneAndUpdate(
            { lessonId: kanjiLessonDoc._id, order: item.order },
            {
              $set: {
                courseId: course._id,
                courseCode: course.code,
                lessonId: kanjiLessonDoc._id,
                order: item.order,
                character: item.character,
                meaning: item.meaning || [],
                onyomi: item.onyomi || [],
                kunyomi: item.kunyomi || [],
                strokeCount: item.strokeCount,
                mnemonic: item.mnemonic,
                exampleWords: item.exampleWords || []
              }
            },
            { upsert: true, new: true }
          );
        }
        console.log(`✅ Upserted ${l.items.length} Kanji items into ${l.lessonCode}`);
      }
    }
    console.log(`✅ Upserted ${kanjiLessons.length} Kanji Lessons for ${course.code}`);
  }

  // 4. Seed Grammar Lessons & Items
  const grammarLessonsPath = path.join(courseFolder, 'grammar/lessons.json');
  if (fs.existsSync(grammarLessonsPath)) {
    const grammarLessons = JSON.parse(fs.readFileSync(grammarLessonsPath, 'utf8'));
    for (const l of grammarLessons) {
      const grammarLessonDoc = await CourseLesson.findOneAndUpdate(
        { courseCode: course.code, sectionType: 'grammar', slug: l.slug },
        {
          $set: {
            courseId: course._id,
            courseCode: course.code,
            sectionType: 'grammar',
            lessonCode: l.lessonCode,
            slug: l.slug,
            title: l.title,
            description: l.description,
            order: l.order,
            itemCount: l.itemCount,
            isPublished: true
          }
        },
        { upsert: true, new: true }
      );

      if (Array.isArray(l.items) && l.items.length > 0) {
        for (const item of l.items) {
          await GrammarItem.findOneAndUpdate(
            { lessonId: grammarLessonDoc._id, order: item.order },
            {
              $set: {
                courseId: course._id,
                courseCode: course.code,
                lessonId: grammarLessonDoc._id,
                order: item.order,
                title: item.title,
                pattern: item.pattern,
                meaning: item.meaning,
                explanation: item.explanation,
                structures: item.structures || [],
                examples: item.examples || [],
                notes: item.notes || []
              }
            },
            { upsert: true, new: true }
          );
        }
        console.log(`✅ Upserted ${l.items.length} Grammar items into ${l.lessonCode}`);
      }
    }
    console.log(`✅ Upserted ${grammarLessons.length} Grammar Lessons for ${course.code}`);
  }

  // 5. Seed Sample Exam Scaffold
  const examSlug = `${course.code.toLowerCase()}-mock-exam-midterm`;
  const examDoc = await Exam.findOneAndUpdate(
    { courseCode: course.code, slug: examSlug },
    {
      $set: {
        courseId: course._id,
        courseCode: course.code,
        slug: examSlug,
        title: `Đề Thi Thử Giữa Kỳ ${course.code} (N5 Format)`,
        description: `Bài kiểm tra tổng hợp kiến thức ${course.code}.`,
        durationMinutes: 45,
        passingScore: 60,
        totalQuestions: 15,
        isPublished: true,
        order: 1
      }
    },
    { upsert: true, new: true }
  );
  console.log(`✅ Upserted Exam Scaffold: ${examDoc.title}`);
}

async function seedCourses() {
  console.log('🚀 Starting Universal Course & Lesson Seed Engine...');

  try {
    await connectDB();

    const coursesDir = path.join(__dirname, '../src/data/courses');
    const availableCourses = fs.readdirSync(coursesDir).filter((f) => {
      const full = path.join(coursesDir, f);
      return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'course.json'));
    });

    console.log(`Found ${availableCourses.length} course(s) to seed: ${availableCourses.join(', ')}`);

    for (const cSlug of availableCourses) {
      await seedSingleCourse(cSlug, coursesDir);
    }

    console.log('\n🎉 ALL Courses & Lessons seeded successfully into MongoDB!');
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
    process.exit(0);
  }
}

seedCourses();
