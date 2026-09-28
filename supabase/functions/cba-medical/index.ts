import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const fail = (message: string, code = 'BAD_REQUEST', status = 400) => json({ result: 'error', code, message }, status);
const text = (value: unknown) => String(value ?? '').trim();
const lower = (value: unknown) => text(value).toLowerCase();
const bytesToHex = (bytes: Uint8Array) => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

const allowedStatuses = new Set([
  'Aguardando Exames',
  'Repouso Absoluto',
  'Fisioterapia',
  'Transição Física',
  'Afastado por Recomendação',
]);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return fail('Use POST.', 'METHOD_NOT_ALLOWED', 405);

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = text(body?.action || 'bootstrap');
    const token = text(body?.token);
    if (!/^[a-f0-9]{64}$/i.test(token)) return fail('Sessão inválida. Entre novamente.', 'UNAUTHORIZED', 401);

    const tokenHash = await sha256Hex(token);
    const { data: session, error: sessionError } = await sb
      .from('app_sessions')
      .select('account_id,expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) return fail('Sessão não encontrada. Entre novamente.', 'UNAUTHORIZED', 401);
    if (new Date(session.expires_at).getTime() <= Date.now()) {
      await sb.from('app_sessions').delete().eq('token_hash', tokenHash);
      return fail('Sessão expirada. Entre novamente.', 'SESSION_EXPIRED', 401);
    }

    const { data: account, error: accountError } = await sb
      .from('accounts')
      .select('id,athlete_id,email,role,status,athletes(name,photo_url)')
      .eq('id', session.account_id)
      .maybeSingle();
    if (accountError) throw accountError;
    if (!account || account.status !== 'approved') return fail('Acesso não autorizado.', 'UNAUTHORIZED', 401);
    await sb.from('app_sessions').update({ last_seen_at: new Date().toISOString() }).eq('token_hash', tokenHash);

    const isAdmin = String(account.role || '').toUpperCase() === 'ADMIN';
    const actorAthleteId = account.athlete_id || null;
    const athleteRaw: any = (account as any).athletes;
    const actorAthlete = Array.isArray(athleteRaw) ? athleteRaw[0] : athleteRaw;

    const audit = async (auditAction: string, entityId: string, payload?: unknown) => {
      await sb.from('audit_log').insert({
        actor_account_id: account.id,
        action: auditAction,
        entity_type: 'medical_record',
        entity_id: entityId,
        payload: payload ?? null,
      });
    };

    const loadRecords = async () => {
      const { data, error } = await sb
        .from('medical_records')
        .select('id,athlete_id,injury,injury_date,expected_return,status,discharged_at,created_at,updated_at,athletes(name,photo_url)')
        .order('injury_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => {
        const athlete = Array.isArray(row.athletes) ? row.athletes[0] : row.athletes;
        const own = Boolean(actorAthleteId && row.athlete_id === actorAthleteId);
        const full = isAdmin || own;
        return {
          id: row.id,
          athleteId: row.athlete_id,
          playerName: athlete?.name || 'Atleta',
          photoUrl: athlete?.photo_url || '',
          status: row.status,
          dischargedAt: row.discharged_at,
          isOwn: own,
          canViewDetails: full,
          injury: full ? row.injury : null,
          injuryDate: full ? row.injury_date : null,
          expectedReturn: full ? row.expected_return : null,
          createdAt: full ? row.created_at : null,
          updatedAt: full ? row.updated_at : null,
        };
      });
    };

    if (action === 'bootstrap') {
      const records = await loadRecords();
      let athletes: any[] = [];
      if (isAdmin) {
        const { data, error } = await sb.from('athletes').select('id,name,photo_url').eq('active', true).order('name');
        if (error) throw error;
        athletes = data || [];
      }
      const visibleRecords = isAdmin
        ? records
        : records.filter((record: any) => record.isOwn || !record.dischargedAt).map((record: any) => record.isOwn ? record : {
            id: record.id,
            athleteId: record.athleteId,
            playerName: record.playerName,
            photoUrl: record.photoUrl,
            status: record.status,
            dischargedAt: null,
            isOwn: false,
            canViewDetails: false,
            injury: null,
            injuryDate: null,
            expectedReturn: null,
          });
      return json({
        result: 'success',
        isAdmin,
        currentAthleteId: actorAthleteId,
        currentAthleteName: actorAthlete?.name || '',
        records: visibleRecords,
        athletes,
      });
    }

    if (!isAdmin) return fail('Esta operação exige um administrador.', 'FORBIDDEN', 403);

    if (action === 'save') {
      const id = text(body?.id);
      const athleteId = text(body?.athleteId);
      const injury = text(body?.injury);
      const injuryDate = text(body?.injuryDate);
      const expectedReturn = text(body?.expectedReturn);
      const status = text(body?.status);
      if (!athleteId || !injury || injury.length > 300 || !/^\d{4}-\d{2}-\d{2}$/.test(injuryDate) || !/^\d{4}-\d{2}-\d{2}$/.test(expectedReturn) || !allowedStatuses.has(status)) {
        return fail('Preencha corretamente atleta, lesão, datas e fase do tratamento.', 'VALIDATION_ERROR');
      }
      if (expectedReturn < injuryDate) return fail('A previsão de retorno não pode ser anterior à data da lesão.', 'VALIDATION_ERROR');
      const { data: athlete, error: athleteError } = await sb.from('athletes').select('id').eq('id', athleteId).eq('active', true).maybeSingle();
      if (athleteError) throw athleteError;
      if (!athlete) return fail('Atleta não encontrado ou inativo.', 'NOT_FOUND', 404);

      if (id) {
        const { data: current, error: currentError } = await sb.from('medical_records').select('id,discharged_at').eq('id', id).maybeSingle();
        if (currentError) throw currentError;
        if (!current) return fail('Registro médico não encontrado.', 'NOT_FOUND', 404);
        if (current.discharged_at) return fail('Registros com alta devem permanecer no histórico. Crie um novo registro para uma nova ocorrência.', 'ALREADY_DISCHARGED', 409);
        const { error } = await sb.from('medical_records').update({ athlete_id: athleteId, injury, injury_date: injuryDate, expected_return: expectedReturn, status }).eq('id', id);
        if (error) throw error;
        await audit('update_medical_record', id, { status, expectedReturn });
        return json({ result: 'success', message: 'Registro atualizado.' });
      }

      const { data, error } = await sb.from('medical_records').insert({
        athlete_id: athleteId,
        injury,
        injury_date: injuryDate,
        expected_return: expectedReturn,
        status,
      }).select('id').single();
      if (error) throw error;
      await audit('create_medical_record', data.id, { status, expectedReturn });
      return json({ result: 'success', message: 'Ocorrência registrada.', id: data.id });
    }

    if (action === 'discharge') {
      const id = text(body?.id);
      if (!id) return fail('Registro inválido.', 'VALIDATION_ERROR');
      const { data: current, error: currentError } = await sb.from('medical_records').select('id,discharged_at').eq('id', id).maybeSingle();
      if (currentError) throw currentError;
      if (!current) return fail('Registro médico não encontrado.', 'NOT_FOUND', 404);
      if (current.discharged_at) return json({ result: 'success', message: 'A alta já estava registrada.' });
      const now = new Date().toISOString();
      const { error } = await sb.from('medical_records').update({ status: 'Alta', discharged_at: now, discharged_by: account.id }).eq('id', id);
      if (error) throw error;
      await audit('discharge_medical_record', id, { dischargedAt: now });
      return json({ result: 'success', message: 'Alta registrada e histórico preservado.' });
    }

    return fail('Ação médica não reconhecida.', 'UNKNOWN_ACTION', 400);
  } catch (error: any) {
    console.error(error);
    const safeStatus = Number(error?.status);
    const safeCodes = new Set(['UNAUTHORIZED','SESSION_EXPIRED','FORBIDDEN','VALIDATION_ERROR','NOT_FOUND','ALREADY_DISCHARGED']);
    if (safeStatus >= 400 && safeStatus < 500 && safeCodes.has(String(error?.code))) {
      return fail(error?.message || 'Não foi possível concluir a operação.',String(error.code),safeStatus);
    }
    return fail('Ocorreu um erro interno. Tente novamente.','INTERNAL_ERROR',500);
  }
});
