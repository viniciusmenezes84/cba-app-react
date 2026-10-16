-- Keep every historical daily total and record new games independently.
-- Legacy rows are a frozen baseline; future sessions add only their own game totals.
create table if not exists public.daily_stats_legacy
  (like public.daily_stats including defaults);
alter table public.daily_stats_legacy
  add constraint daily_stats_legacy_pkey primary key (athlete_id, stat_date);
insert into public.daily_stats_legacy
select * from public.daily_stats
on conflict (athlete_id,stat_date) do nothing;
alter table public.daily_stats_legacy enable row level security;
revoke all on public.daily_stats_legacy from public, anon, authenticated;
grant select, insert, update, delete on public.daily_stats_legacy to service_role;

create table if not exists public.match_player_stats (
  match_id uuid not null references public.round_matches(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id),
  pts2 integer not null default 0 check (pts2 >= 0),
  pts3 integer not null default 0 check (pts3 >= 0),
  reb integer not null default 0 check (reb >= 0),
  ast integer not null default 0 check (ast >= 0),
  blk integer not null default 0 check (blk >= 0),
  primary key (match_id, athlete_id)
);
create index if not exists match_player_stats_athlete_idx on public.match_player_stats (athlete_id);
alter table public.match_player_stats enable row level security;
revoke all on public.match_player_stats from public, anon, authenticated;
grant select, insert, update, delete on public.match_player_stats to service_role;

-- One transaction serializes updates to a day's scores and recomputes all daily totals.
create or replace function public.cba_save_round_session(
  p_date date, p_session_key text, p_matches jsonb, p_recorded_by uuid
) returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $fn$
declare
  m jsonb;
  item jsonb;
  game_id uuid;
  games_saved integer := 0;
  n integer;
begin
  if p_date is null or p_session_key !~ '^[0-9]{10,16}$'
    or p_recorded_by is null
    or jsonb_typeof(p_matches) <> 'array'
    or jsonb_array_length(p_matches) not between 1 and 50 then
    raise exception 'Sessão inválida' using errcode = '22023';
  end if;
  -- Server validation and authorization precede this service-role-only RPC.
  perform pg_advisory_xact_lock(712046, p_date - date '2000-01-01');
  for m in select value from jsonb_array_elements(p_matches)
  loop
    n := (m->>'number')::integer;
    if n not between 1 and 200
      or jsonb_typeof(m->'athleteStats') <> 'array'
      or jsonb_array_length(m->'athleteStats') > 60 then
      raise exception 'Partida inválida' using errcode = '22023';
    end if;
    insert into public.round_matches
      (match_date,session_key,match_number,black_score,green_score,winner,
       team_black,team_green,player_stats,recorded_by)
    values
      (p_date,p_session_key,n,(m->>'blackScore')::integer,(m->>'greenScore')::integer,
       m->>'winner',m->'teamBlack',m->'teamGreen',m->'playerStats',p_recorded_by)
    on conflict (match_date,session_key,match_number) do update
      set black_score=excluded.black_score, green_score=excluded.green_score,
          winner=excluded.winner, team_black=excluded.team_black,
          team_green=excluded.team_green, player_stats=excluded.player_stats
    returning id into game_id;
    delete from public.match_player_stats where match_id=game_id;
    for item in select value from jsonb_array_elements(m->'athleteStats')
    loop
      insert into public.match_player_stats (match_id,athlete_id,pts2,pts3,reb,ast,blk)
      values (game_id,(item->>'athleteId')::uuid,
              (item->>'pts2')::integer,(item->>'pts3')::integer,
              (item->>'reb')::integer,(item->>'ast')::integer,(item->>'blk')::integer);
    end loop;
    games_saved := games_saved + 1;
  end loop;
  -- Retry/correction of the same session replaces it rather than accumulating duplicates.
  delete from public.round_matches rm
    where rm.match_date=p_date and rm.session_key=p_session_key
      and not exists (
        select 1 from jsonb_array_elements(p_matches) x
        where (x->>'number')::integer=rm.match_number
      );
  -- Keep old unsplittable rounds as a separate, immutable baseline.
  insert into public.daily_stats (athlete_id,stat_date,pts2,pts3,reb,ast,blk)
    select totals.athlete_id,p_date,
           sum(totals.pts2)::integer,sum(totals.pts3)::integer,
           sum(totals.reb)::integer,sum(totals.ast)::integer,sum(totals.blk)::integer
    from (
      select athlete_id,pts2,pts3,reb,ast,blk
        from public.daily_stats_legacy where stat_date=p_date
      union all
      select ms.athlete_id,ms.pts2,ms.pts3,ms.reb,ms.ast,ms.blk
        from public.match_player_stats ms
        join public.round_matches rm on rm.id=ms.match_id where rm.match_date=p_date
    ) totals
    group by totals.athlete_id
    on conflict (athlete_id,stat_date) do update set
      pts2=excluded.pts2,pts3=excluded.pts3,reb=excluded.reb,
      ast=excluded.ast,blk=excluded.blk,updated_at=now();
  delete from public.daily_stats d where d.stat_date=p_date
    and not exists (
      select 1 from public.daily_stats_legacy l
      where l.athlete_id=d.athlete_id and l.stat_date=d.stat_date
    )
    and not exists (
      select 1 from public.match_player_stats ms
      join public.round_matches rm on rm.id=ms.match_id
      where rm.match_date=d.stat_date and ms.athlete_id=d.athlete_id
    );
  return jsonb_build_object('result','success','gamesSaved',games_saved,'date',p_date);
