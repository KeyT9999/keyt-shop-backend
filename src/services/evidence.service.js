const axios = require('axios');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const MAX_RESULTS = 10;
const MAX_CONTENT_LENGTH = 6 * 1024 * 1024; // 6MB limit to avoid huge downloads
const REQUEST_TIMEOUT_MS = 20000;

// Preferred high-trust sources (domain regex and weight)
const PREFERRED_SOURCES = [
  // General top journals
  { label: 'Nature', domain: /(?:^|\.)nature\.com$/, score: 1.0 },
  { label: 'Science', domain: /(?:^|\.)science\.org$/, score: 1.0 },
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
  // Vietnamese credible sources
  { label: 'Vietnam Academy of Science', domain: /(?:^|\.)vast\.ac\.vn$/, score: 0.8 },
  { label: 'VNU Journal', domain: /(?:^|\.)vnu\.edu\.vn$/, score: 0.75 },
  { label: 'Vietnam Journals Online', domain: /(?:^|\.)vjol\.info\.vn$/, score: 0.7 },
];

// Safety settings - tránh lỗi RECITATION do block quá chặt
// Chỉ block ở mức HIGH (không block thấp/trung bình)
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

const defaultHeaders = {
  'User-Agent': 'KeyT-EvidenceChecker/1.0',
  Accept: '*/*',
};

/**
 * Phát hiện ngôn ngữ của query dựa trên ký tự tiếng Việt có dấu.
 * Trả về 'vi' nếu có dấu tiếng Việt, ngược lại trả về 'en'.
 */
function detectLanguage(query) {
  // Regex match các ký tự đặc trưng tiếng Việt có dấu
  const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;
  return vietnamesePattern.test(query) ? 'vi' : 'en';
}

/**
 * Build prompt theo ngôn ngữ. Lưu ý: KHÔNG yêu cầu trích nguyên văn (gây RECITATION).
 * Thay bằng yêu cầu paraphrase/tóm tắt nội dung.
 */
function buildPrompt(query, maxResults, lang = 'en') {
  if (lang === 'vi') {
    return `
Bạn là trợ lý fact-check học thuật chuyên về tài liệu tiếng Việt và quốc tế.
Nhiệm vụ: Tìm tối đa ${maxResults} nguồn học thuật/uy tín (DOI, PDF, trang cơ quan, publisher)
có bằng chứng trực tiếp cho tuyên bố sau: "${query}".

Ưu tiên nguồn: Nature, Science, PNAS, The Lancet, NEJM, JAMA, BMJ, Cochrane, PubMed/PMC,
IEEE/ACM/NeurIPS/ICML/CVPR/ACL/EMNLP, arXiv (preprint - ghi rõ), NBER/SSRN,
Harvard/Stanford/MIT/Oxford chính thức, IEEE Xplore, ACM Digital Library,
Harvard Dataverse, Zenodo, Figshare.
Với chủ đề Việt Nam: ưu tiên VAST (vast.ac.vn), VNU Journal, Vietnam Journals Online (vjol).
Luôn dùng DOI hoặc link chính thức của publisher/cơ quan.

Yêu cầu cho mỗi kết quả (KHÔNG trích nguyên văn - hãy tóm tắt/paraphrase bằng lời của bạn):
- "title": tiêu đề bài/nguồn.
- "url": link gốc (DOI / PDF / publisher / cơ quan).
- "snippet": TÓM TẮT BẰNG LỜI CỦA BẠN (không copy nguyên văn) 1-3 câu về nội dung nguồn liên quan tới tuyên bố.
- "location": vị trí (section/heading/page nếu PDF), để trống nếu không biết.
- "reasoning": 1-2 câu giải thích tại sao nguồn này là bằng chứng cho tuyên bố.
- "confidence": số từ 0 đến 1, ước tính mức chắc chắn nguồn hỗ trợ tuyên bố.

Trả về JSON với mảng "evidence". Không bịa nguồn. Nếu không tìm thấy, trả về mảng rỗng.
`.trim();
  }

  // English prompt (default)
  return `
You are an academic fact-checking assistant.
Task: Find up to ${maxResults} credible academic/official sources (DOI, PDF, publisher, government agency)
with direct evidence for the following claim: "${query}".

Prioritize: Nature, Science, PNAS, The Lancet, NEJM, JAMA, BMJ, Cochrane, PubMed/PMC,
IEEE/ACM/NeurIPS/ICML/CVPR/ACL/EMNLP, arXiv (note if preprint), NBER/SSRN (note if preprint),
Harvard/Stanford/MIT/Oxford official pages, IEEE Xplore, ACM Digital Library,
Harvard Dataverse, Zenodo, Figshare.
Always return DOI or official publisher/agency links (no blogs/medium/news sites).

Required fields per result (DO NOT copy verbatim text - paraphrase in your own words to avoid copyright):
- "title": title of the paper/source.
- "url": original link (DOI / PDF / publisher / agency).
- "snippet": PARAPHRASE IN YOUR OWN WORDS (do not copy verbatim) 1-3 sentences summarizing what this source says about the claim.
- "location": location (section/heading/page for PDFs), leave empty if unknown.
- "reasoning": 1-2 sentences explaining why this is evidence for the claim.
- "confidence": number 0-1, estimated certainty that this source supports the claim.

Return JSON with an "evidence" array. Do not fabricate sources. If none found, return empty array.
`.trim();
}

