-- CBA: operational access sessions and opt-in navigation analytics (no geolocation).
CREATE TABLE IF NOT EXISTS public.cba_access_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  session_hash text NOT NULL UNIQUE,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz,
  expires_at timestamptz NOT NULL,
  ended_at timestamptz,
  device_type text NOT NULL DEFAULT 'indefinido',
  os_family text NOT NULL DEFAULT 'indefinido',
  browser_family text NOT NULL DEFAULT 'indefinido',
  app_mode text NOT NULL DEFAULT 'navegador',
  language text NOT NULL DEFAULT 'indefinido',
  screen_class text NOT NULL DEFAULT 'indefinido'
);
CREATE INDEX IF NOT EXISTS cba_access_history_account_time ON public.cba_access_history(account_id, started_at DESC);
CREATE INDEX IF NOT EXISTS cba_access_history_active ON public.cba_access_history(last_active_at DESC) WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS public.cba_usage_preferences (
  account_id uuid PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  analytics_opt_in boolean,
  analytics_updated_at timestamptz,
  marketing_opt_in boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.cba_usage_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  tab_key text NOT NULL CHECK (tab_key IN ('inicio','presenca','relatorios','atleta','mesario','financas','jogos','eventos','sorteio','dm','halldafama','estatuto','notificacoes')),
  event_type text NOT NULL DEFAULT 'tab_view' CHECK (event_type='tab_view'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cba_usage_events_account_time ON public.cba_usage_events(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS cba_usage_events_tab_time ON public.cba_usage_events(tab_key,created_at DESC);

ALTER TABLE public.cba_access_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cba_usage_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cba_usage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cba_access_history,public.cba_usage_preferences,public.cba_usage_events FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.cba_access_history_id_seq,public.cba_usage_events_id_seq FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.cba_access_history,public.cba_usage_preferences,public.cba_usage_events TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.cba_access_history_id_seq,public.cba_usage_events_id_seq TO service_role;
-- Data retention is enforced server-side; app never exposes these tables directly to browsers.
