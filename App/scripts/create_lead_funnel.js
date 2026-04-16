const sql = `
CREATE TABLE IF NOT EXISTS lead_funnel (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ext_appointment_id integer, ext_lead_id integer,
  event text, source text, lead_type text,
  status text DEFAULT 'pending',
  first_name text, last_name text, email text,
  phone text, cell_phone text,
  birth_year integer, is_over_59 boolean,
  agency text, years_employed text,
  city text, state text, zip text,
  marital_status text, fegli_options text, retirement_year integer,
  tsp_value numeric, other_acct_value numeric,
  appointment_date timestamptz, ext_agent_id integer,
  act_contact_id text, act_user_id text, assigned_agent text,
  imported_at timestamptz, import_error text,
  raw_payload jsonb, notes text,
  processed boolean DEFAULT false,
  cre_dt timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uix_lead_funnel_ext_appt ON lead_funnel(ext_appointment_id) WHERE ext_appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_lead_funnel_status ON lead_funnel(status);
CREATE INDEX IF NOT EXISTS ix_lead_funnel_state ON lead_funnel(state);
ALTER TABLE lead_funnel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read" ON lead_funnel FOR SELECT TO authenticated USING (true);
CREATE POLICY "svc_insert" ON lead_funnel FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "svc_update" ON lead_funnel FOR UPDATE TO service_role USING (true);
CREATE POLICY "anon_insert" ON lead_funnel FOR INSERT TO anon WITH CHECK (true);
`;

async function main() {
  const resp = await fetch('https://api.supabase.com/v1/projects/gqarlkfmpgaotbezpkbs/database/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sbp_edb5a6c6044368687551033d083a29327c4b96c9'
    },
    body: JSON.stringify({ query: sql })
  });
  console.log('Status:', resp.status);
  const text = await resp.text();
  console.log('Response:', text.substring(0, 500));
}

main().catch(e => console.error('Error:', e.message));
