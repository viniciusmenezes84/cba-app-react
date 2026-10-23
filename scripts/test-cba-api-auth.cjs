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
    let mutation = null;
    const query = {
      select() { return query; },
      eq(key, value) { filters[key] = value; return query; },
      in(key, values) { filters[key + '_in'] = values; return query; },
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
      delete() { mutation = 'delete'; return query; },
      update() { mutation = 'update'; return query; },
      then(resolve, reject) {
        if (table === 'app_sessions' && filters.token_hash && mutation === 'delete') sessions.delete(filters.token_hash);
        if (table === 'login_attempts' && filters.email_key) attemptedEmails.delete(filters.email_key);
        if (table === 'member_dues') return Promise.resolve({ data: [], error: null }).then(resolve, reject);
        const own = filters.athlete_id === 'test-athlete';
        if (table === 'game_confirmations') return Promise.resolve({ data: own ? [{ game_id:'game-uuid-own' }] : [], error: null }).then(resolve, reject);
        if (table === 'event_attendees') return Promise.resolve({ data: own ? [{ event_id:'event-uuid-own' }] : [], error: null }).then(resolve, reject);
        if (table === 'games') return Promise.resolve({ data:[{ id:'game-uuid-own', legacy_id:'old-game-own' }], error:null }).then(resolve, reject);
        if (table === 'events') return Promise.resolve({ data:[{ id:'event-uuid-own', legacy_id:'old-event-own' }], error:null }).then(resolve, reject);
        return Promise.resolve({ error: null }).then(resolve, reject);
      },
    };
    return query;
  },
  async rpc(name) {
    if (name === 'cleanup_expired_app_sessions') return { error: null };
    if (name === 'get_initial_app_data_compat') return {
      error: null,
      data: { result: 'success', data: {
        dashboard: { dates: ['2026-10-18'], players: [
          { id: 'test-athlete', name: 'Teste', attendance: { '2026-10-18': '✅' }, dailyStats: { '2026-10-18': { pts2: 2 } } },
          { id: 'other-athlete', name: 'Pessoa Dois', attendance: { '2026-10-18': '✅' }, dailyStats: { '2026-10-18': { pts2: 7 } } }
        ] },
        finance: {
          summary: { balance: 90000, revenue: 100000, expense: 10000 },
          year: 2026, monthlyFee: 20, paymentHeaders: ['Outubro'],
          paymentStatus: [{ player:'Pessoa Dois', statuses: { Outubro: '20' } }]
        }
      }}
    };
    if (name === 'get_games_compat') return { error:null, data:{result:'success',data:[
      { id:'old-game-own',confirmados:['Teste','Pessoa Dois'] },
      { id:'old-game-other',confirmados:['Pessoa Dois'] }
    ]} };
    if (name === 'get_events_compat') return { error:null, data:{result:'success',data:[
      { id:'old-event-own',attendees:['Teste','Pessoa Dois'] },
      { id:'old-event-other',attendees:['Pessoa Dois'] }
    ]} };
    throw new Error('Unexpected RPC: ' + name);
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

  const member = await invoke('getInitialAppData', {
    token: valid.body.token, role: 'ADMIN', athleteId: 'other-athlete' // untrusted spoofing
  });
  assert.equal(member.status, 200);
  assert.deepEqual(member.body.data.dashboard.players.map(p => p.id), ['test-athlete']);
  assert.equal('summary' in member.body.data.finance, false, 'Members must not see overall balance');
  assert.deepEqual(member.body.data.finance.paymentStatus.map(p => p.player), ['Teste']);
  const ownGames = await invoke('getGames', { token: valid.body.token });
  assert.equal(ownGames.status, 200);
  assert.deepEqual(ownGames.body.data.map(g=>g.confirmados), [['Teste'], []]);
  const ownEvents = await invoke('getEvents', { token: valid.body.token });
  assert.equal(ownEvents.status, 200);
  assert.deepEqual(ownEvents.body.data.map(e=>e.attendees), [['Teste'], []]);

  const blocked = await invoke('getMatchStats', { token: valid.body.token, date:'2026-10-18' });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, 'FORBIDDEN');

  account.role = 'ADMIN';
  const admin = await invoke('getInitialAppData', { token: valid.body.token });
  assert.equal(admin.status, 200);
  assert.equal(admin.body.data.dashboard.players.length, 2);
  assert.equal(admin.body.data.finance.summary.balance, 90000);
  const adminGames = await invoke('getGames', { token: valid.body.token });
  assert.deepEqual(adminGames.body.data[0].confirmados, ['Teste', 'Pessoa Dois']);
  const adminEvents = await invoke('getEvents', { token: valid.body.token });
  assert.deepEqual(adminEvents.body.data[0].attendees, ['Teste', 'Pessoa Dois']);
  account.role = 'MEMBER';

  const logout = await invoke('logoutUser', { token: valid.body.token });
  assert.equal(logout.status, 200);
  assert.equal(sessions.size, 0);
  console.log('Backend auth contract: missing hash, invalid password, login and logout passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
