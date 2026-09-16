const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwNXGI4Cc5qGBye-IfWW_qqUcJ04NfArulExPXE4jgX0SZhWAmeWCjjKg2U9FFfHkHE/exec';
const SUPABASE_URL = 'https://vqirdswgchlcxevepamu.supabase.co/functions/v1/cba-api';
const SESSION_STORAGE_KEYS = ['cba_session_v1', 'cba_session_v2'];
const BACKEND_EPOCH_KEY = 'cba_backend_epoch';
const BACKEND_EPOCH = 'supabase-v1';

const originalFetch = window.fetch.bind(window);

// O corte para Supabase invalida uma única vez as sessões emitidas pelo Apps Script.
// Isso evita que o app restaure um token legado e pareça autenticado sem estar.
try {
  if (window.localStorage.getItem(BACKEND_EPOCH_KEY) !== BACKEND_EPOCH) {
    SESSION_STORAGE_KEYS.forEach(key => window.localStorage.removeItem(key));
    try { window.sessionStorage.removeItem('cba_session_v2'); } catch { /* sem impacto */ }
    window.localStorage.setItem(BACKEND_EPOCH_KEY, BACKEND_EPOCH);
  }
} catch { /* armazenamento pode estar indisponível em modo privado */ }

function readSessionToken() {
  for (const key of SESSION_STORAGE_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const token = parsed?.user?.token || parsed?.user?.user?.token || parsed?.token;
      if (token) return token;
    } catch { /* tenta a próxima chave */ }
  }
  try {
    const raw = window.sessionStorage.getItem('cba_session_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.token || parsed?.user?.token || null;
    }
  } catch { /* sem impacto */ }
  return null;
}

function isBackendUrl(input) {
  const value = typeof input === 'string' ? input : input?.url;
  return value === APP_SCRIPT_URL || value === SUPABASE_URL;
}

function rewriteRequest(input, init = {}) {
  if (!isBackendUrl(input)) return { input, init };

  const nextInit = { ...init };
  if (typeof nextInit.body === 'string') {
    try {
      const body = JSON.parse(nextInit.body);
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const token = body.token || readSessionToken();
        if (token && body.action !== 'loginUser') body.token = token;
        nextInit.body = JSON.stringify(body);
      }
    } catch {
      // Mantém o corpo original caso uma chamada futura não use JSON.
    }
  }

  return { input: SUPABASE_URL, init: nextInit };
}

window.fetch = async (input, init) => {
  const rewritten = rewriteRequest(input, init);
  return originalFetch(rewritten.input, rewritten.init);
};

window.__CBA_BACKEND__ = {
  mode: 'supabase',
  provider: 'Supabase',
  endpoint: SUPABASE_URL,
};

export {};
