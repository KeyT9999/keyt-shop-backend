const axios = require('axios');

const DEFAULT_BASE = 'https://backend-c0r3-7xpq9zn2025.onrender.com';
const MAX_REQUESTS_PER_MINUTE = 10;
const RATE_WINDOW_MS = 60_000;

const requestTimestamps = [];

function assertConfigured() {
  const key = process.env.TIEM_BANH_X_API_KEY;
  if (!key) {
    const err = new Error('TIEM_BANH_X_API_KEY is not configured');
    err.code = 'TIEM_BANH_NOT_CONFIGURED';
    throw err;
  }
  return key;
}

async function waitForRateLimitSlot() {
  const now = Date.now();
  while (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldest = requestTimestamps[0];
    if (now - oldest >= RATE_WINDOW_MS) {
      requestTimestamps.shift();
      continue;
    }
    const wait = RATE_WINDOW_MS - (now - oldest) + 50;
    await new Promise((r) => setTimeout(r, wait));
    requestTimestamps.splice(
      0,
      requestTimestamps.length,
      ...requestTimestamps.filter((t) => Date.now() - t < RATE_WINDOW_MS)
    );
  }
  requestTimestamps.push(Date.now());
}

function getBaseUrl() {
  return (process.env.TIEM_BANH_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * GET /api/ctv-api/get-cookie
 * @returns {Promise<object>} Parsed Tiệm Bánh JSON
 */
async function getCookie() {
  assertConfigured();
  await waitForRateLimitSlot();
  const key = process.env.TIEM_BANH_X_API_KEY;
  const url = `${getBaseUrl()}/api/ctv-api/get-cookie`;
  const response = await axios.get(url, {
    headers: {
      'X-API-Key': key,
      'User-Agent': UA
    },
    timeout: 20_000,
    validateStatus: () => true
  });
  const data = response.data;
  if (response.status >= 400) {
    const err = new Error(data?.message || `Tiệm Bánh get-cookie HTTP ${response.status}`);
    err.code = 'TIEM_BANH_HTTP_ERROR';
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * POST /api/ctv-api/regenerate-token
 * @param {string} logId
 * @returns {Promise<{ success: boolean, pcLink?: string, mobileLink?: string, tokenExpires?: number, raw?: object }>}
 */
async function regenerateToken(logId) {
  assertConfigured();
  if (!logId || typeof logId !== 'string') {
    const err = new Error('logId is required');
    err.code = 'INVALID_LOG_ID';
    throw err;
  }
  await waitForRateLimitSlot();
  const key = process.env.TIEM_BANH_X_API_KEY;
  const url = `${getBaseUrl()}/api/ctv-api/regenerate-token`;
  try { 
    const response = await axios.post(
      url,
      { logId },
      {
        headers: {
          'X-API-Key': key,
          'Content-Type': 'application/json',
          'User-Agent': UA
        },
        timeout: 15_000
      }
    );
    const body = response.data;
    if (body && body.success && body.tokenLink) {
      const mobileLink = body.tokenLink;
      const pcLink = mobileLink.replace('unsupported', 'browse');
      return {
        success: true,
        pcLink,
        mobileLink,
        tokenExpires: body.tokenExpires || Math.floor(Date.now() / 1000) + 3500,
        raw: body
      };
    }
    return { success: false, raw: body };
  } catch (e) {
    const message = e.response?.data?.message || e.message || 'regenerate-token failed';
    const err = new Error(message);
    err.code = 'TIEM_BANH_REGEN_ERROR';
    err.responseData = e.response?.data;
    throw err;
  }
}

function mapGetCookieSuccess(data) {
  if (!data || !data.success) {
    return null;
  }
  return {
    logId: data.logId,
    cookie: data.cookie,
    pcLoginLink: data.pcLoginLink,
    mobileLoginLink: data.mobileLoginLink,
    tokenExpires: data.tokenExpires,
    timeRemaining: data.timeRemaining,
    cookieNumber: data.cookieNumber,
    quota: data.quota
  };
}

module.exports = {
  getCookie,
  regenerateToken,
  mapGetCookieSuccess,
  waitForRateLimitSlot,
  getBaseUrl
};
