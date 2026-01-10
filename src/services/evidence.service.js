const axios = require('axios');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const MAX_RESULTS = 5;
const MAX_CONTENT_LENGTH = 6 * 1024 * 1024; // 6MB limit to avoid huge downloads
const REQUEST_TIMEOUT_MS = 20000;

// Preferred high-trust sources (domain regex and weight)
const PREFERRED_SOURCES = [
  // General top journals
  { label: 'Nature', domain: /(?:^|\.)nature\.com$/, score: 1.0 },
  { label: 'Science', domain: /(?:^|\.)science\.org$/, score: 1.0 },
  { label: 'PNAS', domain: /(?:^|\.)pnas\.org$/, score: 0.95 },
  // Medicine / Biology
  { label: 'The Lancet', domain: /(?:^|\.)thelancet\.com$/, score: 1.0 },
  { label: 'NEJM', domain: /(?:^|\.)nejm\.org$/, score: 1.0 },
  { label: 'JAMA', domain: /(?:^|\.)jamanetwork\.com$/, score: 0.95 },
  { label: 'Nature Medicine', domain: /(?:^|\.)nature\.com$/, score: 0.9 },
  { label: 'Cell', domain: /(?:^|\.)cell\.com$/, score: 0.9 },
  { label: 'BMJ', domain: /(?:^|\.)bmj\.com$/, score: 0.85 },
  { label: 'PLOS', domain: /(?:^|\.)plos\.org$/, score: 0.8 },
  { label: 'Cochrane', domain: /(?:^|\.)cochranelibrary\.com$/, score: 0.95 },
  { label: 'PubMed', domain: /(?:^|\.)ncbi\.nlm\.nih\.gov$/, score: 0.9 },
  // CS / AI
  { label: 'IEEE', domain: /(?:^|\.)ieee\.org$/, score: 0.9 },
  { label: 'ACM', domain: /(?:^|\.)acm\.org$/, score: 0.9 },
  { label: 'arXiv', domain: /(?:^|\.)arxiv\.org$/, score: 0.6 }, // preprint
  // Economics / SSRN / NBER
  { label: 'NBER', domain: /(?:^|\.)nber\.org$/, score: 0.85 },
  { label: 'SSRN', domain: /(?:^|\.)ssrn\.com$/, score: 0.6 },
  // Law / Humanities
  { label: 'Harvard Law Review', domain: /(?:^|\.)harvardlawreview\.org$/, score: 0.9 },
  { label: 'Yale Law Journal', domain: /(?:^|\.)yalelawjournal\.org$/, score: 0.9 },
  // Datasets
  { label: 'Harvard Dataverse', domain: /(?:^|\.)dataverse\.harvard\.edu$/, score: 0.9 },
  { label: 'Zenodo', domain: /(?:^|\.)zenodo\.org$/, score: 0.8 },
  { label: 'Figshare', domain: /(?:^|\.)figshare\.com$/, score: 0.75 },
];

const defaultHeaders = {
  'User-Agent': 'KeyT-EvidenceChecker/1.0',
  Accept: '*/*',
};

function buildPrompt(query, maxResults) {
  return `
Bạn là trợ lý fact-check học thuật.
Nhiệm vụ: tìm tối đa ${maxResults} nguồn học thuật/uy tín (DOI, PDF, trang cơ quan, publisher)
có bằng chứng trực tiếp cho yêu cầu: "${query}".

Ưu tiên mạnh cho các nguồn: Nature, Science, PNAS, The Lancet, NEJM, JAMA, BMJ, Cochrane, PubMed/PMC,
IEEE/ACM/NeurIPS/ICML/CVPR/ACL/EMNLP, arXiv (preprint), NBER/SSRN (làm rõ nếu preprint),
Harvard/Stanford/MIT/Oxford official, IEEE Xplore, ACM Digital Library, Harvard Dataverse, Zenodo, Figshare.
Luôn trả về DOI hoặc link chính thức của publisher/cơ quan (không dùng blog/medium/news).

Yêu cầu bắt buộc cho mỗi kết quả:
- "title": tiêu đề bài/nguồn.
- "url": link gốc (DOI / PDF / publisher / cơ quan).
- "snippet": trích nguyên văn 1-3 câu từ nguồn chứng minh cho yêu cầu.
- "location": vị trí (section/heading/page nếu PDF).
- "reasoning": 1-2 câu giải thích tại sao snippet là bằng chứng.
- "confidence": số 0-1, ước tính mức chắc chắn.
Trả về JSON với mảng "evidence".

Đừng bịa nguồn. Nếu không tìm thấy, trả về mảng rỗng.
`.trim();
}