/**
 * Build prompt để tổng hợp Overall Verdict từ danh sách evidence đã tìm được.
 * Dùng ngôn ngữ phù hợp với query.
 */
function buildVerdictPrompt(query, evidenceItems, lang = 'en') {
  const evidenceSummary = evidenceItems
    .map((item, i) => `[${i + 1}] "${item.title}" - ${item.snippet || 'No snippet'} (confidence: ${item.confidence ?? 'N/A'})`)
    .join('\n');

  if (lang === 'vi') {
    return `
Bạn là trợ lý fact-check. Dựa trên các nguồn bằng chứng sau đây về tuyên bố "${query}":

${evidenceSummary}

Hãy đưa ra TỔNG KẾT fact-check. Trả về JSON với các trường sau:
- "verdict": một trong các giá trị: "supported" (được khoa học ủng hộ), "contested" (còn tranh cãi), "disputed" (bị bác bỏ), "insufficient" (không đủ bằng chứng).
- "confidence": số từ 0 đến 100, mức độ chắc chắn tổng thể (%).
- "summary": 2-3 câu tóm tắt kết luận bằng tiếng Việt, dễ hiểu cho người dùng phổ thông.
- "supporting_count": số nguồn ủng hộ tuyên bố.
- "opposing_count": số nguồn phản bác tuyên bố.

Chỉ trả về JSON, không có markdown.
`.trim();
  }

  return `
You are a fact-checking assistant. Based on the following evidence sources for the claim "${query}":

${evidenceSummary}

Provide an OVERALL VERDICT. Return JSON with:
- "verdict": one of: "supported" (scientifically supported), "contested" (debated), "disputed" (contradicted), "insufficient" (not enough evidence).
- "confidence": number 0-100, overall confidence percentage.
- "summary": 2-3 sentences summarizing the conclusion in plain language.
- "supporting_count": number of sources supporting the claim.
- "opposing_count": number of sources opposing the claim.

Return only JSON, no markdown.
`.trim();
}

function extractJson(text) {
  const trimmed = (text || '').trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (unfenced.startsWith('{') || unfenced.startsWith('[')) {
    const directJson = extractBalancedJson(unfenced, 0);
    return directJson || unfenced;
  }

  const objectStart = unfenced.indexOf('{');
  const arrayStart = unfenced.indexOf('[');
  const starts = [objectStart, arrayStart].filter((index) => index >= 0);
  const firstJsonStart = starts.length ? Math.min(...starts) : -1;
  if (firstJsonStart >= 0) {
    const embeddedJson = extractBalancedJson(unfenced, firstJsonStart);
    if (embeddedJson) return embeddedJson;
  }

  return unfenced;
}

function extractBalancedJson(text, startIndex) {
  const opener = text[startIndex];
  const closer = opener === '{' ? '}' : opener === '[' ? ']' : null;
  if (!closer) return '';

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = inString;
      continue;
    }
    if (char === '"') inString = !inString;
    if (inString) continue;
    if (char === opener) depth += 1;
    if (char === closer) depth -= 1;
    if (depth === 0) return text.slice(startIndex, i + 1);
  }

  return '';
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
    console.error('❌ Failed to parse Gemini evidence JSON', { error, jsonText });
    throw new Error('Định dạng phản hồi từ Gemini không hợp lệ.');
  }
}

