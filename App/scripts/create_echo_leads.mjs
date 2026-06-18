import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres:Ninalove$!2026@db.gqarlkfmpgaotbezpkbs.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

await client.connect()

await client.query(`
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
    conference_location       TEXT,
    estimated_retirement_year TEXT,
    guest_name                TEXT,
    guest_is_fed_employee     BOOLEAN,
    call_summary              TEXT,
    call_duration_seconds     INT,
    parse_confidence          TEXT,
    notes                     TEXT,
    created_at                TIMESTAMPTZ DEFAULT now(),
    updated_at                TIMESTAMPTZ DEFAULT now()
  );
`)

await client.query(`CREATE INDEX IF NOT EXISTS echo_leads_phone_idx    ON public.echo_leads(caller_phone);`)
await client.query(`CREATE INDEX IF NOT EXISTS echo_leads_location_idx ON public.echo_leads(conference_location);`)
await client.query(`CREATE INDEX IF NOT EXISTS echo_leads_date_idx     ON public.echo_leads(call_date DESC);`)

await client.query(`
  CREATE TABLE IF NOT EXISTS public.app_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
  );
`)

console.log('echo_leads and app_settings tables ready.')
await client.end()
