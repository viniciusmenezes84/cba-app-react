-- Safe date-only reset for test statistics; never touches attendance, seasons or other dates.
-- A server-side recovery snapshot is kept before removal in the same transaction.
create table if not exists public.cba_stats_reset_backups (
  id uuid primary key default gen_random_uuid(),
  stat_date date not null,
  actor_account_id uuid not null references public.accounts(id),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists cba_stats_reset_backups_date_idx
  on public.cba_stats_reset_backups (stat_date, created_at desc);
alter table public.cba_stats_reset_backups enable row level security;
revoke all on public.cba_stats_reset_backups from public, anon, authenticated;
grant select, insert on public.cba_stats_reset_backups to service_role;

create or replace function public.cba_reset_stats_for_date(p_date date, p_actor uuid)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $fn$
declare
  before_data jsonb;
  backup uuid;
  daily_count int := 0;
  legacy_count int := 0;
  match_count int := 0;
  athlete_match_count int := 0;
  total_count int := 0;
begin
  if p_date is null or p_actor is null then
    raise exception 'Data e administrador obrigatórios.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.accounts
    where id = p_actor and status = 'approved' and upper(role::text) = 'ADMIN'
  ) then
    raise exception 'Somente administradores podem zerar uma súmula.' using errcode = '42501';
  end if;

  -- The same lock is used by per-game and manual daily save operations.
  perform pg_advisory_xact_lock(712046, p_date - date '2000-01-01');

  select count(*) into daily_count from public.daily_stats where stat_date=p_date;
  select count(*) into legacy_count from public.daily_stats_legacy where stat_date=p_date;
  select count(*) into match_count from public.round_matches where match_date=p_date;
  select count(*) into athlete_match_count
    from public.match_player_stats ms
    join public.round_matches rm on rm.id=ms.match_id
    where rm.match_date=p_date;
  total_count := daily_count + legacy_count + match_count + athlete_match_count;

  if total_count = 0 then
    return jsonb_build_object('result','success','date',p_date,'dailyRows',0,
      'legacyRows',0,'matches',0,'athleteMatchRows',0,'alreadyEmpty',true);
  end if;

  -- Keep full original rows (including IDs, timestamps and per-game stats)
  -- so a database administrator can restore mistakenly removed test data.
  select jsonb_build_object(
    'dailyStats',coalesce((select jsonb_agg(to_jsonb(d)) from public.daily_stats d
      where d.stat_date=p_date),'[]'::jsonb),
    'legacyStats',coalesce((select jsonb_agg(to_jsonb(l)) from public.daily_stats_legacy l
      where l.stat_date=p_date),'[]'::jsonb),
    'roundMatches',coalesce((select jsonb_agg(to_jsonb(rm)) from public.round_matches rm
      where rm.match_date=p_date),'[]'::jsonb),
    'matchPlayerStats',coalesce((select jsonb_agg(to_jsonb(ms))
      from public.match_player_stats ms
      join public.round_matches rm on rm.id=ms.match_id
      where rm.match_date=p_date),'[]'::jsonb)
  ) into before_data;

  insert into public.cba_stats_reset_backups (stat_date,actor_account_id,snapshot)
    values(p_date,p_actor,before_data) returning id into backup;

  -- FK ON DELETE CASCADE removes the related individual player stats.
  delete from public.round_matches where match_date=p_date;
  delete from public.daily_stats_legacy where stat_date=p_date;
  delete from public.daily_stats where stat_date=p_date;

  insert into public.audit_log
    (actor_account_id,action,entity_type,entity_id,payload)
    values(p_actor,'admin_reset_stats_date','daily_stats',p_date::text,
      jsonb_build_object('backupId',backup,'dailyRows',daily_count,
      'legacyRows',legacy_count,'matches',match_count,
      'athleteMatchRows',athlete_match_count));

  return jsonb_build_object('result','success','date',p_date,'backupId',backup,
    'dailyRows',daily_count,'legacyRows',legacy_count,
    'matches',match_count,'athleteMatchRows',athlete_match_count,
    'alreadyEmpty',false);
end;
$fn$;
revoke all on function public.cba_reset_stats_for_date(date,uuid) from public, anon, authenticated;
grant execute on function public.cba_reset_stats_for_date(date,uuid) to service_role;
