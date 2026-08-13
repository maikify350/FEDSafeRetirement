-- Standardize echo_leads to the project audit-field convention (NON-NEGOTIABLE):
--   cre_dt, cre_by, mod_dt, mod_by, version_no  + auto mod_dt/version trigger.
-- echo_leads originally used created_at/updated_at; this renames them and adds
-- the missing fields so it matches every other table.
-- See App/supabase/DATABASE_CONVENTIONS.md.
-- Run this in Supabase Dashboard → SQL Editor.

-- 1. Rename existing timestamps to the convention (idempotent).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'echo_leads' AND column_name = 'created_at') THEN
    ALTER TABLE public.echo_leads RENAME COLUMN created_at TO cre_dt;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'echo_leads' AND column_name = 'updated_at') THEN
    ALTER TABLE public.echo_leads RENAME COLUMN updated_at TO mod_dt;
  END IF;
END $$;

-- 2. Add the remaining audit fields.
ALTER TABLE public.echo_leads
  ADD COLUMN IF NOT EXISTS cre_by     text    DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS mod_by     text    DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS version_no integer DEFAULT 1 NOT NULL;

-- 3. Backfill author for existing rows (all ingested by the phone agent).
UPDATE public.echo_leads SET cre_by = 'echowin' WHERE cre_by = '';
UPDATE public.echo_leads SET mod_by = 'echowin' WHERE mod_by = '';

-- 4. Index on creation timestamp (matches other tables).
CREATE INDEX IF NOT EXISTS idx_echo_leads_cre_dt ON public.echo_leads (cre_dt DESC);

-- 5. Auto-update mod_dt + version_no on UPDATE (function defined in 001_initial_schema.sql).
DROP TRIGGER IF EXISTS trg_echo_leads_mod_dt ON public.echo_leads;
CREATE TRIGGER trg_echo_leads_mod_dt
  BEFORE UPDATE ON public.echo_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_mod_dt();