function extractJson(text) {
  const trimmed = (text || '').trim();
  if (trimmed.startsWith('```')) {
    const withoutFence = trimmed.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    return withoutFence || trimmed;
  }
  return trimmed;
}

function getSourceMeta(url) {
  if (!url) return { sourceLabel: 'unknown', sourceScore: 0 };
  try {
    const domain = new URL(url).hostname.toLowerCase();
    const matched = PREFERRED_SOURCES.find((s) => s.domain.test(domain));
    if (matched) {
      return { sourceLabel: matched.label, sourceScore: matched.score };
    }
    return { sourceLabel: domain, sourceScore: 0.2 };
  } catch (e) {
    return { sourceLabel: 'unknown', sourceScore: 0 };
  }
}

function coerceEvidenceItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = (raw.title || raw.name || '').toString().trim();
  const url = (raw.url || raw.link || '').toString().trim();
  const snippet = (raw.snippet || raw.quote || raw.excerpt || '').toString().trim();

  if (!title && !url && !snippet) {
    return null;
  }

  return {
    title,
    url,
    snippet,
    location: (raw.location || raw.section || '').toString().trim(),
    reasoning: (raw.reasoning || raw.reason || '').toString().trim(),
    confidence: Number.isFinite(raw.confidence) ? raw.confidence : undefined,
    ...getSourceMeta(url),
  };
}

function parseEvidenceResponse(text, maxResults) {
  const jsonText = extractJson(text);
  try {
    const parsed = JSON.parse(jsonText);
    const evidenceArray = Array.isArray(parsed.evidence) ? parsed.evidence : Array.isArray(parsed) ? parsed : [];
    const items = evidenceArray
      .map(coerceEvidenceItem)
      .filter(Boolean)
      .slice(0, maxResults);
    return items;
  } catch (error) {
    console.error('Failed to parse Gemini evidence JSON', { error, jsonText });
    throw new Error('Định dạng phản hồi từ Gemini không hợp lệ.');
  }
}

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[“”‘’]/g, '"')
    .replace(/[^\p{L}\p{N}\s.,-]/gu, '');
}

function diceCoefficient(aTokens, bTokens) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  a.forEach((token) => {
    if (b.has(token)) overlap += 1;
  });
  return (2 * overlap) / (a.size + b.size);
}

function scoreSnippetAgainstSource(snippet, sourceText) {
  const normalizedSnippet = normalizeText(snippet);
  const normalizedSource = normalizeText(sourceText);

  if (!normalizedSnippet || !normalizedSource) return 0;
  if (normalizedSource.includes(normalizedSnippet)) return 1;

  const snippetWords = normalizedSnippet.split(' ').filter(Boolean);
  const sourceWords = normalizedSource.split(' ').filter(Boolean);

  if (snippetWords.length === 0 || sourceWords.length === 0) return 0;

  const windowSize = Math.min(
    Math.max(snippetWords.length + 6, snippetWords.length * 2),
    120
  );
  const step = Math.max(5, Math.floor(windowSize / 2));
  let best = 0;

  for (let i = 0; i < sourceWords.length; i += step) {
    const window = sourceWords.slice(i, i + windowSize);
    const score = diceCoefficient(snippetWords, window);
    if (score > best) best = score;
    if (best > 0.92) break; // good enough
  }

  return best;
}