function parseVerdictResponse(text) {
  const jsonText = extractJson(text);
  try {
    const parsed = JSON.parse(jsonText);
    return {
      verdict: ['supported', 'contested', 'disputed', 'insufficient'].includes(parsed.verdict)
        ? parsed.verdict
        : 'insufficient',
      confidence: Number.isFinite(parsed.confidence) ? Math.min(100, Math.max(0, parsed.confidence)) : 0,
      summary: (parsed.summary || '').toString().trim(),
      supporting_count: Number.isInteger(parsed.supporting_count) ? parsed.supporting_count : 0,
      opposing_count: Number.isInteger(parsed.opposing_count) ? parsed.opposing_count : 0,
    };
  } catch (error) {
    console.warn('⚠️ Failed to parse verdict JSON, returning default', { error });
    return null;
  }
}

function buildClaimSplitPrompt(text) {
  return `
Bạn là trợ lý fact-check. Hãy tách đoạn văn sau thành 2-5 tuyên bố độc lập.
Mỗi tuyên bố phải là một câu hoàn chỉnh, rõ nghĩa, và có thể fact-check riêng.

Đoạn văn:
"${text}"

Chỉ trả về JSON array hợp lệ, ví dụ:
["claim 1", "claim 2"]
Không trả về markdown hoặc giải thích.
`.trim();
}

function parseClaimSplitResponse(text) {
  const jsonText = extractJson(text);
  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((claim) => (claim || '').toString().trim())
      .filter(Boolean)
      .slice(0, 5);
  } catch (error) {
    console.error('❌ Failed to parse Gemini claim split JSON', { error, jsonText });
    const err = new Error('Định dạng phản hồi tách claim từ Gemini không hợp lệ.');
    err.statusCode = 502;
    throw err;
  }
}

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[""'']/g, '"')
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

/**
 * Tải nội dung từ URL và trả về text.
 * Nếu lỗi HTTP (4xx/5xx) hoặc timeout → đánh dấu broken: true.
 */
async function fetchSourceText(url) {
  if (!url) return { text: '', sourceType: 'unknown', error: 'Thiếu URL', broken: false };

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
        return { text: parsed.text || '', sourceType: 'pdf', broken: false };
      } catch (error) {
        return { text: '', sourceType: 'pdf', error: 'Không thể đọc PDF', broken: false };
      }
    }

    const html = dataBuffer.toString('utf-8');
    return { text: stripHtml(html), sourceType: 'html', broken: false };
  } catch (error) {
    // Phân biệt link lỗi thực sự (4xx/5xx, timeout) với lỗi khác
    const status = error?.response?.status;
    const isBroken = !!(
      (status && status >= 400) ||
      error.code === 'ECONNABORTED' || // axios timeout
      error.code === 'ENOTFOUND' ||    // DNS không tìm thấy
      error.code === 'ECONNREFUSED'
    );
    return {
      text: '',
      sourceType: 'unknown',
      error: error.message || 'Không thể tải nguồn',
      broken: isBroken,
      httpStatus: status || null,
    };
  }
}

