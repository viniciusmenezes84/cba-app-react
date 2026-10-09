
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const fail = (message: string, code = 'PORTAL_ERROR', status = 400) => json({ result: 'error', code, message }, status);
const text = (v: unknown) => String(v ?? '').trim();
const lower = (v: unknown) => text(v).toLowerCase();
const todayBahia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
const bytesToHex = (bytes: Uint8Array) => Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
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

    const { data: account, error: accountError } = await sb.from('accounts').select('id,email,role,status,athlete_id,athletes(name,nickname,photo_url,position,jersey_number)').eq('id', session.account_id).maybeSingle();
    if (accountError) throw accountError;
    if (!account || account.status !== 'approved') return fail('Acesso não autorizado.', 'FORBIDDEN', 403);
    const isAdmin = String(account.role || '').toUpperCase() === 'ADMIN';
    const athleteRaw:any = (account as any).athletes;
    const ownAthlete:any = Array.isArray(athleteRaw) ? athleteRaw[0] : athleteRaw;

    await sb.from('app_sessions').update({ last_seen_at: new Date().toISOString() }).eq('token_hash', tokenHash);

    const audit = async (auditAction:string, entityType:string, entityId:string, payload?:unknown) => {
      await sb.from('audit_log').insert({ actor_account_id: account.id, action:auditAction, entity_type:entityType, entity_id:entityId, payload:payload ?? null });
    };

    const profile = (athlete:any) => ({
      athleteId:account.athlete_id, name:athlete.name, nickname:athlete.nickname || '',
      photoUrl:athlete.photo_url || '', position:athlete.position || '', jerseyNumber:athlete.jersey_number || ''
    });

    if (action === 'getMyProfile' || action === 'updateMyProfile') {
      if (!account.athlete_id || !ownAthlete) return fail('Sua conta ainda não está vinculada a um atleta. Procure a administração.', 'NO_ATHLETE', 409);
      if (action === 'updateMyProfile') {
        const allowed = new Set(['action','token','nickname','photoUrl','position','jerseyNumber']);
        if (Object.keys(p).some(key => !allowed.has(key))) return fail('Campo não permitido na edição do perfil.', 'VALIDATION_ERROR');
        const row:Record<string,unknown> = {};
        for (const [key,column,max] of [['nickname','nickname',40],['position','position',60],['jerseyNumber','jersey_number',2],['photoUrl','photo_url',2048]] as const) {
          if (!(key in p)) continue;
          if (typeof p[key] !== 'string') return fail('Informe os campos do perfil como texto.', 'VALIDATION_ERROR');
          const value = text(p[key]);
          if (value.length > max) return fail(`O campo ${key} excede o limite permitido.`, 'VALIDATION_ERROR');
          if (key === 'jerseyNumber' && value && !/^\d{1,2}$/.test(value)) return fail('A camisa deve ter um ou dois dígitos.', 'VALIDATION_ERROR');
          if (key === 'photoUrl' && value) {
            try {
              const url = new URL(value);
              if (url.protocol !== 'https:' || url.username || url.password) throw new Error('invalid');
            } catch { return fail('Use um link HTTPS válido para a foto.', 'VALIDATION_ERROR'); }
          }
          row[column] = value || null;
        }
        if (!Object.keys(row).length) return fail('Nenhuma alteração informada.', 'VALIDATION_ERROR');
        const {data:updated,error} = await sb.from('athletes').update(row).eq('id',account.athlete_id)
          .select('name,nickname,photo_url,position,jersey_number').single();
        if (error) throw error;
        await audit('self_update_profile','athlete',account.athlete_id,{fields:Object.keys(row)});
        return json({result:'success',profile:profile(updated)});
      }
      const year = Number(p.year || todayBahia().slice(0,4));
      if (!Number.isInteger(year) || year < 2000 || year > Number(todayBahia().slice(0,4))) return fail('Temporada inválida.', 'VALIDATION_ERROR');
      const end = `${year}-12-31` < todayBahia() ? `${year}-12-31` : todayBahia();
      const [attendance,stats] = await Promise.all([
        sb.from('attendance_records').select('attendance_date,status').eq('athlete_id',account.athlete_id).gte('attendance_date',`${year}-01-01`).lte('attendance_date',end).order('attendance_date'),
        sb.from('daily_stats').select('stat_date,pts2,pts3,reb,ast,blk').eq('athlete_id',account.athlete_id).gte('stat_date',`${year}-01-01`).lte('stat_date',end).order('stat_date')
      ]);
      if (attendance.error || stats.error) throw attendance.error || stats.error;
      return json({result:'success',profile:profile(ownAthlete),year,attendance:attendance.data || [],stats:stats.data || []});
    }

    if (action === 'bootstrap') {
      const [
        athletesQ, attendanceQ, statsQ, periodsQ, duesQ, entriesQ,
        gamesQ, gameConfirmationsQ, eventsQ, eventAttendeesQ,
        statutesQ, notificationsQ, settingsQ, accountsQ, medicalQ, matchesQ
      ] = await Promise.all([
        sb.from('athletes').select('id,name,photo_url,position,jersey_number,eligible_for_hof,active,birth_date').order('name'),
        sb.from('attendance_records').select('athlete_id,attendance_date,status').order('attendance_date'),
        sb.from('daily_stats').select('athlete_id,stat_date,pts2,pts3,reb,ast,blk').order('stat_date'),
        sb.from('finance_periods').select('*').order('year',{ascending:false}).order('month'),
        sb.from('member_dues').select('*'),
        sb.from('finance_entries').select('id,occurred_on,kind,amount,category,description,athlete_id,period_id').order('occurred_on',{ascending:false}).limit(1000),
        sb.from('games').select('*').order('game_date',{ascending:false}).order('game_time',{ascending:false}),
        sb.from('game_confirmations').select('game_id,athlete_id'),
        sb.from('events').select('*').order('starts_at',{ascending:false}),
        sb.from('event_attendees').select('event_id,athlete_id'),
        sb.from('statute_documents').select('*').eq('active',true).order('sort_order').order('document_date',{ascending:false}),
        sb.from('notifications').select('id,title,message,target_tab,push_accepted,push_failed,created_at,sent_by').order('created_at',{ascending:false}).limit(200),
        sb.from('app_settings').select('key,value'),
        sb.from('accounts').select('id,email,role,status,athlete_id'),
        sb.from('medical_records').select('athlete_id,status,discharged_at').is('discharged_at',null),
        sb.from('round_matches').select('match_date,session_key,match_number,black_score,green_score,winner,team_black,team_green,player_stats').order('match_date',{ascending:false}).order('match_number').limit(1000)
      ]);
      const queries:any[] = [athletesQ,attendanceQ,statsQ,periodsQ,duesQ,entriesQ,gamesQ,gameConfirmationsQ,eventsQ,eventAttendeesQ,statutesQ,notificationsQ,settingsQ,accountsQ,medicalQ,matchesQ];
      for (const q of queries) if (q.error) throw q.error;

      const athletes:any[] = athletesQ.data || [];
      const athleteById = new Map(athletes.map(a => [a.id,a]));
      const activeAthletes = athletes.filter(a => a.active);
      const settings = Object.fromEntries((settingsQ.data || []).map((x:any)=>[x.key,x.value]));
      const periods:any[] = periodsQ.data || [];
      const dues:any[] = duesQ.data || [];
      const entries:any[] = entriesQ.data || [];
      const adjustment = Number(settings.finance_balance_adjustment || 0);
      const revenue = entries.filter(e=>e.kind==='revenue').reduce((s,e)=>s+Number(e.amount||0),0);
      const expense = entries.filter(e=>e.kind==='expense').reduce((s,e)=>s+Number(e.amount||0),0);

      // Permissões financeiras: o papel vem da conta autenticada no banco, nunca do payload.
      // Todos podem consultar indicadores agregados; somente ADMIN recebe mensalidades alheias.
      const financeDues = isAdmin
        ? dues
        : dues.filter(d => account.athlete_id && d.athlete_id === account.athlete_id)
          .map(d => ({
            athlete_id:d.athlete_id, period_id:d.period_id, amount_due:d.amount_due,
            amount_paid:d.amount_paid, status:d.status, paid_at:d.paid_at
          }));
      const yearByPeriod = new Map(periods.map(period => [period.id, Number(period.year)]));
      const aggregateByYear: Record<string,{amountDue:number,amountPaid:number,outstanding:number}> = {};
      for (const due of dues) {
        const year = yearByPeriod.get(due.period_id);
        if (!Number.isInteger(year)) continue;
        const key = String(year);
        if (!aggregateByYear[key]) aggregateByYear[key] = {amountDue:0,amountPaid:0,outstanding:0};
        const amountDue = Math.max(0,Number(due.amount_due||0));
        const amountPaid = Math.max(0,Number(due.amount_paid||0));
        aggregateByYear[key].amountDue += amountDue;
        aggregateByYear[key].amountPaid += amountPaid;
        if (!['exempt','isento'].includes(String(due.status||'').toLowerCase())) {
          aggregateByYear[key].outstanding += Math.max(0,amountDue-amountPaid);
        }
      }
      const years = [...new Set(periods.map(x=>Number(x.year)))].sort((a,b)=>b-a);
      const currentYear = Number(todayBahia().slice(0,4));
      if (!years.includes(currentYear)) years.unshift(currentYear);

      const confirmationsByGame = new Map<string,string[]>();
      for (const c of gameConfirmationsQ.data || []) {
        const name = athleteById.get(c.athlete_id)?.name;
        if (!name) continue;
        if (!confirmationsByGame.has(c.game_id)) confirmationsByGame.set(c.game_id,[]);
        confirmationsByGame.get(c.game_id)!.push(name);
      }
      const attendeesByEvent = new Map<string,string[]>();
      for (const c of eventAttendeesQ.data || []) {
        const name = athleteById.get(c.athlete_id)?.name;
        if (!name) continue;
        if (!attendeesByEvent.has(c.event_id)) attendeesByEvent.set(c.event_id,[]);
        attendeesByEvent.get(c.event_id)!.push(name);
      }

      const games = (gamesQ.data || []).map((g:any)=>({
        id:g.id, date:g.game_date, time:String(g.game_time||'').slice(0,5), location:g.location,
        cancelledAt:g.cancelled_at, cancelReason:g.cancel_reason || '',
        confirmed:(confirmationsByGame.get(g.id)||[]).sort((a,b)=>a.localeCompare(b))
      }));
      const events = (eventsQ.data || []).map((e:any)=>({
        id:e.id, name:e.name, startsAt:e.starts_at, location:e.location, description:e.description,
        value:Number(e.value||0), deadline:e.deadline, attendees:(attendeesByEvent.get(e.id)||[]).sort((a,b)=>a.localeCompare(b))
      }));

      const hallMap = new Map<string,any>();
      activeAthletes.filter(a=>a.eligible_for_hof !== false).forEach(a=>hallMap.set(a.id,{ id:a.id,name:a.name,photoUrl:a.photo_url,position:a.position,presences:0,eligibleGames:0,pts:0,reb:0,ast:0,blk:0,statGames:0 }));
      for (const r of attendanceQ.data || []) {
        const h=hallMap.get(r.athlete_id); if(!h) continue;
        if (r.status && r.status !== 'na') h.eligibleGames += 1;
        if (r.status === 'present') h.presences += 1;
      }
      for (const st of statsQ.data || []) {
        const h=hallMap.get(st.athlete_id); if(!h) continue;
        h.pts += Number(st.pts2||0)*2 + Number(st.pts3||0)*3;
        h.reb += Number(st.reb||0); h.ast += Number(st.ast||0); h.blk += Number(st.blk||0); h.statGames += 1;
      }
      const hall = [...hallMap.values()].map(h=>({...h, attendancePct:h.eligibleGames ? (h.presences/h.eligibleGames)*100 : 0}));

      const notifications = notificationsQ.data || [];
      const approvedAccounts = (accountsQ.data || []).filter((a:any)=>a.status==='approved');
      const medicalActive = medicalQ.data || [];

      return json({
        result:'success',
        user:{ email:account.email, role:account.role, athleteId:account.athlete_id, name:ownAthlete?.name || '', photoUrl:ownAthlete?.photo_url || '', nickname:ownAthlete?.nickname || '' },
        overview:{
          athletes:activeAthletes.length,
          portalUsers:approvedAccounts.length,
          dmActive:medicalActive.length,
          upcomingGames:games.filter((g:any)=>!g.cancelledAt && g.date >= todayBahia()).length,
          upcomingEvents:events.filter((e:any)=>String(e.startsAt).slice(0,10) >= todayBahia()).length
        },
        finance:{
          currentYear, years, periods, dues:financeDues,
          accessScope:isAdmin ? 'all' : 'own',
          ownerAthleteId:account.athlete_id,
          aggregateByYear,
          entries:isAdmin ? entries : [],
          summary:{ revenue,expense,balance:revenue-expense+adjustment },
          monthlyFee:Number(settings.monthly_fee || 20),
          pixCode:String(settings.pix_code || '')
        },
        games, events, hall,
        roundMatches:(matchesQ.data || []).map((match:any) => ({
          date:match.match_date, sessionKey:match.session_key, number:match.match_number,
          blackScore:match.black_score, greenScore:match.green_score, winner:match.winner,
          teamBlack:match.team_black, teamGreen:match.team_green, playerStats:match.player_stats
        })),
        statutes:statutesQ.data || [],
        notifications,
        notificationAudience:approvedAccounts.length,
        athletes:(isAdmin ? athletes : activeAthletes).map(a=>({id:a.id,name:a.name,photoUrl:a.photo_url,position:a.position,birthDate:a.birth_date}))
      });
    }

    if (!isAdmin && ['prepareFinanceYear','cancelGame','restoreGame','saveStatute','archiveStatute'].includes(action)) {
      return fail('Esta operação exige perfil administrador.', 'FORBIDDEN', 403);
    }

    if (action === 'prepareFinanceYear') {
      const year = Number(p.year);
      if (!Number.isInteger(year) || year < 2020 || year > 2100) return fail('Ano inválido.', 'VALIDATION_ERROR');
      const { data: setting } = await sb.from('app_settings').select('value').eq('key','monthly_fee').maybeSingle();
      const fee=Number(setting?.value || 20);
      const monthLabels=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const rows=Array.from({length:12},(_,i)=>({year,month:i+1,label:`${monthLabels[i]}/${year}`,due_date:`${year}-${String(i+1).padStart(2,'0')}-10`,default_amount:fee}));
      const { error }=await sb.from('finance_periods').upsert(rows,{onConflict:'year,month',ignoreDuplicates:true});
      if(error) throw error;
      await audit('portal_prepare_finance_year','finance_periods',String(year),{periods:12,duesCreated:false});
      return json({result:'success',message:`Exercício ${year} preparado. Nenhuma dívida foi criada automaticamente.`});
    }

    if (action === 'cancelGame') {
      const id=text(p.id), reason=text(p.reason);
      if(!id || !reason) return fail('Informe o motivo do cancelamento.','VALIDATION_ERROR');
      const { error }=await sb.from('games').update({cancelled_at:new Date().toISOString(),cancel_reason:reason}).eq('id',id);
      if(error) throw error;
      await audit('portal_cancel_game','game',id,{reason});
      return json({result:'success',message:'Jogo cancelado e preservado no histórico.'});
    }

    if (action === 'restoreGame') {
      const id=text(p.id);
      const { error }=await sb.from('games').update({cancelled_at:null,cancel_reason:null}).eq('id',id);
      if(error) throw error;
      await audit('portal_restore_game','game',id);
      return json({result:'success',message:'Jogo reativado.'});
    }

    if (action === 'saveStatute') {
      const id=text(p.id), title=text(p.title), content=text(p.content), documentType=text(p.documentType||'document');
      if(!title || !content) return fail('Título e conteúdo são obrigatórios.','VALIDATION_ERROR');
      const row:any={
        title, content, document_type:documentType,
        document_date:text(p.documentDate)||null,
        is_current:Boolean(p.isCurrent),
        sort_order:Number(p.sortOrder||0),
        active:true, updated_by:account.id, updated_at:new Date().toISOString()
      };
      if(row.is_current) await sb.from('statute_documents').update({is_current:false}).neq('id',id || '00000000-0000-0000-0000-000000000000');
      let savedId=id;
      if(id){ const {error}=await sb.from('statute_documents').update(row).eq('id',id); if(error) throw error; }
      else { const {data,error}=await sb.from('statute_documents').insert(row).select('id').single(); if(error) throw error; savedId=data.id; }
      await audit(id?'portal_update_statute':'portal_create_statute','statute_document',savedId,{title});
      return json({result:'success',message:'Documento salvo.',id:savedId});
    }

    if (action === 'archiveStatute') {
      const id=text(p.id);
      const {error}=await sb.from('statute_documents').update({active:false,updated_by:account.id,updated_at:new Date().toISOString()}).eq('id',id);
      if(error) throw error;
      await audit('portal_archive_statute','statute_document',id);
      return json({result:'success',message:'Documento arquivado.'});
    }

    return fail('Ação não reconhecida.','UNKNOWN_ACTION',400);
  } catch (e:any) {
    console.error(e);
    return fail('Ocorreu um erro interno. Tente novamente.','INTERNAL_ERROR',500);
  }
});
