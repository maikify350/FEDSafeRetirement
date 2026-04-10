-- ============================================================
-- Migration: Create "events" table
-- Run this in the Supabase SQL editor or via migrations tool.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auto-incrementing visible identifier (displayed in grid column 1)
  event_seq       BIGINT GENERATED ALWAYS AS IDENTITY,

  description     TEXT        NOT NULL,
  notes           TEXT,

  -- FK → users table (the assigned rep/agent); SET NULL if user deleted
  assignedto_fk   UUID        REFERENCES public.users(id) ON DELETE SET NULL,

  -- State abbreviation (e.g. 'IL', 'TX')
  state_fk        CHAR(2)     NOT NULL,

  -- Free-text city
  city            TEXT        NOT NULL,

  -- Scheduling fields
  event_date      DATE,                   -- "YYYY-MM-DD"
  event_time      TIME WITHOUT TIME ZONE, -- "HH:MM:SS"  (stored as time, UI sends "HH:MM")
  duration        INTEGER,                -- duration in MINUTES (positive integer)

  -- Audit columns
  cre_dt          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cre_by          TEXT        NOT NULL DEFAULT 'app',
  mod_dt          TIMESTAMPTZ,
  mod_by          TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_state       ON public.events(state_fk);
CREATE INDEX IF NOT EXISTS idx_events_assignedto  ON public.events(assignedto_fk);
CREATE INDEX IF NOT EXISTS idx_events_seq         ON public.events(event_seq);
CREATE INDEX IF NOT EXISTS idx_events_date        ON public.events(event_date);

-- RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_auth"
  ON public.events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "events_insert_auth"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "events_delete_auth"
  ON public.events FOR DELETE
  TO authenticated
  USING (true);
