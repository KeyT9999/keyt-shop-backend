const fs = require('fs');
const path = require('path');

const DEFAULT_SOURCE = path.resolve(__dirname, '../../Tieng Anh.txt');
const COURSE_DIRECTORY = path.resolve(__dirname, '../src/data/courses/eng1000');

function hasVietnameseText(value) {
  return /[\u00C0-\u024F\u1E00-\u1EFF]/u.test(value);
}

function slugify(value) {
  return value
    .replace(/đ/gi, (letter) => (letter === 'Đ' ? 'D' : 'd'))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function findCategoryHeaders(lines) {
  return lines.flatMap((line, index) => {
    const match = line.trim().match(/^(\d{1,2})\.?\s*Từ vựng về\s+(.+?)\s*$/iu);
    if (!match || /[.…]{2,}/u.test(match[2])) return [];

    const number = Number(match[1]);
    if (number < 1 || number > 50) return [];

    return [{ index, number, title: match[2].trim() }];
  });
}

function parseCategory(lines, startIndex, endIndex, title) {
  const items = [];
  let currentItem = null;
  let pendingHeadword = '';

  for (let index = startIndex + 1; index < endIndex; index += 1) {
    const line = lines[index].trim();
    if (
      !line ||
      /^\d+$/u.test(line) ||
      /^xem thêm:/iu.test(line) ||
      /Từ vựng\s+Cách phát âm\s+Nghĩa/iu.test(line)
    ) {
      continue;
    }

    const entryMatch = line.match(/^(.*?)\s*\/([^/]+)\/(.*)$/u);
    if (entryMatch) {
      let term = entryMatch[1].trim();
      if (!term) term = pendingHeadword.trim();
      pendingHeadword = '';
      if (!term) {
        throw new Error(`Missing English headword in topic "${title}" near source line ${index + 1}.`);
      }

      currentItem = {
        term,
        reading: entryMatch[2].trim(),
        meaning: entryMatch[3].trim()
      };
      items.push(currentItem);
      continue;
    }

    // The source wraps Vietnamese meanings onto separate lines and splits one
    // English headword ("Hung Kings' Temple Festival") across two lines.
    if (/^[A-Za-z][A-Za-z'’ -]*$/u.test(line)) {
      pendingHeadword = `${pendingHeadword} ${line}`.trim();
      continue;
    }

    if (currentItem && (hasVietnameseText(line) || !currentItem.meaning)) {
      currentItem.meaning = `${currentItem.meaning} ${line}`.trim();
    }
  }

  if (items.some((item) => !item.term || !item.reading || !item.meaning)) {
    const incomplete = items.find((item) => !item.term || !item.reading || !item.meaning);
    throw new Error(`Incomplete vocabulary row in topic "${title}": ${JSON.stringify(incomplete)}`);
  }

  return items;
}

function parseSource(text) {
  const lines = text.replace(/^\uFEFF/u, '').split(/\r?\n/u);
  const categoryHeaders = findCategoryHeaders(lines);
  if (categoryHeaders.length !== 50 || categoryHeaders.some((header, index) => header.number !== index + 1)) {
    throw new Error(`Expected 50 ordered topic headings; found ${categoryHeaders.length}.`);
  }

  return categoryHeaders.map((header, index) => {
    const endIndex = categoryHeaders[index + 1]?.index ?? lines.length;
    return {
      number: header.number,
      title: header.title,
      items: parseCategory(lines, header.index, endIndex, header.title)
    };
  });
}

function writeCourse(categories, outputDirectory = COURSE_DIRECTORY) {
  const totalVocabulary = categories.reduce((total, category) => total + category.items.length, 0);
  fs.mkdirSync(path.join(outputDirectory, 'vocabulary'), { recursive: true });

  const course = {
    code: 'ENG1000',
    title: '1.000 từ tiếng Anh thông dụng',
    shortDescription: `${totalVocabulary.toLocaleString('vi-VN')} mục từ tiếng Anh theo ${categories.length} chủ đề.`,
    description: 'Học từ vựng tiếng Anh theo chủ đề với phiên âm IPA, nghĩa tiếng Việt, flashcard, luyện gõ, trắc nghiệm và nghe thụ động.',
    level: 'OTHER',
    thumbnail: '',
    isPublished: true,
    sortOrder: 5,
    stats: {
      totalVocabulary,
      totalKanji: 0,
      totalGrammar: 0,
      totalExams: 0
    }
  };

  const lessons = categories.map((category) => {
    const lessonCode = `1-${category.number}`;
    const lessonTitle = `Từ vựng về ${category.title}`;
    const slug = `${lessonCode}-${slugify(category.title)}`;
    const lessonItems = category.items.map((item, index) => ({
      order: index + 1,
      term: item.term,
      reading: item.reading,
      romaji: '',
      partOfSpeech: 'Từ vựng',
      meaning: item.meaning,
      examples: []
    }));

    fs.writeFileSync(
      path.join(outputDirectory, 'vocabulary', `lesson-${lessonCode}.json`),
      `${JSON.stringify(lessonItems, null, 2)}\n`,
      'utf8'
    );

    return {
      lessonCode,
      slug,
      title: lessonTitle,
      description: `Từ tiếng Anh, IPA và nghĩa tiếng Việt thuộc chủ đề ${category.title}.`,
      order: category.number,
      itemCount: lessonItems.length
    };
  });

  fs.writeFileSync(path.join(outputDirectory, 'course.json'), `${JSON.stringify(course, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outputDirectory, 'vocabulary', 'lessons.json'), `${JSON.stringify(lessons, null, 2)}\n`, 'utf8');

  return { totalVocabulary, lessonCount: lessons.length };
}

if (require.main === module) {
  const sourcePath = path.resolve(process.argv[2] || DEFAULT_SOURCE);
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found: ${sourcePath}`);
    process.exitCode = 1;
  } else {
    try {
      const parsed = parseSource(fs.readFileSync(sourcePath, 'utf8'));
      const summary = writeCourse(parsed);
      console.log(`Created ENG1000 with ${summary.lessonCount} topics and ${summary.totalVocabulary.toLocaleString('vi-VN')} vocabulary rows.`);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}

module.exports = { findCategoryHeaders, parseSource, slugify, writeCourse };
