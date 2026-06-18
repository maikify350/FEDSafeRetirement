/**
 * POST /api/lead-funnel/setup — Create the lead_funnel table if it doesn't exist.
 * Uses raw SQL via Supabase's rpc or falls back to direct query.
 * This is a one-time setup endpoint — run once, then forget.
 */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'

export async function POST() {
  const admin = createAdminClient()

  // Test if table already exists by trying a select
  const { error: testError } = await admin.from('lead_funnel').select('id').limit(1)

  if (!testError) {
    return NextResponse.json({ ok: true, message: 'Table already exists' })
  }

  // Table doesn't exist — we can't run DDL via PostgREST,
  // so return the SQL for manual execution
  return NextResponse.json({
    ok: false,
    message: 'Table does not exist. Please run the following SQL in Supabase Dashboard > SQL Editor.',
    sql: `CREATE TABLE IF NOT EXISTS lead_funnel (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ext_appointment_id integer,
  ext_lead_id integer,
  event text,
  source text,
  lead_type text,
  status text DEFAULT 'pending',
  first_name text,
  last_name text,
  email text,
  phone text,
  cell_phone text,
  birth_year integer,
  is_over_59 boolean,
  agency text,
  years_employed text,
  city text,
  state text,
  zip text,
  marital_status text,
  fegli_options text,
  retirement_year integer,
  tsp_value numeric,
  other_acct_value numeric,
  appointment_date timestamptz,
  ext_agent_id integer,
  act_contact_id text,
  act_user_id text,
  assigned_agent text,
  imported_at timestamptz,
  import_error text,
  raw_payload jsonb,
  notes text,
  processed boolean DEFAULT false,
  cre_dt timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uix_lead_funnel_ext_appt
  ON lead_funnel(ext_appointment_id) WHERE ext_appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_lead_funnel_status ON lead_funnel(status);
CREATE INDEX IF NOT EXISTS ix_lead_funnel_state ON lead_funnel(state);

ALTER TABLE lead_funnel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read" ON lead_funnel FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service insert" ON lead_funnel FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service update" ON lead_funnel FOR UPDATE TO service_role USING (true);
CREATE POLICY "Anon insert" ON lead_funnel FOR INSERT TO anon WITH CHECK (true);`
  })
}
