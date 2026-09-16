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

function readBody(init = {}) {
  if (typeof init.body !== 'string') return null;
  try {
    const parsed = JSON.parse(init.body);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function waitForSessionToken(signal) {
  const current = readSessionToken();
  if (current) return Promise.resolve(current);

  return new Promise((resolve, reject) => {
    let settled = false;
    let intervalId = null;
    let timeoutId = null;

    const cleanup = () => {
      if (intervalId) window.clearInterval(intervalId);
      if (timeoutId) window.clearTimeout(timeoutId);
      signal?.removeEventListener?.('abort', onAbort);
    };

    const finish = value => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      const error = new Error('The operation was aborted.');
      error.name = 'AbortError';
      reject(error);
    };

    const check = () => {
      const token = readSessionToken();
      if (token) finish(token);
    };

    if (signal?.aborted) return onAbort();
    signal?.addEventListener?.('abort', onAbort, { once: true });
    intervalId = window.setInterval(check, 120);
    timeoutId = window.setTimeout(() => finish(null), 10 * 60 * 1000);
    check();
  });
}

async function rewriteRequest(input, init = {}) {
  if (!isBackendUrl(input)) return { input, init };

  const nextInit = { ...init };
  const body = readBody(nextInit);

  if (body) {
    const action = String(body.action || '');
    let token = body.token || readSessionToken();

    // Os bridges de Presença/Relatórios/Mesário são montados junto com a tela de login.
    // No backend antigo as leituras eram públicas; no Supabase elas exigem sessão.
    // Em vez de deixar essas chamadas receberem 401 e renderizarem dashboards zerados,
    // aguardamos o login concluir e só então enviamos a primeira leitura.
    if (!token && action && action !== 'loginUser') {
      token = await waitForSessionToken(nextInit.signal);
    }

    if (token && action !== 'loginUser') body.token = token;
    nextInit.body = JSON.stringify(body);
  }

  return { input: SUPABASE_URL, init: nextInit };
}

window.fetch = async (input, init) => {
  const rewritten = await rewriteRequest(input, init);
  return originalFetch(rewritten.input, rewritten.init);
};

window.__CBA_BACKEND__ = {
  mode: 'supabase',
  provider: 'Supabase',
  endpoint: SUPABASE_URL,
};

export {};
