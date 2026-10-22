const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const CACHE_DIR = process.platform === 'linux'
  ? '/var/cache/keyt-neural-tts'
  : path.join(os.tmpdir(), 'keyt-neural-tts-cache');

const memoryCache = new Map();
const MAX_MEMORY_ITEMS = 600;

try {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
} catch {
  // ignore
}

const NEURAL_VOICES = {
  'ja': 'ja-JP-NanamiNeural',
  'ja-jp': 'ja-JP-NanamiNeural',
  'zh': 'zh-CN-XiaoxiaoNeural',
  'zh-cn': 'zh-CN-XiaoxiaoNeural',
  'en': 'en-US-AriaNeural',
  'en-us': 'en-US-AriaNeural',
  'en-gb': 'en-GB-SoniaNeural',
  'vi': 'vi-VN-HoaiMyNeural',
  'vi-vn': 'vi-VN-HoaiMyNeural',
};

function normalizeLang(lang = 'en-US') {
  const clean = String(lang || 'en-US').trim().toLowerCase();
  if (clean.startsWith('ja')) return { tl: 'ja', voice: NEURAL_VOICES['ja-jp'] };
  if (clean.startsWith('zh')) return { tl: 'zh-CN', voice: NEURAL_VOICES['zh-cn'] };
  if (clean.startsWith('vi')) return { tl: 'vi', voice: NEURAL_VOICES['vi-vn'] };
  if (clean === 'en-gb') return { tl: 'en', voice: NEURAL_VOICES['en-gb'] };
  return { tl: 'en', voice: NEURAL_VOICES['en-us'] };
}

function setMemoryCache(key, buffer) {
  if (memoryCache.size >= MAX_MEMORY_ITEMS) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, buffer);
}

async function generateWithEdgeTts(text, voice, outFile) {
  const candidates = [
    '/opt/tts-venv/bin/edge-tts',
    'edge-tts',
  ];

  for (const bin of candidates) {
    try {
      if (bin.startsWith('/') && !fs.existsSync(bin)) continue;
      await execFileAsync(
        bin,
        ['--voice', voice, '--text', text, '--write-media', outFile],
        { timeout: 8000 }
      );
      const stat = await fsp.stat(outFile);
      if (stat.size > 200) {
        return await fsp.readFile(outFile);
      }
    } catch {
      // Fall through to next candidate or cloud fallback
    }
  }
  return null;
}

async function generateWithGoogleTts(text, tl) {
  const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`Google TTS status ${res.status}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/**
 * Synthesize speech to an MP3 Buffer with persistent SSD + RAM caching
 * @param {string} rawText
 * @param {string} rawLang
 * @returns {Promise<{ buffer: Buffer, engine: string, voice: string }>}
 */
async function synthesizeSpeech(rawText, rawLang = 'en-US') {
  const text = String(rawText || '').trim().slice(0, 300);
  if (!text) {
    throw new Error('Missing text for TTS');
  }

  const { tl, voice } = normalizeLang(rawLang);
  const hash = crypto.createHash('sha256').update(`${voice}|${text}`).digest('hex').slice(0, 32);
  const cacheFile = path.join(CACHE_DIR, `${hash}.mp3`);

  // 1. Check RAM cache
  if (memoryCache.has(hash)) {
    return { buffer: memoryCache.get(hash), engine: 'memory-cache', voice };
  }

  // 2. Check SSD Disk cache
  try {
    const existing = await fsp.readFile(cacheFile);
    if (existing && existing.length > 200) {
      setMemoryCache(hash, existing);
      return { buffer: existing, engine: 'disk-cache', voice };
    }
  } catch {
    // Not in disk cache yet
  }

  // 3. Try Microsoft Azure Neural TTS (edge-tts on VPS)
  const edgeBuffer = await generateWithEdgeTts(text, voice, cacheFile);
  if (edgeBuffer && edgeBuffer.length > 200) {
    setMemoryCache(hash, edgeBuffer);
    return { buffer: edgeBuffer, engine: `neural-${voice}`, voice };
  }

  // 4. Fallback to Google Cloud Translate TTS stream and persist to disk cache
  const googleBuffer = await generateWithGoogleTts(text, tl);
  if (googleBuffer && googleBuffer.length > 200) {
    setMemoryCache(hash, googleBuffer);
    try {
      await fsp.writeFile(cacheFile, googleBuffer);
    } catch {
      // ignore write error
    }
    return { buffer: googleBuffer, engine: `google-tts-${tl}`, voice };
  }

  throw new Error('Unable to synthesize speech');
}

module.exports = {
  synthesizeSpeech,
};
