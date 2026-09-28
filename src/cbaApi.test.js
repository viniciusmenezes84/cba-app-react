import { adminPost, callFunction, CbaApiError, gatewayPost, medicalPost, portalPost, readSession } from './cbaApi';

const token = 'a'.repeat(64);
const originalFetch = global.fetch;

beforeEach(() => {
  window.localStorage.removeItem('cba_session_v1');
  window.localStorage.removeItem('cba_session_v2');
  window.sessionStorage.removeItem('cba_session_v2');
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ result: 'success' }) }));
});

afterAll(() => { global.fetch = originalFetch; });

test('login usa o gateway da Supabase sem token antigo', async () => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({ user: { token, role: 'ADMIN' } }));
  await gatewayPost('loginUser', { email: 'atleta@cba.test', password: 'senha-de-teste' });
  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toBe('https://vqirdswgchlcxevepamu.supabase.co/functions/v1/cba-gateway');
  expect(options.headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(options.body)).toEqual({ action: 'loginUser', email: 'atleta@cba.test', password: 'senha-de-teste' });
});

test('cada módulo envia a sessão para a função correta', async () => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({ user: { token, role: 'ADMIN', email: 'admin@cba.test' } }));
  expect(readSession()).toMatchObject({ token, role: 'ADMIN', email: 'admin@cba.test' });
  await gatewayPost('getInitialAppData');
  await adminPost('bootstrap');
  await portalPost('bootstrap');
  await medicalPost('bootstrap');
  expect(global.fetch.mock.calls.map(([url, options]) => ({
    functionName: url.split('/').pop(),
    body: JSON.parse(options.body),
  }))).toEqual([
    { functionName: 'cba-gateway', body: { action: 'getInitialAppData', token } },
    { functionName: 'cba-admin', body: { action: 'bootstrap', token } },
    { functionName: 'cba-portal', body: { action: 'bootstrap', token } },
    { functionName: 'cba-medical', body: { action: 'bootstrap', token } },
  ]);
});

test('sem sessão não chama uma função protegida', async () => {
  await expect(adminPost('bootstrap')).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
  expect(global.fetch).not.toHaveBeenCalled();
});

test('preserva erro HTTP e sinal de cancelamento para a interface', async () => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({ user: { token } }));
  const controller = new AbortController();
  global.fetch.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ result: 'error', code: 'FORBIDDEN', message: 'Acesso negado.' }) });
  await expect(callFunction('cba-admin', 'bootstrap', {}, { signal: controller.signal })).rejects.toMatchObject({
    name: 'CbaApiError', status: 403, code: 'FORBIDDEN', message: 'Acesso negado.'
  });
  expect(global.fetch.mock.calls[0][1].signal).toBe(controller.signal);
  expect(CbaApiError.name).toBe('CbaApiError');
});
