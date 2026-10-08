require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const CourseLesson = require('../src/models/course-lesson.model');
const VocabularyItem = require('../src/models/vocabulary-item.model');
const { createVivibeTtsClient } = require('../src/services/vivibe-tts.service');

function parseOptions(args) {
  const options = { dryRun: false, listVoices: false, limit: null, courseCode: 'HSK1' };

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (args[index] === '--list-voices') {
      options.listVoices = true;
      continue;
    }

    if (args[index] === '--limit') {
      const limit = Number(args[index + 1]);
      if (!Number.isSafeInteger(limit) || limit < 1) {
        throw new Error('--limit must be a positive whole number.');
      }
      options.limit = limit;
      index += 1;
      continue;
    }

    if (args[index] === '--course') {
      const courseCode = args[index + 1]?.toUpperCase();
      if (!/^HSK\d+$/.test(courseCode || '')) {
        throw new Error('--course must be an HSK course code, such as HSK1 or HSK2.');
      }
      options.courseCode = courseCode;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${args[index]}`);
  }

  return options;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));

  if (options.listVoices) {
    if (!process.env.VIVIBE_API_KEY) throw new Error('VIVIBE_API_KEY is required.');
    const tts = createVivibeTtsClient({ apiKey: process.env.VIVIBE_API_KEY });
    const voices = await tts.getUserVoices();
    voices.forEach((voice) => {
      const language = voice.language || voice.locale || voice.lang || 'not provided';
      console.info(`${voice.name || 'Unnamed voice'} | ${voice.id} | active=${voice.isActive !== false} | language=${language}`);
    });
    return;
  }

  const configuredMongoUrl = process.env.MONGODB_URL || process.env.MONGODB_URI;
  if (!configuredMongoUrl) throw new Error('MONGODB_URL or MONGODB_URI is required.');

  await connectDB();

  try {
    const lessons = await CourseLesson.find({ courseCode: options.courseCode, sectionType: 'vocabulary' })
      .sort({ order: 1 })
      .select('_id order')
      .lean();
    const lessonOrder = new Map(lessons.map((lesson) => [lesson._id.toString(), lesson.order]));
    const lessonIds = lessons.map((lesson) => lesson._id);

    const pendingItems = await VocabularyItem.find({
      courseCode: options.courseCode,
      lessonId: { $in: lessonIds },
      $or: [{ audioUrl: { $exists: false } }, { audioUrl: '' }, { audioUrl: null }]
    })
      .select('_id lessonId order term')
      .lean();

    pendingItems.sort((left, right) => {
      const lessonDiff =
        (lessonOrder.get(left.lessonId.toString()) || 0) -
        (lessonOrder.get(right.lessonId.toString()) || 0);
      return lessonDiff || left.order - right.order;
    });

    const selectedItems = options.limit ? pendingItems.slice(0, options.limit) : pendingItems;
    console.info(`${options.courseCode} Chinese words without saved audio: ${pendingItems.length}.`);
    console.info(`Selected for this run: ${selectedItems.length}.`);

    if (options.dryRun) return;
    if (!process.env.VIVIBE_API_KEY) throw new Error('VIVIBE_API_KEY is required.');
    if (!process.env.VIVIBE_USER_VOICE_ID) throw new Error('VIVIBE_USER_VOICE_ID is required.');
    if (selectedItems.length === 0) return;

    const tts = createVivibeTtsClient({ apiKey: process.env.VIVIBE_API_KEY });
    const voices = await tts.getUserVoices();
    const selectedVoice = voices.find((voice) => voice.id === process.env.VIVIBE_USER_VOICE_ID);
    if (!selectedVoice || selectedVoice.isActive === false) {
      throw new Error('The configured Vivibe voice ID was not found or is inactive.');
    }

    console.info(`Using active Vivibe voice: ${selectedVoice.name || selectedVoice.id}.`);
    console.warn('Vivibe docs do not identify voice language; listen to a sample before relying on Mandarin pronunciation.');

    let saved = 0;
    for (const item of selectedItems) {
      try {
        const audioUrl = await tts.createSpeech(item.term, selectedVoice.id);
        const result = await VocabularyItem.updateOne(
          {
            _id: item._id,
            $or: [{ audioUrl: { $exists: false } }, { audioUrl: '' }, { audioUrl: null }]
          },
          { $set: { audioUrl } }
        );

        if (result.modifiedCount > 0) saved += 1;
        console.info(`Saved audio for ${options.courseCode} word ${item.term} (${saved}/${selectedItems.length}).`);
      } catch (error) {
        console.error(`Stopped at ${options.courseCode} word ${item.term}: ${error.message}`);
        break;
      }
    }

    console.info(`Finished. Saved ${saved} of ${selectedItems.length} selected audio URLs.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(`HSK audio generation failed: ${error.message}`);
  process.exitCode = 1;
});
