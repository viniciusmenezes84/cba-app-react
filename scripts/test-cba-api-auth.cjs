const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pbkdf2Sync, webcrypto } = require('node:crypto');
const babel = require('@babel/core');

const source = fs.readFileSync(path.join(__dirname, '../supabase/functions/cba-api/index.ts'), 'utf8');
assert.doesNotMatch(source, /script\.google\.com|legacyLogin|LEGACY_URL/);

const { code } = babel.transformSync(source, {
  filename: 'index.ts',
  configFile: false,
  babelrc: false,
  presets: ['@babel/preset-typescript'],
  plugins: ['@babel/plugin-transform-modules-commonjs'],
});

let account;
let handler;
const sessions = new Map();
const attemptedEmails = new Map();
const fakeDb = {
  from(table) {
    const filters = {};
    const query = {
      select() { return query; },
      eq(key, value) { filters[key] = value; return query; },
      ilike(key, value) { filters[key] = value; return query; },
      order() { return Promise.resolve({ data: [], error: null }); },
      async maybeSingle() {
        if (table === 'accounts') {
          const found = account && (filters.email === account.email || filters.id === account.id);
          return { data: found ? account : null, error: null };
        }
        if (table === 'login_attempts') return { data: attemptedEmails.get(filters.email_key) || null, error: null };
        if (table === 'app_sessions') return { data: sessions.get(filters.token_hash) || null, error: null };
        throw new Error(`Unexpected lookup in ${table}`);
      },
      async insert(row) {
        assert.equal(table, 'app_sessions');
        sessions.set(row.token_hash, row);
        return { error: null };
      },
      async upsert(row) {
        assert.equal(table, 'login_attempts');
        attemptedEmails.set(row.email_key, row);
        return { error: null };
      },
      delete() { return query; },
      update() { return query; },
      then(resolve, reject) {
        if (table === 'app_sessions' && filters.token_hash) sessions.delete(filters.token_hash);
        if (table === 'login_attempts' && filters.email_key) attemptedEmails.delete(filters.email_key);
        return Promise.resolve({ error: null }).then(resolve, reject);
      },
    };
    return query;
  },
  async rpc(name) {
    assert.equal(name, 'cleanup_expired_app_sessions');
    return { error: null };
  },
};

vm.runInNewContext(code, {
  require(specifier) {
    assert.match(specifier, /supabase-js/);
    return { createClient: () => fakeDb };
  },
  exports: {},
  Deno: {
    env: { get: key => ({ SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test-only' })[key] },
    serve: fn => { handler = fn; },
  },
  crypto: webcrypto,
  Response,
  Request,
  TextEncoder,
  atob,
  btoa,
  Date,
  Uint8Array,
  console,
  fetch: () => { throw new Error('Login made an unexpected network request'); },
});

const invoke = async (action, data) => {
  const res = await handler(new Request('https://example.invalid/functions/v1/cba-api', {
    method: 'POST',
    body: JSON.stringify({ action, ...data }),
  }));
  return { status: res.status, body: await res.json() };
};

(async () => {
  account = { id: 'test-account', email: 'athlete@example.invalid', role: 'MEMBER', status: 'approved',
    athlete_id: 'test-athlete', athletes: { name: 'Teste', photo_url: null }, legacy_password_hash: null };
  const missingHash = await invoke('loginUser', { email: account.email, password: 'valid-password' });
  assert.equal(missingHash.status, 401);
  assert.equal(missingHash.body.code, 'INVALID_CREDENTIALS');
  assert.equal(sessions.size, 0);

  const salt = Buffer.alloc(32, 7);
  const hash = pbkdf2Sync('valid-password', salt, 310000, 32, 'sha256');
  account.legacy_password_hash = `pbkdf2-sha256$310000$${salt.toString('base64url')}$${hash.toString('base64url')}`;
  const invalid = await invoke('loginUser', { email: account.email, password: 'wrong-password' });
  assert.equal(invalid.status, 401);
  const valid = await invoke('loginUser', { email: account.email, password: 'valid-password' });
  assert.equal(valid.status, 200);
  assert.match(valid.body.token, /^[a-f0-9]{64}$/);
  assert.equal(sessions.size, 1);

  const logout = await invoke('logoutUser', { token: valid.body.token });
  assert.equal(logout.status, 200);
  assert.equal(sessions.size, 0);
  console.log('Backend auth contract: missing hash, invalid password, login and logout passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
