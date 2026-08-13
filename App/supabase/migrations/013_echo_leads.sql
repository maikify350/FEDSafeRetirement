-- echowin seminar registration leads
-- Run this in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.echo_leads (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id                   TEXT UNIQUE NOT NULL,
  call_date                 TIMESTAMPTZ,
  agent_name                TEXT,
  caller_phone              TEXT,
  first_name                TEXT,
  last_name                 TEXT,
  email                     TEXT,
  phone                     TEXT,
  address                   TEXT,
  city                      TEXT,
  state                     TEXT,
  zip                       TEXT,
  conference_location       TEXT,   -- "Lexington, Kentucky" | "Greenville, South Carolina"
  estimated_retirement_year TEXT,
  guest_name                TEXT,
  guest_is_fed_employee     BOOLEAN,
  call_summary              TEXT,
  call_duration_seconds     INT,
  call_score                NUMERIC,
  call_quality              TEXT,
  sentiment_happy           NUMERIC,
  sentiment_sad             NUMERIC,
  sentiment_angry           NUMERIC,
  sentiment_neutral         NUMERIC,
  recording_url             TEXT,
  parse_confidence          TEXT,   -- "high" | "medium" | "low"
  notes                     TEXT,
  raw_payload               JSONB,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS echo_leads_phone_idx    ON public.echo_leads(caller_phone);
CREATE INDEX IF NOT EXISTS echo_leads_location_idx ON public.echo_leads(conference_location);
CREATE INDEX IF NOT EXISTS echo_leads_date_idx     ON public.echo_leads(call_date DESC);

ALTER TABLE public.echo_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full" ON public.echo_leads USING (true) WITH CHECK (true);

-- Key/value store for sync state etc.
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full" ON public.app_settings USING (true) WITH CHECK (true);
