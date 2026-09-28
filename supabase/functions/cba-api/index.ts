import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000;
const PBKDF2_ITERATIONS = 310000;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const fail = (message: string, code = 'INTERNAL_ERROR', status = 400) => json({ result: 'error', code, message }, status);
const text = (v: unknown) => String(v ?? '').trim();
const lower = (v: unknown) => text(v).toLowerCase();
const bytesToHex = (bytes: Uint8Array) => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
const randomHex = (size = 32) => { const b = new Uint8Array(size); crypto.getRandomValues(b); return bytesToHex(b); };

function b64urlEncode(bytes: Uint8Array) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function b64urlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}
async function derivePassword(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}
async function hashPassword(password: string) {
  const salt = new Uint8Array(32); crypto.getRandomValues(salt);
  const hash = await derivePassword(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${b64urlEncode(salt)}$${b64urlEncode(hash)}`;
}
async function verifyPassword(password: string, stored: string | null) {
  if (!stored?.startsWith('pbkdf2-sha256$')) return false;
  const [, iter, saltEncoded, hashEncoded] = stored.split('$');
  const iterations = Number(iter);
  if (!Number.isInteger(iterations) || iterations < 100000 || !saltEncoded || !hashEncoded) return false;
  const actual = await derivePassword(password, b64urlDecode(saltEncoded), iterations);
  const expected = b64urlDecode(hashEncoded);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return fail('Use POST.', 'METHOD_NOT_ALLOWED', 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const params = await req.json();
    const action = text(params?.action);
    if (!action) return fail('Ação obrigatória.', 'INVALID_REQUEST');

    const accountWithAthlete = async (query: { email?: string; id?: string }) => {
      let q = sb.from('accounts').select('id,athlete_id,email,role,status,legacy_password_hash,push_token,athletes(name,photo_url)');
      if (query.email) q = q.ilike('email', query.email);
      if (query.id) q = q.eq('id', query.id);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const athleteRaw: any = (data as any).athletes;
      const athlete = Array.isArray(athleteRaw) ? athleteRaw[0] : athleteRaw;
      return {
        ...data,
        name: athlete?.name || '',
        fotoUrl: athlete?.photo_url || '',
      } as any;
    };

    const sessionPayload = (actor: any, token: string, expiresAt: number) => {
      const user = { id: actor.id, name: actor.name, email: actor.email, role: actor.role, fotoUrl: actor.fotoUrl };
      return { status: 'approved', token, expiresAt, ...user, user };
    };

    const issueSession = async (actor: any) => {
      await sb.rpc('cleanup_expired_app_sessions');
      const { data: existing, error: existingError } = await sb.from('app_sessions').select('token_hash,created_at').eq('account_id', actor.id).order('created_at', { ascending: true });
      if (existingError) throw existingError;
      if ((existing || []).length >= 5) {
        const remove = (existing || []).slice(0, (existing || []).length - 4).map((r: any) => r.token_hash);
        if (remove.length) { const { error } = await sb.from('app_sessions').delete().in('token_hash', remove); if (error) throw error; }
      }
      const token = randomHex(32);
      const tokenHash = await sha256Hex(token);
      const expiresAt = Date.now() + SESSION_TTL_MS;
      const { error } = await sb.from('app_sessions').insert({ token_hash: tokenHash, account_id: actor.id, expires_at: new Date(expiresAt).toISOString() });
      if (error) throw error;
      return { token, expiresAt };
    };

    const actorFor = async (tokenValue: unknown) => {
      const token = text(tokenValue);
      if (!/^[a-f0-9]{64}$/i.test(token)) throw Object.assign(new Error('Sessão inválida. Entre novamente.'), { code: 'UNAUTHORIZED', status: 401 });
      const tokenHash = await sha256Hex(token);
      const { data: session, error: sessionError } = await sb.from('app_sessions').select('account_id,expires_at').eq('token_hash', tokenHash).maybeSingle();
      if (sessionError) throw sessionError;
      if (!session) throw Object.assign(new Error('Sessão não encontrada. Entre novamente.'), { code: 'UNAUTHORIZED', status: 401 });
      if (new Date(session.expires_at).getTime() <= Date.now()) {
        await sb.from('app_sessions').delete().eq('token_hash', tokenHash);
        throw Object.assign(new Error('Sessão expirada.'), { code: 'SESSION_EXPIRED', status: 401 });
      }
      const actor = await accountWithAthlete({ id: session.account_id });
      if (!actor || actor.status !== 'approved') {
        await sb.from('app_sessions').delete().eq('token_hash', tokenHash);
        throw Object.assign(new Error('Sessão revogada. Entre novamente.'), { code: 'UNAUTHORIZED', status: 401 });
      }
      await sb.from('app_sessions').update({ last_seen_at: new Date().toISOString() }).eq('token_hash', tokenHash);
      return { actor, token, tokenHash, expiresAt: new Date(session.expires_at).getTime() };
    };

    if (action === 'loginUser') {
      const email = lower(params.email);
      const password = typeof params.password === 'string' ? params.password : '';
      if (!email || !password || password.length > 512) return fail('E-mail, senha ou acesso inválido.', 'INVALID_CREDENTIALS', 401);

      const emailKey = await sha256Hex(email);
      const { data: attempt } = await sb.from('login_attempts').select('*').eq('email_key', emailKey).maybeSingle();
      if (attempt?.lock_until && new Date(attempt.lock_until).getTime() > Date.now()) return fail('Muitas tentativas. Tente novamente em 10 minutos.', 'RATE_LIMITED', 429);

      const account = await accountWithAthlete({ email });
      const valid = account?.status === 'approved' && account.legacy_password_hash
        ? await verifyPassword(password, account.legacy_password_hash)
        : false;

      if (!valid || !account) {
        const count = Number(attempt?.attempt_count || 0) + 1;
        const lockUntil = count >= MAX_LOGIN_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS).toISOString() : null;
        await sb.from('login_attempts').upsert({ email_key: emailKey, attempt_count: count, lock_until: lockUntil, updated_at: new Date().toISOString() });
        return fail('E-mail, senha ou acesso inválido.', 'INVALID_CREDENTIALS', 401);
      }

      await sb.from('login_attempts').delete().eq('email_key', emailKey);
      const session = await issueSession(account);
      return json(sessionPayload(account, session.token, session.expiresAt));
    }

    if (action === 'validateSession') {
      const session = await actorFor(params.token);
      return json(sessionPayload(session.actor, session.token, session.expiresAt));
    }

    if (action === 'logoutUser') {
      const session = await actorFor(params.token);
      await sb.from('app_sessions').delete().eq('token_hash', session.tokenHash);
      return json({ result: 'success', message: 'Sessão revogada.' });
    }

    const session = await actorFor(params.token);
    const actor = session.actor;
    const isAdmin = String(actor.role || '').toUpperCase() === 'ADMIN';
    const adminActions = new Set(['saveTeams','createEvent','updateEvent','deleteEvent','createGame','updateGame','deleteGame','saveMatchStats','getMatchStats','sendPushNotificationToAll','sendFinanceReports','clearCache','createInjury','dischargeInjury','deleteInjury','resetPassword']);
    if (adminActions.has(action) && !isAdmin) return fail('Esta operação exige um administrador.', 'FORBIDDEN', 403);

    const rpc = async (name: string, args: Record<string, unknown> = {}) => {
      const { data, error } = await sb.rpc(name, args);
      if (error) throw error;
      return data;
    };
    const athleteByName = async (nameValue: unknown) => {
      const name = text(nameValue);
      const { data, error } = await sb.from('athletes').select('id,name').ilike('name', name).limit(2);
      if (error) throw error;
      if (!data?.length) throw Object.assign(new Error(`Atleta não cadastrado: ${name}`), { code: 'NOT_FOUND', status: 404 });
      if (data.length > 1) throw Object.assign(new Error(`Atleta duplicado: ${name}`), { code: 'DATA_CONFLICT', status: 409 });
      return data[0];
    };
    const resolveGame = async (idValue: unknown) => {
      const id = text(idValue);
      const { data, error } = await sb.from('games').select('*').or(`id.eq.${id},legacy_id.eq.${id}`).maybeSingle();
      if (error) throw error;
      return data;
    };
    const resolveEvent = async (idValue: unknown) => {
      const id = text(idValue);
      const { data, error } = await sb.from('events').select('*').or(`id.eq.${id},legacy_id.eq.${id}`).maybeSingle();
      if (error) throw error;
      return data;
    };
    const audit = async (eventAction: string, entityType: string, entityId: string, payload?: unknown) => {
      await sb.from('audit_log').insert({ actor_account_id: actor.id, action: eventAction, entity_type: entityType, entity_id: entityId, payload: payload ?? null });
    };

    const validateEventDates = (startValue: unknown, deadlineValue: unknown) => {
      const rawStart = text(startValue);
      const deadline = text(deadlineValue);
      const normalizedStart = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(rawStart)
        ? rawStart + '-03:00' : rawStart;
      const startsAt = new Date(normalizedStart);
      const deadlineDate = /^\d{4}-\d{2}-\d{2}$/.test(deadline)
        ? new Date(deadline + 'T12:00:00Z') : new Date(NaN);
      if (!rawStart || !Number.isFinite(startsAt.getTime()) ||
          !Number.isFinite(deadlineDate.getTime()) ||
          deadlineDate.toISOString().slice(0,10) !== deadline) {
        return { error: 'Informe uma data/hora válida para o evento e um prazo de confirmação válido.', startsAt: normalizedStart };
      }
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone:'America/Bahia', year:'numeric', month:'2-digit', day:'2-digit'
      }).formatToParts(startsAt);
      const value = (kind:string) => parts.find(part=>part.type===kind)?.value || '';
      const eventDay = `${value('year')}-${value('month')}-${value('day')}`;
      if (deadline > eventDay) {
        const [year,month,day] = eventDay.split('-');
        return {
          error:`O prazo de confirmação deve ser até ${day}/${month}/${year}, dia do evento. Escolha essa data ou uma anterior.`,
          startsAt:normalizedStart
        };
      }
      return { error:'', startsAt:normalizedStart };
    };

    switch (action) {
      case 'getInitialAppData': {
        const data: any = await rpc('get_initial_app_data_compat');
        if (!isAdmin && data?.data?.finance) {
          // Allowlist: nunca devolva novos campos financeiros individuais criados no RPC legado
          // sem uma decisão explícita sobre a autorização de cada campo.
          const rawFinance = data.data.finance;
          data.data.finance = {
            year:rawFinance.year,
            summary:rawFinance.summary,
            monthlyFee:rawFinance.monthlyFee,
            paymentHeaders:rawFinance.paymentHeaders,
            paymentStatus:[]
          };
          // Associa o histórico individual pelo ID autenticado, nunca pelo nome.
          const ownStatuses: Record<string, unknown> = {};
          if (actor.athlete_id) {
            const { data: dues, error: duesError } = await sb.from('member_dues')
              .select('amount_due,amount_paid,status,finance_periods(year,month,due_date)')
              .eq('athlete_id', actor.athlete_id);
            if (duesError) throw duesError;
            for (const due of dues || []) {
              const periodRaw: any = due.finance_periods;
              const period: any = Array.isArray(periodRaw) ? periodRaw[0] : periodRaw;
              if (!period || !Number.isInteger(Number(period.year)) || !Number.isInteger(Number(period.month))) continue;
              const periodKey = `${period.year}-${String(period.month).padStart(2,'0')}`;
              const status = String(due.status || 'unknown').toLowerCase();
              ownStatuses[periodKey] = {
                amountDue:due.amount_due, amountPaid:due.amount_paid, dueDate:period.due_date,
                year:period.year, month:period.month,
                status:status === 'exempt' ? 'isento' : status === 'paid' ? 'pago' : status === 'partial' ? 'parcial' : status === 'unknown' ? 'indefinido' : 'pendente'
              };
            }
          }
          // Resposta financeira allowlist: nenhuma nova propriedade do RPC pode
          // expor inadvertidamente dados pessoais de terceiros a membros.
          const aggregate = data.data.finance;
          data.data.finance = {
            year:aggregate.year,
            summary:aggregate.summary,
            monthlyFee:aggregate.monthlyFee,
            paymentHeaders:aggregate.paymentHeaders,
            paymentStatus:actor.athlete_id
              ? [{ player:actor.name, statuses:ownStatuses }] : []
          };
        }
        return json(data);
      }
      case 'getGames': return json(await rpc('get_games_compat'));
      case 'getEvents': return json(await rpc('get_events_compat'));
      case 'getNotifications': return json(await rpc('get_notifications_compat'));
      case 'getInjuries': {
        // Consulta de compatibilidade por athlete_id vinculado à sessão, sem comparação por nome.
        if (isAdmin) return json(await rpc('get_injuries_compat'));
        if (!actor.athlete_id) return json({ result:'success', data:[] });
        const { data: records, error: medicalError } = await sb.from('medical_records')
          .select('id,legacy_id,injury,injury_date,expected_return,status,athletes(name)')
          .eq('athlete_id',actor.athlete_id).is('discharged_at',null)
          .order('injury_date',{ascending:false});
        if (medicalError) throw medicalError;
        return json({ result:'success', data:(records||[]).map((r:any)=>({
          id:r.legacy_id || r.id,playerName:Array.isArray(r.athletes)?r.athletes[0]?.name:r.athletes?.name,
          injury:r.injury,date:r.injury_date,expectedReturn:r.expected_return,status:r.status
        })) });
      }
      case 'getMatchStats': return json(await rpc('get_match_stats_compat', { p_date: params.date }));
      case 'getLastUpdate': {
        const { data } = await sb.from('app_settings').select('updated_at').eq('key', 'backend_provider').maybeSingle();
        return json({ result: 'success', message: '', timestamp: data?.updated_at || null });
      }
      case 'clearCache': return json({ result: 'success', message: 'Dados lidos diretamente do Supabase.' });
      case 'savePushToken': {
        const pushToken = text(params.pushToken);
        if (!/^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(pushToken)) return fail('Push token inválido.', 'VALIDATION_ERROR');
        const { error } = await sb.from('accounts').update({ push_token: pushToken }).eq('id', actor.id);
        if (error) throw error;
        return json({ result: 'success', message: 'Push token registrado.' });
      }
      case 'changeOwnPassword': {
        const currentPassword = typeof params.currentPassword === 'string' ? params.currentPassword : '';
        const newPassword = typeof params.newPassword === 'string' ? params.newPassword : '';
        if (!currentPassword || currentPassword.length > 512) return fail('Informe sua senha atual.', 'VALIDATION_ERROR');
        if (newPassword.length < 8 || newPassword.length > 512) return fail('Use uma nova senha de 8 a 512 caracteres.', 'VALIDATION_ERROR');
        const currentOk = await verifyPassword(currentPassword, actor.legacy_password_hash);
        if (!currentOk) return fail('Senha atual incorreta.', 'INVALID_CREDENTIALS', 401);
        if (currentPassword === newPassword) return fail('A nova senha deve ser diferente da senha atual.', 'VALIDATION_ERROR');
        const passwordHash = await hashPassword(newPassword);
        const { error } = await sb.from('accounts').update({ legacy_password_hash: passwordHash }).eq('id', actor.id);
        if (error) throw error;
        await sb.from('app_sessions').delete().eq('account_id', actor.id);
        await audit('change_own_password', 'account', actor.id);
        return json({ result: 'success', message: 'Senha alterada com sucesso. Entre novamente com a nova senha.' });
      }
      case 'resetPassword': {
        const email = lower(params.email);
        const newPassword = typeof params.newPassword === 'string' ? params.newPassword : '';
        if (!email || newPassword.length < 8 || newPassword.length > 512) return fail('Use uma senha de 8 a 512 caracteres.', 'VALIDATION_ERROR');
        const target = await accountWithAthlete({ email });
        if (!target) return fail('Usuário não encontrado.', 'NOT_FOUND', 404);
        const passwordHash = await hashPassword(newPassword);
        const { error } = await sb.from('accounts').update({ legacy_password_hash: passwordHash }).eq('id', target.id);
        if (error) throw error;
        await sb.from('app_sessions').delete().eq('account_id', target.id);
        await audit('reset_password', 'account', target.id);
        return json({ result: 'success', message: 'Senha alterada e sessões anteriores revogadas.' });
      }
      case 'createGame': {
        const local = text(params.local);
        if (!local) return fail('Local inválido.', 'VALIDATION_ERROR');
        const { data, error } = await sb.from('games').insert({ game_date: params.data, game_time: params.horario, location: local, created_by: actor.id }).select('id').single();
        if (error) throw error;
        await audit('create_game', 'game', data.id);
        return json({ result: 'success', message: 'Jogo criado.', id: data.id });
      }
      case 'updateGame': {
        const game = await resolveGame(params.id);
        if (!game) return fail('Jogo não encontrado.', 'NOT_FOUND', 404);
        const { error } = await sb.from('games').update({ game_date: params.data, game_time: params.horario, location: text(params.local) }).eq('id', game.id);
        if (error) throw error;
        await audit('update_game', 'game', game.id);
        return json({ result: 'success', message: 'Jogo atualizado.' });
      }
      case 'deleteGame': {
        const game = await resolveGame(params.id);
        if (!game) return fail('Jogo não encontrado.', 'NOT_FOUND', 404);
        const { error } = await sb.from('games').delete().eq('id', game.id);
        if (error) throw error;
        await audit('delete_game', 'game', game.id);
        return json({ result: 'success', message: 'Jogo excluído.' });
      }
      case 'createEvent': {
        const validated = validateEventDates(params.date, params.deadline);
        if (validated.error) return fail(validated.error, 'EVENT_DATE_INVALID', 422);
        const { data, error } = await sb.from('events').insert({ name: text(params.name), starts_at: validated.startsAt, location: text(params.location), description: text(params.description), value: Number(params.value || 0), deadline: text(params.deadline), created_by: actor.id }).select('id').single();
        if (error) throw error;
        await audit('create_event', 'event', data.id);
        return json({ result: 'success', message: 'Evento criado.', id: data.id });
      }
      case 'updateEvent': {
        const event = await resolveEvent(params.id);
        if (!event) return fail('Evento não encontrado.', 'NOT_FOUND', 404);
        const validated = validateEventDates(params.date, params.deadline);
        if (validated.error) return fail(validated.error, 'EVENT_DATE_INVALID', 422);
        const { error } = await sb.from('events').update({ name: text(params.name), starts_at: validated.startsAt, location: text(params.location), description: text(params.description), value: Number(params.value || 0), deadline: text(params.deadline) }).eq('id', event.id);
        if (error) throw error;
        await audit('update_event', 'event', event.id);
        return json({ result: 'success', message: 'Evento atualizado.', id: event.id });
      }
      case 'deleteEvent': {
        const event = await resolveEvent(params.id);
        if (!event) return fail('Evento não encontrado.', 'NOT_FOUND', 404);
        const { error } = await sb.from('events').delete().eq('id', event.id);
        if (error) throw error;
        await audit('delete_event', 'event', event.id);
        return json({ result: 'success', message: 'Evento excluído.' });
      }
      case 'handleAttendanceUpdate': {
        if (!['game', 'event'].includes(params.type) || !['confirm', 'withdraw'].includes(params.actionType)) return fail('Tipo ou ação inválida.', 'VALIDATION_ERROR');
        const athleteId = actor.athlete_id;
        if (!athleteId) return fail('Conta sem atleta associado.', 'DATA_CONFLICT', 409);
        if (params.type === 'game') {
          const game = await resolveGame(params.itemId);
          if (!game) return fail('Jogo não encontrado.', 'NOT_FOUND', 404);
          if (params.actionType === 'confirm') {
            const { error } = await sb.from('game_confirmations').upsert({ game_id: game.id, athlete_id: athleteId }); if (error) throw error;
          } else {
            const { error } = await sb.from('game_confirmations').delete().eq('game_id', game.id).eq('athlete_id', athleteId); if (error) throw error;
          }
        } else {
          const event = await resolveEvent(params.itemId);
          if (!event) return fail('Evento não encontrado.', 'NOT_FOUND', 404);
          const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
          if (today > String(event.deadline)) return fail('Inscrições encerradas para este evento.', 'DEADLINE_PASSED');
          if (params.actionType === 'confirm') {
            const { error } = await sb.from('event_attendees').upsert({ event_id: event.id, athlete_id: athleteId }); if (error) throw error;
          } else {
            const { error } = await sb.from('event_attendees').delete().eq('event_id', event.id).eq('athlete_id', athleteId); if (error) throw error;
          }
        }
        return json({ result: 'success', message: 'Presença atualizada.' });
      }
      case 'saveMatchStats': {
        if (!Array.isArray(params.stats) || params.stats.length < 1 || params.stats.length > 200) return fail('Informe de 1 a 200 registros de estatísticas.', 'VALIDATION_ERROR');
        const rows: any[] = [];
        const names = new Set<string>();
        for (const entry of params.stats) {
          const name = text(entry.playerName);
          if (!name || names.has(lower(name))) return fail('Há atleta inválido ou duplicado na súmula.', 'VALIDATION_ERROR');
          names.add(lower(name));
          const athlete = await athleteByName(name);
          const vals = ['pts2','pts3','reb','ast','blk'].map(k => Number(entry[k] || 0));
          if (vals.some(v => !Number.isInteger(v) || v < 0 || v > 100000)) return fail(`Estatística inválida para ${name}.`, 'VALIDATION_ERROR');
          rows.push({ athlete_id: athlete.id, stat_date: params.date, pts2: vals[0], pts3: vals[1], reb: vals[2], ast: vals[3], blk: vals[4] });
        }
        const { error } = await sb.from('daily_stats').upsert(rows, { onConflict: 'athlete_id,stat_date' });
        if (error) throw error;
        await audit('save_match_stats', 'daily_stats', String(params.date), { count: rows.length });
        return json({ result: 'success', message: 'Totais diários salvos sem duplicação.' });
      }
      case 'saveTeams': {
        const parseTeam = (value: any) => Array.from(new Set((Array.isArray(value) ? value : String(value || '').split(',')).map((v: any) => text(v)).filter(Boolean)));
        const black = parseTeam(params.teamBlack), red = parseTeam(params.teamRed);
        if (black.length !== 5 || red.length !== 5 || black.some(n => red.map(lower).includes(lower(n)))) return fail('Informe dois times distintos de cinco atletas.', 'VALIDATION_ERROR');
        const { data: draw, error } = await sb.from('team_draws').insert({ draw_date: new Date().toISOString().slice(0,10), created_by: actor.id }).select('id').single();
        if (error) throw error;
        const members: any[] = [];
        for (let i=0;i<black.length;i++) { const a=await athleteByName(black[i]); members.push({draw_id:draw.id,athlete_id:a.id,team:'black',slot:i+1}); }
        for (let i=0;i<red.length;i++) { const a=await athleteByName(red[i]); members.push({draw_id:draw.id,athlete_id:a.id,team:'red',slot:i+1}); }
        const { error: memberError } = await sb.from('team_draw_members').insert(members);
        if (memberError) throw memberError;
        await audit('save_teams', 'team_draw', draw.id);
        return json({ result: 'success', message: 'Times salvos.' });
      }
      case 'createInjury': {
        const athlete = await athleteByName(params.playerName);
        if (String(params.expectedReturn) < String(params.date)) return fail('O retorno não pode ser anterior à lesão.', 'VALIDATION_ERROR');
        const { data, error } = await sb.from('medical_records').insert({ athlete_id: athlete.id, injury: text(params.injury), injury_date: params.date, expected_return: params.expectedReturn, status: text(params.status) }).select('id').single();
        if (error) throw error;
        await audit('create_injury', 'medical_record', data.id);
        return json({ result: 'success', message: 'Lesão registrada.', id: data.id });
      }
      case 'dischargeInjury':
      case 'deleteInjury': {
        const id = text(params.id);
        const { data, error } = await sb.from('medical_records').select('id').or(`id.eq.${id},legacy_id.eq.${id}`).maybeSingle();
        if (error) throw error;
        if (!data) return fail('Registro médico não encontrado.', 'NOT_FOUND', 404);
        const { error: updateError } = await sb.from('medical_records').update({ discharged_at: new Date().toISOString(), discharged_by: actor.id, status: 'Alta' }).eq('id', data.id);
        if (updateError) throw updateError;
        await audit('discharge_injury', 'medical_record', data.id);
        return json({ result: 'success', message: 'Alta registrada. Histórico preservado.' });
      }
      case 'sendPushNotificationToAll': {
        const title = text(params.title), message = text(params.message), targetTab = text(params.targetTab || 'presenca');
        const allowed = ['inicio','presenca','relatorios','financas','jogos','eventos','sorteio','dm','halldafama','estatuto'];
        if (!title || title.length > 150 || !message || message.length > 2500 || !allowed.includes(targetTab)) return fail('Título, mensagem ou destino inválido.', 'VALIDATION_ERROR');
        const { data: tokenRows, error: tokenError } = await sb.from('accounts').select('push_token').eq('status', 'approved').not('push_token', 'is', null);
        if (tokenError) throw tokenError;
        const tokens = [...new Set((tokenRows || []).map((r:any)=>text(r.push_token)).filter((t:string)=>/^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(t)))];
        let accepted = 0, failed = 0;
        for (let i=0;i<tokens.length;i+=100) {
          const batch = tokens.slice(i,i+100).map(to => ({ to, sound:'default', title, body:message, data:{targetTab} }));
          try {
            const response = await fetch('https://api.expo.dev/v2/push/send', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(batch) });
            if (!response.ok) { failed += batch.length; continue; }
            const payload = await response.json();
            const tickets = Array.isArray(payload?.data) ? payload.data : [];
            const okCount = tickets.filter((t:any)=>t?.status==='ok').length;
            accepted += okCount; failed += batch.length - okCount;
          } catch { failed += batch.length; }
        }
        const { error } = await sb.from('notifications').insert({ title, message, target_tab: targetTab, sent_by: actor.id, push_accepted: accepted, push_failed: failed });
        if (error) throw error;
        await audit('send_push', 'notification', title, {accepted,failed,targetTab});
        return json({ result:'success', message:`Aviso salvo. Push aceito para envio: ${accepted}. Falhas: ${failed}.`, accepted, failed });
      }
      case 'sendFinanceReports': {
        const apiKey = Deno.env.get('RESEND_API_KEY');
        const from = Deno.env.get('FINANCE_FROM_EMAIL');
        if (!apiKey || !from) return fail('O backend já foi migrado, mas o provedor de e-mail financeiro ainda não está configurado no Supabase.', 'EMAIL_PROVIDER_NOT_CONFIGURED', 501);
        const initial: any = await rpc('get_initial_app_data_compat');
        const paymentStatus = initial?.data?.finance?.paymentStatus || [];
        const { data: recipients, error: recError } = await sb.from('accounts').select('email,athletes(name)').eq('status','approved').not('email','is',null);
        if (recError) throw recError;
        let sent=0, failed=0;
        for (const recipient of recipients || []) {
          const athleteRaw:any=(recipient as any).athletes; const athlete=Array.isArray(athleteRaw)?athleteRaw[0]:athleteRaw;
          const status = paymentStatus.find((p:any)=>lower(p.player)===lower(athlete?.name));
          if (!status) continue;
          const rows = Object.entries(status.statuses || {}).map(([period,v]:any)=>`<tr><td>${period}</td><td>${v.status}</td><td>R$ ${Number(v.amountPaid||0).toFixed(2)}</td></tr>`).join('');
          const body = { from, to:[recipient.email], subject:'CBA - Situação Financeira', html:`<h2>CBA - Situação Financeira</h2><p>Olá, ${athlete?.name || ''}.</p><table><thead><tr><th>Competência</th><th>Status</th><th>Pago</th></tr></thead><tbody>${rows}</tbody></table>` };
          try { const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(body)}); if(r.ok)sent++; else failed++; } catch { failed++; }
        }
        await audit('send_finance_reports','finance','bulk',{sent,failed});
        return json({result:'success',message:`Relatórios financeiros enviados: ${sent}. Falhas: ${failed}.`,sent,failed});
      }
      default: return fail('Ação não reconhecida.', 'UNKNOWN_ACTION', 400);
    }
  } catch (e: any) {
    console.error(e);
    const safeStatus = Number(e?.status);
    const safeCodes = new Set(['UNAUTHORIZED','SESSION_EXPIRED','INVALID_CREDENTIALS','FORBIDDEN','VALIDATION_ERROR','NOT_FOUND','DATA_CONFLICT','EVENT_DATE_INVALID','DEADLINE_PASSED','RATE_LIMITED']);
    if (safeStatus >= 400 && safeStatus < 500 && safeCodes.has(String(e?.code))) {
      return fail(e?.message || 'Não foi possível concluir a operação.',String(e.code),safeStatus);
    }
    return fail('Ocorreu um erro interno. Tente novamente.','INTERNAL_ERROR',500);
  }
});
