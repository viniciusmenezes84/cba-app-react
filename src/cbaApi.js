const FUNCTION_BASE = 'https://vqirdswgchlcxevepamu.supabase.co/functions/v1';
const FUNCTION_NAMES = new Set(['cba-gateway', 'cba-admin', 'cba-portal', 'cba-medical']);
const SESSION_KEYS = ['cba_session_v1', 'cba_session_v2'];
const BACKEND_EPOCH_KEY = 'cba_backend_epoch';

// A migração inicial invalida uma única vez sessões anteriores ao backend atual.
try {
  if (window.localStorage.getItem(BACKEND_EPOCH_KEY) !== 'supabase-v2') {
    SESSION_KEYS.forEach(key => window.localStorage.removeItem(key));
    window.sessionStorage.removeItem('cba_session_v2');
    window.localStorage.setItem(BACKEND_EPOCH_KEY, 'supabase-v2');
  }
} catch { /* armazenamento pode estar indisponível */ }

export function readSession() {
  for (const key of SESSION_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const user = parsed?.user?.user || parsed?.user || parsed;
      const token = parsed?.user?.token || parsed?.user?.user?.token || parsed?.token || user?.token;
      if (token) return {
        token,
        role: String(user?.role || parsed?.role || '').toUpperCase(),
        email: String(user?.email || parsed?.email || '').toLowerCase(),
        name: user?.name || '',
        user,
      };
    } catch { /* tenta a próxima sessão */ }
  }
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem('cba_session_v2') || 'null');
    const user = parsed?.user?.user || parsed?.user || parsed;
    if (parsed) return {
      token: parsed?.token || parsed?.user?.token || user?.token || null,
      role: String(user?.role || parsed?.role || '').toUpperCase(),
      email: String(user?.email || parsed?.email || '').toLowerCase(),
      name: user?.name || '',
      user,
    };
  } catch { /* sessão ausente */ }
  return { token: null, role: '', email: '', name: '', user: null };
}

export class CbaApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'CbaApiError';
    this.status = status;
    this.code = code;
  }
}

export async function callFunction(functionName, action, payload = {}, { signal, token: explicitToken } = {}) {
  if (!FUNCTION_NAMES.has(functionName)) throw new Error('Função do portal desconhecida.');
  if (!action) throw new Error('Ação do portal não informada.');
  const isLogin = functionName === 'cba-gateway' && action === 'loginUser';
  const params = { ...payload };
  const payloadToken = params.token;
  delete params.action;
  delete params.token;
  const token = isLogin ? null : (explicitToken || payloadToken || readSession().token);
  if (!isLogin && !token) throw new CbaApiError('Sessão não encontrada. Entre novamente no portal.', 401, 'UNAUTHORIZED');

  const response = await fetch(`${FUNCTION_BASE}/${functionName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(isLogin ? { action, ...params } : { action, ...params, token }),
    signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.result === 'error') {
    throw new CbaApiError(data?.message || `Erro do servidor (${response.status}).`, response.status, data?.code);
  }
  return data;
}

export const gatewayPost = (action, payload, options) => callFunction('cba-gateway', action, payload, options);
export const adminPost = (action, payload, options) => callFunction('cba-admin', action, payload, options);
export const portalPost = (action, payload, options) => callFunction('cba-portal', action, payload, options);
export const medicalPost = (action, payload, options) => callFunction('cba-medical', action, payload, options);

// XHR exposes actual upload progress; the server still validates the session and image.
export function uploadProfilePhoto(imageBase64, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const token = readSession().token;
    if (!token) { reject(new CbaApiError('Sessão não encontrada. Entre novamente no portal.', 401, 'UNAUTHORIZED')); return; }
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const finish = (error, data) => { signal?.removeEventListener('abort', abort); error ? reject(error) : resolve(data); };
    xhr.open('POST', `${FUNCTION_BASE}/cba-portal`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 60000;
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(Math.min(95, Math.round(event.loaded / event.total * 95))); };
    xhr.onload = () => {
      let data; try { data = JSON.parse(xhr.responseText); } catch { /* invalid server response */ }
      if (xhr.status < 200 || xhr.status >= 300 || !data || data.result === 'error') {
        finish(new CbaApiError(data?.message || 'Não foi possível confirmar o envio. Atualize o perfil antes de tentar novamente.', xhr.status, data?.code));
      } else { onProgress?.(100); finish(null, data); }
    };
    xhr.onerror = xhr.ontimeout = () => finish(new CbaApiError('Conexão interrompida. Atualize o perfil para conferir se a foto foi salva antes de reenviar.', 0, 'NETWORK_ERROR'));
    xhr.onabort = () => finish(new CbaApiError('Envio cancelado.', 0, 'ABORTED'));
    if (signal?.aborted) { finish(new CbaApiError('Envio cancelado.', 0, 'ABORTED')); return; }
    signal?.addEventListener('abort', abort, { once: true });
    onProgress?.(0);
    xhr.send(JSON.stringify({ action: 'uploadMyPhoto', token, imageBase64 }));
  });
}
