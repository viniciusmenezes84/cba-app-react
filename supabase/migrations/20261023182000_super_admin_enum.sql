-- Phase 1: enum expands while current ADMIN sessions remain intact.
-- Must commit separately from first use of new PostgreSQL enum value.
ALTER TYPE public.cba_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
