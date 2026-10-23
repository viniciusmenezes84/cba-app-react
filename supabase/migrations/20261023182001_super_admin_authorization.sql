-- Phase 2: unique OWNER-bound SUPER_ADMIN, before any account promotion.
-- Privileges are determined from persisted accounts, never client-provided role.
CREATE UNIQUE INDEX IF NOT EXISTS cba_one_super_admin_idx ON public.accounts((role))
 WHERE role = 'SUPER_ADMIN';

ALTER TABLE public.accounts
 ADD CONSTRAINT cba_super_admin_unique_owner
 CHECK (role <> 'SUPER_ADMIN' OR (
   id = '66ea4f7f-f82f-40f5-a82d-cf178cbb84fb'::uuid
   AND lower(email) = 'vinicius.m84@gmail.com'
   AND athlete_id = '7092ab86-f6c2-4c53-b9cf-e04c1b4bb296'::uuid
   AND status = 'approved'
 ));

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
 SELECT COALESCE((
  SELECT a.role IN ('ADMIN','SUPER_ADMIN')
  FROM public.accounts a
  WHERE a.auth_user_id = auth.uid() AND a.status = 'approved'
  LIMIT 1
 ),false);
$$;
