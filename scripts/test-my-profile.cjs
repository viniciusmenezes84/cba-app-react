const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const babel = require('@babel/core');
const source = fs.readFileSync('supabase/functions/cba-portal/index.ts', 'utf8');
const { code } = babel.transformSync(source, { filename: 'index.ts', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'], plugins: ['@babel/plugin-transform-modules-commonjs'] });
let handler, writes = [], reads = [], session = true, account;
const athlete = { name: 'Own', nickname: null, photo_url: '', position: 'Pivô', jersey_number: '00' };
const reset = () => { writes = []; reads = []; session = true; account = { id: 'account-own', athlete_id: 'athlete-own', role: 'PLAYER', status: 'approved', athletes: athlete }; };
const db = { from(table) {
  const filters = {}; let update;
  const query = {
    select() { return query; }, eq(k,v) { filters[k] = v; return query; }, gte(k,v) { filters[k+'From'] = v; return query; }, lte(k,v) { filters[k+'To'] = v; return query; }, order() { return query; },
    update(row) { update = row; return query; }, async insert() { return { error: null }; },
    async maybeSingle() { return { data: table === 'app_sessions' ? (session ? { account_id: account.id, expires_at: '2099-01-01' } : null) : account, error: null }; },
    async single() { assert.equal(table, 'athletes'); writes.push({ filters, update }); return { data: { ...athlete, ...update }, error: null }; },
    then(resolve, reject) { if (table !== 'app_sessions') reads.push({ table, filters }); return Promise.resolve({ data: [], error: null }).then(resolve, reject); }
  }; return query;
}};
vm.runInNewContext(code, { require: () => ({ createClient: () => db }), Deno: { env: { get: () => 'test' }, serve: fn => handler = fn }, crypto: webcrypto, TextEncoder, Request, Response, URL, console });
const call = async payload => { const response = await handler(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ token: 'a'.repeat(64), ...payload }) })); return { status: response.status, data: await response.json() }; };
(async () => {
 reset(); let r = await call({ action: 'getMyProfile', year: 2026, athleteId: 'other' }); assert.equal(r.status, 200); assert.equal(r.data.profile.athleteId, 'athlete-own'); assert.equal(reads.length, 2); reads.forEach(q => assert.equal(q.filters.athlete_id, 'athlete-own'));
 reset(); r = await call({ action: 'updateMyProfile', nickname: 'Gigante', jerseyNumber: '00' }); assert.equal(r.status, 200); assert.equal(writes[0].filters.id, 'athlete-own'); assert.equal(writes[0].update.nickname, 'Gigante'); assert.equal(r.data.profile.name, 'Own');
 for (const payload of [{ athleteId: 'other' }, { role: 'ADMIN' }, { name: 'Changed' }, { active: false }, { photoUrl: 'javascript:alert(1)' }, { photoUrl: 'https://user:pass@example.com' }, { jerseyNumber: '999' }, { nickname: 'a'.repeat(41) }, { position: {} }]) { reset(); r = await call({ action: 'updateMyProfile', ...payload }); assert.equal(r.status, 400, JSON.stringify(payload)); assert.equal(writes.length, 0); }
 reset(); session = false; r = await call({ action: 'updateMyProfile', nickname: 'no' }); assert.equal(r.status, 401); assert.equal(writes.length, 0);
 reset(); account.status = 'blocked'; r = await call({ action: 'getMyProfile' }); assert.equal(r.status, 403);
 reset(); account.athlete_id = null; r = await call({ action: 'updateMyProfile', nickname: 'no' }); assert.equal(r.status, 409); assert.equal(writes.length, 0);
 reset(); r = await call({ action: 'getMyProfile', year: 'invalid' }); assert.equal(r.status, 400);
 console.log('Meu CBA: vínculo, permissões, campos, sessão e temporada verificados.');
})().catch(error => { console.error(error); process.exitCode = 1; });