async function verifyEvidenceItem(item) {
  if (!item?.url) {
    return { ...item, verification: 'unknown', verificationNote: 'Thiếu URL nguồn', broken: false };
  }

  const { text, sourceType, error, broken, httpStatus } = await fetchSourceText(item.url);

  // Đánh dấu link bị lỗi thực sự (404, 403, timeout, DNS fail...)
  if (broken) {
    return {
      ...item,
      verification: 'unknown',
      verificationNote: `Link không truy cập được${httpStatus ? ` (HTTP ${httpStatus})` : ''}.`,
      sourceType,
      broken: true,
    };
  }

  if (!text) {
    const trustedFallback = (item.sourceScore || 0) >= 0.85;
    return {
      ...item,
      verification: trustedFallback ? 'trusted' : 'unknown',
      verificationNote: error
        ? `Không tải được nội dung (${error}). ${trustedFallback ? 'Nguồn uy tín, giữ ở mức trusted.' : 'Chưa xác định.'}`
        : 'Không thể tải nội dung nguồn',
      sourceType,
      broken: false,
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
    broken: false,
  };
}

/**
 * Gọi Gemini để tổng hợp Overall Verdict từ evidence đã có.
 * Fail-safe: nếu lỗi thì trả về null (không crash luồng chính).
 */
async function fetchVerdict(query, evidenceItems, model, lang) {
  if (!evidenceItems || evidenceItems.length === 0) return null;

  try {
    const verdictPrompt = buildVerdictPrompt(query, evidenceItems, lang);
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: verdictPrompt }] }],
      generationConfig: { temperature: 0.1 },
      safetySettings: SAFETY_SETTINGS,
    });
    const text = result?.response?.text();
    if (!text) return null;
    return parseVerdictResponse(text);
  } catch (err) {
    // Verdict là tính năng phụ - không throw, chỉ log warning
    console.warn('⚠️ evidence.service: fetchVerdict failed (non-critical)', err?.message);
    return null;
  }
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

  // Phát hiện ngôn ngữ để build prompt phù hợp
  const lang = detectLanguage(query);
  console.log(`🔍 evidence.service: query lang=${lang}, maxResults=${maxResults}`);

  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = buildPrompt(query, Math.min(maxResults, MAX_RESULTS), lang);

  let text;
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
      // Safety settings: chỉ block ở ngưỡng HIGH để tránh false positive RECITATION
      safetySettings: SAFETY_SETTINGS,
    });

    text = result?.response?.text();
    console.log(`✅ evidence.service: Gemini response received, length=${text ? text.length : 0}`);
  } catch (error) {
    const rawMessage = error?.response?.error?.message || error?.message || '';

    // Xử lý riêng lỗi RECITATION - đưa ra message thân thiện
    if (rawMessage.toUpperCase().includes('RECITATION') || rawMessage.includes('Candidate was blocked')) {
      const err = new Error(
        'Gemini từ chối trả lời do lo ngại bản quyền nội dung. Hãy thử paraphrase lại câu hỏi hoặc đặt câu hỏi học thuật cụ thể hơn.'
      );
      err.statusCode = 422;
      err.code = 'RECITATION_BLOCKED';
      throw err;
    }

    const apiMessage = rawMessage || 'Đã xảy ra lỗi khi kết nối Gemini.';
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
  if (!items.length) {
    return { evidence: [], verdict: null };
  }

  // Re-rank ưu tiên nguồn uy tín
  const sorted = items.slice().sort((a, b) => (b.sourceScore || 0) - (a.sourceScore || 0));
  const trusted = sorted.filter((i) => (i.sourceScore || 0) > 0);
  const pick = trusted.length ? trusted : items;

  // Xác minh từng evidence item (kiểm tra link + text matching)
  const verified = await Promise.all(pick.map(verifyEvidenceItem));

  // Gọi Verdict sau khi đã có evidence (fail-safe: không throw nếu lỗi)
  const verdict = await fetchVerdict(query, verified, model, lang);

  return { evidence: verified, verdict };
}

async function splitClaims({ text, apiKey }) {
  if (!text || !text.trim()) {
    const error = new Error('Vui lòng nhập văn bản cần tách claim.');
    error.statusCode = 400;
    throw error;
  }
  if (text.trim().length < 30) {
    const error = new Error('Văn bản quá ngắn để tách claim.');
    error.statusCode = 400;
    throw error;
  }
  if (!apiKey || !apiKey.trim()) {
    const error = new Error('Gemini API Key không được để trống.');
    error.statusCode = 400;
    throw error;
  }

  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = buildClaimSplitPrompt(text.trim());

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 },
      safetySettings: SAFETY_SETTINGS,
    });
    const responseText = result?.response?.text();
    console.log(`✅ evidence.service: splitClaims response received, length=${responseText ? responseText.length : 0}`);
    return parseClaimSplitResponse(responseText);
  } catch (error) {
    if (error.statusCode) throw error;
    const err = new Error(error?.message || 'Đã xảy ra lỗi khi tách claim bằng Gemini.');
    err.statusCode = error?.response?.error?.code || 500;
    throw err;
  }
}

module.exports = {
  findEvidence,
  splitClaims,
  detectLanguage,
  __private: {
    extractJson,
    parseEvidenceResponse,
  },
};
