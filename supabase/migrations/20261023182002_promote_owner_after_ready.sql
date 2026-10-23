-- Phase 3: apply only after APIs and Vercel READY are confirmed.
-- Fail closed if account identity or source role changed. No extra user account is created.
DO $$
DECLARE affected integer;
BEGIN
 IF EXISTS (SELECT 1 FROM public.accounts WHERE role = 'SUPER_ADMIN') THEN
   RAISE EXCEPTION 'SUPER_ADMIN already exists; do not promote another account';
 END IF;
 UPDATE public.accounts
    SET role = 'SUPER_ADMIN'
  WHERE id = '66ea4f7f-f82f-40f5-a82d-cf178cbb84fb'::uuid
    AND lower(email) = 'vinicius.m84@gmail.com'
    AND athlete_id = '7092ab86-f6c2-4c53-b9cf-e04c1b4bb296'::uuid
    AND role = 'ADMIN'
    AND status = 'approved';
 GET DIAGNOSTICS affected = ROW_COUNT;
 IF affected <> 1 THEN
   RAISE EXCEPTION 'Expected exactly one approved owner ADMIN account. Found %', affected;
 END IF;
END $$;

-- After the promotion even a service-role UPDATE cannot accidentally demote/disable the owner.
ALTER TABLE public.accounts
 ADD CONSTRAINT cba_owner_must_remain_super_admin
 CHECK (id <> '66ea4f7f-f82f-40f5-a82d-cf178cbb84fb'::uuid
   OR (role = 'SUPER_ADMIN' AND status = 'approved'
       AND lower(email) = 'vinicius.m84@gmail.com'
       AND athlete_id = '7092ab86-f6c2-4c53-b9cf-e04c1b4bb296'::uuid));

-- The existing session tokens remain valid on the server; the portal must reload/re-login to refresh role.
