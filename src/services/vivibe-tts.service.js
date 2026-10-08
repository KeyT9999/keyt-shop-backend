const VIVIBE_RPC_URL = 'https://api.lucylab.io/json-rpc';
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_MAX_POLLS = 45;

function parseHttpsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

function createVivibeTtsClient({
  apiKey,
  fetchImpl = globalThis.fetch,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  maxPolls = DEFAULT_MAX_POLLS,
  sleep = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs))
}) {
  if (!apiKey) throw new Error('VIVIBE_API_KEY is required.');
  if (typeof fetchImpl !== 'function') throw new Error('This Node.js runtime must provide fetch().');

  async function call(method, input) {
    let response;
    try {
      response = await fetchImpl(VIVIBE_RPC_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ method, input }),
        signal: AbortSignal.timeout(30_000)
      });
    } catch {
      throw new Error(`Vivibe ${method} request failed.`);
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error(`Vivibe ${method} returned an invalid response.`);
    }

    if (!response.ok || payload?.error || !payload?.result) {
      throw new Error(`Vivibe ${method} request was rejected.`);
    }

    return payload.result;
  }

  return {
    async getUserVoices() {
      const pageSize = 10;
      const firstPage = await call('getUserVoices', { limit: pageSize, page: 1 });
      if (!Array.isArray(firstPage.items)) throw new Error('Vivibe voice list is invalid.');

      const voices = [...firstPage.items];
      const total = Number.isSafeInteger(firstPage.total) ? firstPage.total : voices.length;
      const pageCount = Math.min(Math.ceil(total / pageSize), 50);

      for (let page = 2; page <= pageCount; page += 1) {
        const result = await call('getUserVoices', { limit: pageSize, page });
        if (!Array.isArray(result.items)) throw new Error('Vivibe voice list is invalid.');
        voices.push(...result.items);
      }

      return voices;
    },

    async createSpeech(text, userVoiceId) {
      if (typeof text !== 'string' || !text.trim()) throw new Error('Text for speech generation is required.');
      if (typeof userVoiceId !== 'string' || !userVoiceId.trim()) throw new Error('A Vivibe voice ID is required.');

      const job = await call('ttsLongText', {
        text: text.trim(),
        userVoiceId: userVoiceId.trim(),
        speed: 0.9
      });
      const exportId = typeof job.projectExportId === 'string' ? job.projectExportId.trim() : '';
      if (!exportId) throw new Error('Vivibe did not return an export ID.');

      for (let attempt = 0; attempt < maxPolls; attempt += 1) {
        await sleep(pollIntervalMs);
        const status = await call('getExportStatus', { projectExportId: exportId });
        const state = typeof status.state === 'string' ? status.state.toLowerCase() : '';

        if (state === 'completed') {
          const audioUrl = parseHttpsUrl(status.url);
          if (!audioUrl) throw new Error('Vivibe returned an invalid audio URL.');
          return audioUrl;
        }
        if (state === 'failed') throw new Error('Vivibe could not generate audio for this word.');
      }

      throw new Error('Vivibe audio generation timed out.');
    }
  };
}

module.exports = {
  VIVIBE_RPC_URL,
  createVivibeTtsClient,
  parseHttpsUrl
};
