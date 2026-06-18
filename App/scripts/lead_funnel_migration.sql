-- Lead Funnel table — receives webhook data from lead providers (MegaStar, etc.)
-- Run via Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS lead_funnel (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ext_appointment_id integer,
  ext_lead_id       integer,
  event             text,
  source            text,
  lead_type         text,
  status            text DEFAULT 'pending',
  first_name        text,
  last_name         text,
  email             text,
  phone             text,
  cell_phone        text,
  birth_year        integer,
  is_over_59        boolean,
  agency            text,
  years_employed    text,
  city              text,
  state             text,
  zip               text,
  marital_status    text,
  fegli_options     text,
  retirement_year   integer,
  tsp_value         numeric,
  other_acct_value  numeric,
  appointment_date  timestamptz,
  ext_agent_id      integer,
  act_contact_id    text,
  act_user_id       text,
  assigned_agent    text,
  imported_at       timestamptz,
  import_error      text,
  raw_payload       jsonb,
  notes             text,
  processed         boolean DEFAULT false,
  cre_dt            timestamptz DEFAULT now()
);

-- Idempotency: prevent duplicate webhook entries
CREATE UNIQUE INDEX IF NOT EXISTS uix_lead_funnel_ext_appt
  ON lead_funnel(ext_appointment_id)
  WHERE ext_appointment_id IS NOT NULL;

-- Common query indexes
CREATE INDEX IF NOT EXISTS ix_lead_funnel_status ON lead_funnel(status);
CREATE INDEX IF NOT EXISTS ix_lead_funnel_state  ON lead_funnel(state);

-- Enable RLS
ALTER TABLE lead_funnel ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read lead_funnel"
  ON lead_funnel FOR SELECT
  TO authenticated
  USING (true);

-- Allow service_role to insert (webhook endpoint)
CREATE POLICY "Service role can insert lead_funnel"
  ON lead_funnel FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service_role to update (mark processed)
CREATE POLICY "Service role can update lead_funnel"
  ON lead_funnel FOR UPDATE
  TO service_role
  USING (true);

-- Allow anon to insert (webhook from external caller)
CREATE POLICY "Anon can insert lead_funnel"
  ON lead_funnel FOR INSERT
  TO anon
  WITH CHECK (true);
