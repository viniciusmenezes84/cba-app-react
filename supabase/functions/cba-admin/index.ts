import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OWNER_EMAIL = 'vinicius.m84@gmail.com';
const PBKDF2_ITERATIONS = 310000;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const fail = (message: string, code = 'ADMIN_ERROR', status = 400) => json({ result: 'error', code, message }, status);
const text = (v: unknown) => String(v ?? '').trim();
const lower = (v: unknown) => text(v).toLowerCase();
const num = (v: unknown, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const nowIso = () => new Date().toISOString();
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
function b64urlEncode(bytes: Uint8Array) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return fail('Use POST.', 'METHOD_NOT_ALLOWED', 405);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    const p = await req.json();
    const action = text(p?.action);
    const token = text(p?.token);
    if (!action) return fail('Ação obrigatória.', 'INVALID_REQUEST');
    if (!/^[a-f0-9]{64}$/i.test(token)) return fail('Sessão inválida.', 'UNAUTHORIZED', 401);

    const tokenHash = await sha256Hex(token);
    const { data: session, error: sessionError } = await sb.from('app_sessions').select('account_id,expires_at').eq('token_hash', tokenHash).maybeSingle();
    if (sessionError) throw sessionError;
    if (!session || new Date(session.expires_at).getTime() <= Date.now()) return fail('Sessão expirada.', 'UNAUTHORIZED', 401);

    const { data: account, error: accountError } = await sb.from('accounts').select('id,email,role,status,athlete_id').eq('id', session.account_id).maybeSingle();
    if (accountError) throw accountError;
    if (!account || account.status !== 'approved' || String(account.role).toUpperCase() !== 'ADMIN') {
      return fail('Acesso administrativo não autorizado.', 'FORBIDDEN', 403);
    }
    await sb.from('app_sessions').update({ last_seen_at: nowIso() }).eq('token_hash', tokenHash);

    const audit = async (auditAction: string, entityType: string, entityId: string, payload?: unknown) => {
      const { error } = await sb.from('audit_log').insert({ actor_account_id: account.id, action: auditAction, entity_type: entityType, entity_id: entityId, payload: payload ?? null });
      if (error) throw error;
    };

    const refreshFinanceSnapshot = async () => {
      const { data: entries, error } = await sb.from('finance_entries').select('kind,amount');
      if (error) throw error;
      const revenue = (entries || []).filter((e: any) => e.kind === 'revenue').reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const expense = (entries || []).filter((e: any) => e.kind === 'expense').reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const { data: adjustmentRow } = await sb.from('app_settings').select('value').eq('key', 'finance_balance_adjustment').maybeSingle();
      const adjustment = Number(adjustmentRow?.value ?? 0) || 0;
      const { error: snapError } = await sb.from('finance_snapshots').insert({ revenue, expense, balance: revenue - expense + adjustment, source: 'admin_console' });
      if (snapError) throw snapError;
      return { revenue, expense, balance: revenue - expense + adjustment };
    };

    const loadBootstrap = async () => {
      const [athletesQ, accountsQ, periodsQ, duesQ, entriesQ, gamesQ, eventsQ, medicalQ, notificationsQ, settingsQ, auditQ] = await Promise.all([
        sb.from('athletes').select('*').order('active', { ascending: false }).order('name'),
        sb.from('accounts').select('id,athlete_id,email,role,status,created_at,updated_at').order('email'),
        sb.from('finance_periods').select('*').order('year', { ascending: false }).order('month'),
        sb.from('member_dues').select('*'),
        sb.from('finance_entries').select('*').order('occurred_on', { ascending: false }).order('created_at', { ascending: false }).limit(500),
        sb.from('games').select('*').order('game_date', { ascending: false }).order('game_time', { ascending: false }).limit(200),
        sb.from('events').select('*').order('starts_at', { ascending: false }).limit(200),
        sb.from('medical_records').select('*').order('injury_date', { ascending: false }).limit(300),
        sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(200),
        sb.from('app_settings').select('key,value,is_public,updated_at').order('key'),
        sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(150),
      ]);
      for (const q of [athletesQ, accountsQ, periodsQ, duesQ, entriesQ, gamesQ, eventsQ, medicalQ, notificationsQ, settingsQ, auditQ]) if (q.error) throw q.error;
      const athletes = athletesQ.data || [];
      const entries = entriesQ.data || [];
      const dues = duesQ.data || [];
      const overdue = dues.filter((d: any) => ['pending','partial'].includes(d.status)).length;
      return {
        result: 'success',
        data: {
          overview: {
            athletes: athletes.length,
            activeAthletes: athletes.filter((a: any) => a.active).length,
            users: (accountsQ.data || []).filter((a: any) => a.status === 'approved').length,
            overdue,
            revenue: entries.filter((e: any) => e.kind === 'revenue').reduce((s: number, e: any) => s + Number(e.amount || 0), 0),
            expense: entries.filter((e: any) => e.kind === 'expense').reduce((s: number, e: any) => s + Number(e.amount || 0), 0),
          },
          athletes,
          accounts: accountsQ.data || [],
          periods: periodsQ.data || [],
          dues,
          financeEntries: entries,
          games: gamesQ.data || [],
          events: eventsQ.data || [],
          medical: medicalQ.data || [],
          notifications: notificationsQ.data || [],
          settings: settingsQ.data || [],
          audit: auditQ.data || [],
        }
      };
    };

    switch (action) {
      case 'bootstrap':
        return json(await loadBootstrap());

      case 'attendanceByDate': {
        const date = text(p.date);
        const [aQ, rQ] = await Promise.all([
          sb.from('athletes').select('id,name,active').eq('active', true).order('name'),
          sb.from('attendance_records').select('athlete_id,status,raw_status').eq('attendance_date', date),
        ]);
        if (aQ.error) throw aQ.error; if (rQ.error) throw rQ.error;
        return json({ result: 'success', athletes: aQ.data || [], records: rQ.data || [] });
      }

      case 'saveAttendance': {
        const date = text(p.date);
        const records = Array.isArray(p.records) ? p.records : [];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !records.length) return fail('Data e presenças são obrigatórias.', 'VALIDATION_ERROR');
        const rawMap: Record<string,string> = { present: '✅', absent: '❌', unexcused: 'Não Justificou', excused: 'Justificou', na: 'N/A', other: '' };
        for (const r of records) {
          const athleteId = text(r.athleteId);
          const status = text(r.status);
          if (!athleteId) continue;
          if (status === 'none') {
            const { error } = await sb.from('attendance_records').delete().eq('athlete_id', athleteId).eq('attendance_date', date);
            if (error) throw error;
          } else {
            if (!Object.prototype.hasOwnProperty.call(rawMap, status)) return fail(`Status inválido: ${status}`, 'VALIDATION_ERROR');
            const { error } = await sb.from('attendance_records').upsert({ athlete_id: athleteId, attendance_date: date, status, raw_status: rawMap[status], source: 'admin_console' }, { onConflict: 'athlete_id,attendance_date' });
            if (error) throw error;
          }
        }
        await audit('admin_save_attendance', 'attendance', date, { count: records.length });
        return json({ result: 'success', message: 'Presenças salvas.' });
      }

      case 'statsByDate': {
        const date = text(p.date);
        const [aQ, rQ] = await Promise.all([
          sb.from('athletes').select('id,name,active').eq('active', true).order('name'),
          sb.from('daily_stats').select('*').eq('stat_date', date),
        ]);
        if (aQ.error) throw aQ.error; if (rQ.error) throw rQ.error;
        return json({ result: 'success', athletes: aQ.data || [], records: rQ.data || [] });
      }

      case 'saveStats': {
        const date = text(p.date);
        const records = Array.isArray(p.records) ? p.records : [];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('Data inválida.', 'VALIDATION_ERROR');
        const rows = records.map((r: any) => ({
          athlete_id: text(r.athleteId), stat_date: date,
          pts2: Math.max(0, Math.trunc(num(r.pts2))), pts3: Math.max(0, Math.trunc(num(r.pts3))),
          reb: Math.max(0, Math.trunc(num(r.reb))), ast: Math.max(0, Math.trunc(num(r.ast))), blk: Math.max(0, Math.trunc(num(r.blk)))
        })).filter((r: any) => r.athlete_id);
        if (rows.length) {
          const { error } = await sb.from('daily_stats').upsert(rows, { onConflict: 'athlete_id,stat_date' });
          if (error) throw error;
        }
        await audit('admin_save_stats', 'daily_stats', date, { count: rows.length });
        return json({ result: 'success', message: 'Estatísticas salvas.' });
      }

      case 'saveAthlete': {
        const id = text(p.id);
        const athlete = p.athlete || {};
        const name = text(athlete.name);
        if (!name) return fail('Nome do atleta é obrigatório.', 'VALIDATION_ERROR');
        const row: any = {
          name,
          height_m: text(athlete.height_m) ? num(athlete.height_m) : null,
          position: text(athlete.position) || null,
          jersey_number: text(athlete.jersey_number) || null,
          specialty: text(athlete.specialty) || null,
          joined_on: text(athlete.joined_on) || null,
          birth_date: text(athlete.birth_date) || null,
          photo_url: text(athlete.photo_url) || null,
          eligible_for_hof: athlete.eligible_for_hof !== false,
          active: athlete.active !== false,
        };
        let athleteId = id;
        if (id) {
          const { error } = await sb.from('athletes').update(row).eq('id', id); if (error) throw error;
        } else {
          const { data, error } = await sb.from('athletes').insert(row).select('id').single(); if (error) throw error; athleteId = data.id;
        }

        const acc = p.account || {};
        const { data: existingAccount, error: existingError } = await sb.from('accounts').select('*').eq('athlete_id', athleteId).maybeSingle();
        if (existingError) throw existingError;
        if (acc.enabled) {
          const email = lower(acc.email);
          if (!email || !email.includes('@')) return fail('E-mail válido é obrigatório para liberar acesso.', 'VALIDATION_ERROR');
          const password = typeof acc.password === 'string' ? acc.password : '';
          if (!existingAccount && password.length < 8) return fail('Nova conta exige senha inicial de pelo menos 8 caracteres.', 'VALIDATION_ERROR');
          const requestedRole = String(acc.role || '').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'MEMBER';
          const isOwnerAccount = lower(existingAccount?.email || email) === OWNER_EMAIL;
          const update: any = {
            athlete_id: athleteId,
            email: isOwnerAccount ? OWNER_EMAIL : email,
            role: isOwnerAccount ? 'ADMIN' : requestedRole,
            status: 'approved',
          };
          if (password) {
            if (password.length < 8 || password.length > 512) return fail('Senha deve ter de 8 a 512 caracteres.', 'VALIDATION_ERROR');
            update.legacy_password_hash = await hashPassword(password);
          }
          if (existingAccount) {
            const { error } = await sb.from('accounts').update(update).eq('id', existingAccount.id); if (error) throw error;
            if (password) await sb.from('app_sessions').delete().eq('account_id', existingAccount.id);
          } else {
            const { error } = await sb.from('accounts').insert(update); if (error) throw error;
          }
        } else if (existingAccount && lower(existingAccount.email) !== OWNER_EMAIL) {
          const { error } = await sb.from('accounts').update({ status: 'disabled' }).eq('id', existingAccount.id); if (error) throw error;
          await sb.from('app_sessions').delete().eq('account_id', existingAccount.id);
        }
        await audit(id ? 'admin_update_athlete' : 'admin_create_athlete', 'athlete', athleteId, { name, accountEnabled: Boolean(acc.enabled), role: acc.enabled ? (String(acc.role || '').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'MEMBER') : null });
        return json({ result: 'success', message: id ? 'Atleta atualizado.' : 'Atleta cadastrado.', id: athleteId });
      }

      case 'resetPassword': {
        const email = lower(p.email);
        const newPassword = typeof p.newPassword === 'string' ? p.newPassword : '';
        if (!email || newPassword.length < 8 || newPassword.length > 512) {
          return fail('Use uma senha de 8 a 512 caracteres.', 'VALIDATION_ERROR');
        }
        const { data: target, error: targetError } = await sb.from('accounts').select('id,email,status').ilike('email', email).maybeSingle();
        if (targetError) throw targetError;
        if (!target) return fail('Usuário não encontrado.', 'NOT_FOUND', 404);
        if (target.status !== 'approved') return fail('O acesso deste usuário está desativado.', 'ACCOUNT_DISABLED', 409);
        const passwordHash = await hashPassword(newPassword);
        const { error: updateError } = await sb.from('accounts').update({ legacy_password_hash: passwordHash }).eq('id', target.id);
        if (updateError) throw updateError;
        await sb.from('app_sessions').delete().eq('account_id', target.id);
        await audit('admin_reset_password', 'account', target.id, { email: target.email });
        return json({ result: 'success', message: 'Senha redefinida com sucesso. As sessões anteriores foram encerradas.' });
      }

      case 'setAthleteActive': {
        const id = text(p.id); const active = Boolean(p.active);
        const { error } = await sb.from('athletes').update({ active }).eq('id', id); if (error) throw error;
        if (!active) {
          const { data: acc } = await sb.from('accounts').select('id,email').eq('athlete_id', id).maybeSingle();
          if (acc && lower(acc.email) !== OWNER_EMAIL) {
            await sb.from('accounts').update({ status: 'disabled' }).eq('id', acc.id);
            await sb.from('app_sessions').delete().eq('account_id', acc.id);
          }
        }
        await audit('admin_set_athlete_active', 'athlete', id, { active });
        return json({ result: 'success', message: active ? 'Atleta ativado.' : 'Atleta inativado.' });
      }

      case 'ensureFinanceYear': {
        const year = Math.trunc(num(p.year));
        if (year < 2020 || year > 2100) return fail('Ano inválido.', 'VALIDATION_ERROR');
        const { data: feeRow } = await sb.from('app_settings').select('value').eq('key', 'monthly_fee').maybeSingle();
        const fee = Number(feeRow?.value ?? 20) || 20;
        const monthLabels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        const periods = Array.from({ length: 12 }, (_, i) => ({ year, month: i + 1, label: `${monthLabels[i]}/${year}`, due_date: `${year}-${String(i + 1).padStart(2,'0')}-10`, default_amount: fee }));
        const { error: pErr } = await sb.from('finance_periods').upsert(periods, { onConflict: 'year,month', ignoreDuplicates: true }); if (pErr) throw pErr;
        const { data: savedPeriods, error: spErr } = await sb.from('finance_periods').select('id,default_amount').eq('year', year); if (spErr) throw spErr;
        const { data: athletes, error: aErr } = await sb.from('athletes').select('id').eq('active', true); if (aErr) throw aErr;
        const duesRows: any[] = [];
        for (const a of athletes || []) for (const fp of savedPeriods || []) duesRows.push({ athlete_id: a.id, period_id: fp.id, amount_due: fp.default_amount, amount_paid: 0, status: 'pending' });
        if (duesRows.length) {
          const { error } = await sb.from('member_dues').upsert(duesRows, { onConflict: 'athlete_id,period_id', ignoreDuplicates: true }); if (error) throw error;
        }
        await audit('admin_ensure_finance_year', 'finance_periods', String(year), { athletes: (athletes || []).length });
        return json({ result: 'success', message: `Financeiro ${year} preparado.` });
      }

      case 'saveDue': {
        const athleteId = text(p.athleteId), periodId = text(p.periodId);
        const amountDue = Math.max(0, num(p.amountDue)); const amountPaid = Math.max(0, num(p.amountPaid));
        const status = p.status === 'exempt' ? 'exempt' : amountPaid <= 0 ? 'pending' : amountPaid >= amountDue ? 'paid' : 'partial';
        const paidAt = amountPaid > 0 ? (text(p.paidAt) ? new Date(text(p.paidAt)).toISOString() : nowIso()) : null;
        const { error } = await sb.from('member_dues').upsert({ athlete_id: athleteId, period_id: periodId, amount_due: amountDue, amount_paid: amountPaid, status, paid_at: paidAt, note: text(p.note) || null }, { onConflict: 'athlete_id,period_id' });
        if (error) throw error;
        const { error: delError } = await sb.from('finance_entries').delete().eq('athlete_id', athleteId).eq('period_id', periodId).eq('kind', 'revenue').eq('category', 'mensalidade'); if (delError) throw delError;
        if (amountPaid > 0) {
          const { error: insError } = await sb.from('finance_entries').insert({ occurred_on: paidAt ? paidAt.slice(0,10) : today(), kind: 'revenue', amount: amountPaid, category: 'mensalidade', description: 'Mensalidade', athlete_id: athleteId, period_id: periodId, created_by: account.id }); if (insError) throw insError;
        }
        await refreshFinanceSnapshot();
        await audit('admin_save_due', 'member_dues', `${athleteId}:${periodId}`, { amountDue, amountPaid, status });
        return json({ result: 'success', message: 'Mensalidade atualizada.' });
      }

      case 'saveFinanceEntry': {
        const id = text(p.id);
        const kind = p.kind === 'expense' ? 'expense' : 'revenue';
        const row: any = { occurred_on: text(p.occurred_on) || today(), kind, amount: Math.max(0.01, num(p.amount)), category: text(p.category) || 'outras', description: text(p.description) || null, created_by: account.id };
        if (id) { const { error } = await sb.from('finance_entries').update(row).eq('id', id); if (error) throw error; }
        else { const { error } = await sb.from('finance_entries').insert(row); if (error) throw error; }
        await refreshFinanceSnapshot();
        await audit(id ? 'admin_update_finance_entry' : 'admin_create_finance_entry', 'finance_entry', id || 'new', row);
        return json({ result: 'success', message: 'Lançamento financeiro salvo.' });
      }

      case 'deleteFinanceEntry': {
        const id = text(p.id); const { error } = await sb.from('finance_entries').delete().eq('id', id); if (error) throw error;
        await refreshFinanceSnapshot(); await audit('admin_delete_finance_entry', 'finance_entry', id);
        return json({ result: 'success', message: 'Lançamento excluído.' });
      }

      case 'saveGame': {
        const id = text(p.id);
        const row = { game_date: text(p.game_date), game_time: text(p.game_time), location: text(p.location), created_by: account.id, cancelled_at: p.cancelled ? nowIso() : null };
        if (!row.game_date || !row.game_time || !row.location) return fail('Data, horário e local são obrigatórios.', 'VALIDATION_ERROR');
        if (id) { const { error } = await sb.from('games').update(row).eq('id', id); if (error) throw error; }
        else { const { error } = await sb.from('games').insert(row); if (error) throw error; }
        await audit(id ? 'admin_update_game' : 'admin_create_game', 'game', id || 'new', row);
        return json({ result: 'success', message: 'Jogo salvo.' });
      }
      case 'deleteGame': {
        const id = text(p.id); const { error } = await sb.from('games').delete().eq('id', id); if (error) throw error;
        await audit('admin_delete_game', 'game', id); return json({ result: 'success', message: 'Jogo excluído.' });
      }

      case 'saveEvent': {
        const id = text(p.id);
        const rawDate = text(p.starts_at);
        const startsAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(rawDate)
          ? rawDate + '-03:00' : rawDate;
        const row = { name: text(p.name), starts_at: startsAt, location: text(p.location), description: text(p.description), value: Math.max(0, num(p.value)), deadline: text(p.deadline), created_by: account.id };
        if (!row.name || !row.starts_at || !row.location || !row.deadline) return fail('Nome, data, local e prazo são obrigatórios.', 'VALIDATION_ERROR');
        const eventInstant = new Date(row.starts_at);
        const deadlineDate = /^\d{4}-\d{2}-\d{2}$/.test(row.deadline) ? new Date(row.deadline + 'T12:00:00Z') : new Date(NaN);
        if (!Number.isFinite(eventInstant.getTime()) || !Number.isFinite(deadlineDate.getTime()) ||
            deadlineDate.toISOString().slice(0,10) !== row.deadline) {
          return fail('Informe uma data/hora válida para o evento e um prazo de inscrição válido.', 'VALIDATION_ERROR');
        }
        const eventParts = new Intl.DateTimeFormat('en-US', {
          timeZone:'America/Bahia', year:'numeric', month:'2-digit', day:'2-digit'
        }).formatToParts(eventInstant);
        const part = (type:string) => eventParts.find(x => x.type===type)?.value || '';
        const eventDay = `${part('year')}-${part('month')}-${part('day')}`;
        if (row.deadline > eventDay) return fail('O prazo de inscrição deve ser até o dia do evento. Escolha essa data ou uma anterior.', 'EVENT_DATE_INVALID', 422);
        if (id) { const { error } = await sb.from('events').update(row).eq('id', id); if (error) throw error; }
        else { const { error } = await sb.from('events').insert(row); if (error) throw error; }
        await audit(id ? 'admin_update_event' : 'admin_create_event', 'event', id || 'new', row);
        return json({ result: 'success', message: 'Evento salvo.' });
      }
      case 'deleteEvent': {
        const id = text(p.id); const { error } = await sb.from('events').delete().eq('id', id); if (error) throw error;
        await audit('admin_delete_event', 'event', id); return json({ result: 'success', message: 'Evento excluído.' });
      }

      case 'saveMedical': {
        const id = text(p.id), athleteId = text(p.athlete_id);
        const row: any = { athlete_id: athleteId, injury: text(p.injury), injury_date: text(p.injury_date), expected_return: text(p.expected_return), status: text(p.status) || 'Em tratamento', discharged_at: null, discharged_by: null };
        if (!athleteId || !row.injury || !row.injury_date || !row.expected_return) return fail('Atleta, lesão e datas são obrigatórios.', 'VALIDATION_ERROR');
        if (id) { const { error } = await sb.from('medical_records').update(row).eq('id', id); if (error) throw error; }
        else { const { error } = await sb.from('medical_records').insert(row); if (error) throw error; }
        await audit(id ? 'admin_update_medical' : 'admin_create_medical', 'medical_record', id || 'new', row);
        return json({ result: 'success', message: 'Registro médico salvo.' });
      }
      case 'dischargeMedical': {
        const id = text(p.id); const { error } = await sb.from('medical_records').update({ status: 'Alta', discharged_at: nowIso(), discharged_by: account.id }).eq('id', id); if (error) throw error;
        await audit('admin_discharge_medical', 'medical_record', id); return json({ result: 'success', message: 'Alta registrada.' });
      }
      case 'deleteMedical': {
        const id = text(p.id); const { error } = await sb.from('medical_records').delete().eq('id', id); if (error) throw error;
        await audit('admin_delete_medical', 'medical_record', id); return json({ result: 'success', message: 'Registro médico excluído.' });
      }

      case 'sendNotification': {
        const title = text(p.title), message = text(p.message), targetTab = text(p.targetTab || 'presenca');
        if (!title || !message) return fail('Título e mensagem são obrigatórios.', 'VALIDATION_ERROR');
        let accepted = 0, failed = 0;
        if (p.sendPush !== false) {
          const { data: tokenRows, error } = await sb.from('accounts').select('push_token').eq('status', 'approved').not('push_token', 'is', null); if (error) throw error;
          const tokens = [...new Set((tokenRows || []).map((r: any) => text(r.push_token)).filter((t: string) => /^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(t)))];
          for (let i = 0; i < tokens.length; i += 100) {
            const batch = tokens.slice(i, i + 100).map(to => ({ to, sound: 'default', title, body: message, data: { targetTab } }));
            try {
              const r = await fetch('https://api.expo.dev/v2/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(batch) });
              if (!r.ok) { failed += batch.length; continue; }
              const payload = await r.json(); const tickets = Array.isArray(payload?.data) ? payload.data : [];
              const ok = tickets.filter((t: any) => t?.status === 'ok').length; accepted += ok; failed += batch.length - ok;
            } catch { failed += batch.length; }
          }
        }
        const { error } = await sb.from('notifications').insert({ title, message, target_tab: targetTab, sent_by: account.id, push_accepted: accepted, push_failed: failed }); if (error) throw error;
        await audit('admin_send_notification', 'notification', title, { accepted, failed, targetTab });
        return json({ result: 'success', message: `Aviso salvo. Push aceito: ${accepted}; falhas: ${failed}.`, accepted, failed });
      }

      case 'saveSettings': {
        const settings = p.settings || {};
        const allowed = ['monthly_fee','pix_code','active_season','finance_balance_adjustment'];
        for (const key of allowed) {
          if (!(key in settings)) continue;
          const value = settings[key];
          const { error } = await sb.from('app_settings').upsert({ key, value, is_public: ['monthly_fee','pix_code','active_season'].includes(key) }, { onConflict: 'key' }); if (error) throw error;
        }
        await refreshFinanceSnapshot();
        await audit('admin_save_settings', 'app_settings', 'bulk', settings);
        return json({ result: 'success', message: 'Configurações salvas.' });
      }

      default:
        return fail('Ação administrativa não reconhecida.', 'UNKNOWN_ACTION', 400);
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
