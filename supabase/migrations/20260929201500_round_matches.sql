-- Partidas individuais do mesário. A súmula diária permanece em daily_stats.
create table if not exists public.round_matches (
  id uuid primary key default gen_random_uuid(),
  match_date date not null,
  session_key text not null,
  match_number integer not null check (match_number between 1 and 200),
  black_score integer not null check (black_score between 0 and 10000),
  green_score integer not null check (green_score between 0 and 10000),
  winner text not null check (winner in ('black', 'green')),
  team_black jsonb not null check (jsonb_typeof(team_black) = 'array'),
  team_green jsonb not null check (jsonb_typeof(team_green) = 'array'),
  player_stats jsonb not null default '{}'::jsonb check (jsonb_typeof(player_stats) = 'object'),
  recorded_by uuid not null references public.accounts(id),
  created_at timestamptz not null default now(),
  unique (match_date, session_key, match_number),
  check (black_score <> green_score),
  check ((black_score > green_score and winner = 'black') or (green_score > black_score and winner = 'green'))
);

create index if not exists round_matches_date_idx on public.round_matches (match_date desc);
alter table public.round_matches enable row level security;
revoke all on public.round_matches from anon, authenticated;
grant select, insert, update on public.round_matches to service_role;
-- A leitura e a escrita passam pelas funções autenticadas cba-portal/cba-api.
