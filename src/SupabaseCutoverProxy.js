const LEGACY_URL = 'https://script.google.com/macros/s/AKfycbwNXGI4Cc5qGBye-IfWW_qqUcJ04NfArulExPXE4jgX0SZhWAmeWCjjKg2U9FFfHkHE/exec';
const SUPABASE_URL = 'https://vqirdswgchlcxevepamu.supabase.co/functions/v1/legacy-api';
const SESSION_STORAGE_KEY = 'cba_session_v1';

const originalFetch = window.fetch.bind(window);

function readLegacyToken() {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user?.token || parsed?.user?.user?.token || null;
  } catch {
    return null;
  }
}

function isLegacyBackendUrl(input) {
  const value = typeof input === 'string' ? input : input?.url;
  return value === LEGACY_URL;
}

async function rewriteRequest(input, init = {}) {
  if (!isLegacyBackendUrl(input)) return { input, init };

  const nextInit = { ...init };
  if (typeof nextInit.body === 'string') {
    try {
      const body = JSON.parse(nextInit.body);
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const token = body.token || readLegacyToken();
        if (token && body.action !== 'loginUser') body.token = token;
        nextInit.body = JSON.stringify(body);
      }
    } catch {
      // Mantém o corpo original caso não seja JSON.
    }
  }

  return { input: SUPABASE_URL, init: nextInit };
}

window.fetch = async (input, init) => {
  const rewritten = await rewriteRequest(input, init);
  return originalFetch(rewritten.input, rewritten.init);
};

window.__CBA_BACKEND__ = {
  mode: 'supabase-cutover',
  endpoint: SUPABASE_URL,
};

export {};
