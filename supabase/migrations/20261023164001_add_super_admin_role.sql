-- Deliberately separate from code/migration using new enum value: PostgreSQL enum changes commit first.
ALTER TYPE public.cba_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