end;
$fn$;

-- Admin edits the desired daily total. Preserve the game contribution by treating
-- the difference as the historical/manual baseline; never overwrite match records.
create or replace function public.cba_set_daily_totals(
  p_date date, p_records jsonb
) returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $fn$
declare
  item jsonb;
  aid uuid;
  from_matches record;
  v2 integer;
  v3 integer;
  vr integer;
  va integer;
  vb integer;
  saved integer := 0;
begin
  if p_date is null or jsonb_typeof(p_records) <> 'array'
    or jsonb_array_length(p_records)>200 then
    raise exception 'Totais inválidos' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(712046, p_date - date '2000-01-01');
  for item in select value from jsonb_array_elements(p_records)
  loop
    aid := (item->>'athlete_id')::uuid;
    select coalesce(sum(ms.pts2),0)::integer as pts2,coalesce(sum(ms.pts3),0)::integer as pts3,
      coalesce(sum(ms.reb),0)::integer as reb,coalesce(sum(ms.ast),0)::integer as ast,
      coalesce(sum(ms.blk),0)::integer as blk into from_matches
      from public.match_player_stats ms
      join public.round_matches rm on rm.id=ms.match_id
      where rm.match_date=p_date and ms.athlete_id=aid;
    v2 := (item->>'pts2')::integer - from_matches.pts2;
    v3 := (item->>'pts3')::integer - from_matches.pts3;
    vr := (item->>'reb')::integer - from_matches.reb;
    va := (item->>'ast')::integer - from_matches.ast;
    vb := (item->>'blk')::integer - from_matches.blk;
    if least(v2,v3,vr,va,vb)<0 then
      raise exception 'Total menor que as partidas salvas; corrija a súmula no Mesário.'
        using errcode='22023';
    end if;
    insert into public.daily_stats_legacy (athlete_id,stat_date,pts2,pts3,reb,ast,blk)
      values (aid,p_date,v2,v3,vr,va,vb)
      on conflict (athlete_id,stat_date) do update set
        pts2=excluded.pts2,pts3=excluded.pts3,reb=excluded.reb,
        ast=excluded.ast,blk=excluded.blk,updated_at=now();
    insert into public.daily_stats (athlete_id,stat_date,pts2,pts3,reb,ast,blk)
      values (aid,p_date,(item->>'pts2')::integer,(item->>'pts3')::integer,
        (item->>'reb')::integer,(item->>'ast')::integer,(item->>'blk')::integer)
      on conflict (athlete_id,stat_date) do update set
        pts2=excluded.pts2,pts3=excluded.pts3,reb=excluded.reb,
        ast=excluded.ast,blk=excluded.blk,updated_at=now();
    saved := saved+1;
  end loop;
  return jsonb_build_object('result','success','rowsSaved',saved);
end;
$fn$;
revoke all on function public.cba_save_round_session(date,text,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.cba_save_round_session(date,text,jsonb,uuid) to service_role;
revoke all on function public.cba_set_daily_totals(date,jsonb) from public, anon, authenticated;
grant execute on function public.cba_set_daily_totals(date,jsonb) to service_role;