function stripHtml(html) {
  return (html || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchSourceText(url) {
  if (!url) return { text: '', sourceType: 'unknown', error: 'Thiếu URL' };

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      maxContentLength: MAX_CONTENT_LENGTH,
      headers: defaultHeaders,
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const contentType = (response.headers['content-type'] || '').toLowerCase();
    const dataBuffer = Buffer.isBuffer(response.data)
      ? response.data
      : Buffer.from(response.data);

    if (contentType.includes('pdf') || url.toLowerCase().includes('.pdf')) {
      try {
        const parsed = await pdfParse(dataBuffer);
        return { text: parsed.text || '', sourceType: 'pdf' };
      } catch (error) {
        return { text: '', sourceType: 'pdf', error: 'Không thể đọc PDF' };
      }
    }

    const html = dataBuffer.toString('utf-8');
    return { text: stripHtml(html), sourceType: 'html' };
  } catch (error) {
    return { text: '', sourceType: 'unknown', error: error.message || 'Không thể tải nguồn' };
  }
}

async function verifyEvidenceItem(item) {
  if (!item?.url) {
    return { ...item, verification: 'unknown', verificationNote: 'Thiếu URL nguồn' };
  }

  const { text, sourceType, error } = await fetchSourceText(item.url);
  if (!text) {
    const trustedFallback = (item.sourceScore || 0) >= 0.85;
    return {
      ...item,
      verification: trustedFallback ? 'trusted' : 'unknown',
      verificationNote: error
        ? `Không tải được nguồn (${error}). Đây là nguồn ${trustedFallback ? 'uy tín, giữ ở mức trusted pending fetch' : 'chưa xác định'}.`
        : 'Không thể tải nội dung nguồn',
      sourceType,
    };
  }

  const score = scoreSnippetAgainstSource(item.snippet || '', text);
  const verified = score >= 0.68;

  return {
    ...item,
    sourceType,
    verification: verified ? 'verified' : 'unverified',
    verificationScore: Number(score.toFixed(3)),
    verificationNote: verified ? 'Snippet khớp với nội dung nguồn' : 'Không tìm thấy snippet hoặc độ khớp thấp',
  };
}

async function findEvidence({ query, apiKey, maxResults = MAX_RESULTS }) {
  if (!query || !query.trim()) {
    const error = new Error('Nội dung cần xác thực không được để trống.');
    error.statusCode = 400;
    throw error;
  }
  if (!apiKey || !apiKey.trim()) {
    const error = new Error('Gemini API Key không được để trống.');
    error.statusCode = 400;
    throw error;
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/ecf9733f-069b-4ee1-85c3-cb2589b35e6c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H1',
      location: 'evidence.service.js:findEvidence:entry',
      message: 'findEvidence entry',
      data: { hasQuery: !!query, hasApiKey: !!apiKey, maxResults },
      timestamp: Date.now(),
    }),
  }).catch(() => { });
  // #endregion

  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const toolsConfig = [{ googleSearch: {} }];
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: toolsConfig,
  });

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/ecf9733f-069b-4ee1-85c3-cb2589b35e6c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H2',
      location: 'evidence.service.js:modelSetup',
      message: 'Model configured',
      data: { model: 'gemini-2.5-flash', tools: toolsConfig },
      timestamp: Date.now(),
    }),
  }).catch(() => { });
  // #endregion

  const prompt = buildPrompt(query, Math.min(maxResults, MAX_RESULTS));

  let text;
  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      // responseMimeType + tools is not supported in this endpoint -> remove
      generationConfig: {
        temperature: 0.2,
      },
    });

    text = result?.response?.text();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ecf9733f-069b-4ee1-85c3-cb2589b35e6c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H3',
        location: 'evidence.service.js:generateContent:success',
        message: 'Received response text length',
        data: { hasText: !!text, textLength: text ? text.length : 0 },
        timestamp: Date.now(),
      }),
    }).catch(() => { });
    // #endregion
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ecf9733f-069b-4ee1-85c3-cb2589b35e6c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H2',
        location: 'evidence.service.js:generateContent:error',
        message: 'generateContent error',
        data: {
          status: error?.response?.error?.code || error?.statusCode || null,
          message: error?.response?.error?.message || error?.message || '',
          tools: ['googleSearchRetrieval'],
        },
        timestamp: Date.now(),
      }),
    }).catch(() => { });
    // #endregion

    const apiMessage =
      error?.response?.error?.message ||
      error?.message ||
      'Đã xảy ra lỗi khi kết nối Gemini.';
    const err = new Error(apiMessage);
    err.statusCode = error?.response?.error?.code || 500;
    throw err;
  }

  if (!text) {
    const error = new Error('Không nhận được phản hồi từ Gemini.');
    error.statusCode = 502;
    throw error;
  }

  const items = parseEvidenceResponse(text, Math.min(maxResults, MAX_RESULTS));
  if (!items.length) return [];

  // Re-rank to prefer trusted sources; if we have any with score > 0, keep them,
  // otherwise fall back to original list.
  const sorted = items
    .slice()
    .sort((a, b) => (b.sourceScore || 0) - (a.sourceScore || 0));
  const trusted = sorted.filter((i) => (i.sourceScore || 0) > 0);
  const pick = trusted.length ? trusted : items;

  const verified = await Promise.all(pick.map(verifyEvidenceItem));
  return verified;
}

module.exports = {
  findEvidence,
};
