/**
 * seed-reference-tables.mjs
 *
 * Creates the fegli_rates and irs_brackets tables in Supabase
 * and seeds them with the CSV data from DataSeed/.
 *
 * Uses the Supabase REST API (service_role key) — no direct DB connection needed.
 *
 * Usage:  node scripts/seed-reference-tables.mjs
 */

const SUPABASE_URL = 'https://gqarlkfmpgaotbezpkbs.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxYXJsa2ZtcGdhb3RiZXpwa2JzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2NDYzNCwiZXhwIjoyMDkwNjQwNjM0fQ.N8TxFsnqnGUkMK_qmvATDSs-kyneci8ULziUHzpOwq8'

const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
}

/** Execute raw SQL via the Supabase pg_net / rpc endpoint */
async function execSQL(sql) {
  // Use the Supabase Management API SQL endpoint via rpc
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  // Alternative: use the postgrest query interface
  return res
}

/** Insert rows via the PostgREST REST API */
async function insertRows(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Insert into ${table} failed (${res.status}): ${body}`)
  }
  return res.json()
}

/** Delete all rows in a table */
async function deleteAll(table) {
  // PostgREST requires a filter; use a tautology to match all rows
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=not.is.null`, {
    method: 'DELETE',
    headers,
  })
  // 404 means the table doesn't exist yet — that's OK
  if (res.status === 404) return 'not_found'
  if (!res.ok && res.status !== 406) {
    const body = await res.text()
    throw new Error(`Delete ${table} failed (${res.status}): ${body}`)
  }
  return 'ok'
}

/** Check if a table exists by trying to query it */
async function tableExists(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, {
    method: 'GET',
    headers,
  })
  return res.ok
}

async function run() {
  const now = new Date().toISOString()

  // ── 1. Check if tables exist; create via SQL if needed ───────────────────
  // We'll use the Supabase SQL query endpoint (requires management API or we
  // create tables via a quick psql-style approach). Since direct DB is
  // unreachable, we'll try the REST API and create tables via the Supabase
  // dashboard SQL editor API.

  // First, try to see if the tables already exist
  const fegliExists = await tableExists('fegli_rates')
  const irsExists = await tableExists('irs_brackets')

  if (!fegliExists || !irsExists) {
    console.log('⚠️  One or both tables do not exist yet.')
    console.log('   Creating them via Supabase Management API...\n')

    // Use the Supabase Management API to run SQL
    const PAT = 'sbp_edb5a6c6044368687551033d083a29327c4b96c9'
    const PROJECT_ID = 'gqarlkfmpgaotbezpkbs'

    const createSQL = `
      CREATE TABLE IF NOT EXISTS fegli_rates (
        id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        age_min     integer       NOT NULL,
        age_max     integer       NOT NULL,
        opt_a       numeric(8,4)  NOT NULL,
        opt_b       numeric(8,4)  NOT NULL,
        opt_c       numeric(8,4)  NOT NULL,
        cre_by      text          NOT NULL DEFAULT 'system',
        cre_dt      timestamptz   NOT NULL DEFAULT now(),
        mod_by      text          NOT NULL DEFAULT 'system',
        mod_dt      timestamptz   NOT NULL DEFAULT now()
      );

      ALTER TABLE fegli_rates ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fegli_rates' AND policyname = 'Allow all for service_role') THEN
          CREATE POLICY "Allow all for service_role" ON fegli_rates FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS irs_brackets (
        id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        filing_status   text          NOT NULL,
        floor           numeric(12,2) NOT NULL,
        ceiling         numeric(12,2) NOT NULL,
        base_tax        numeric(8,4)  NOT NULL,
        marginal_rate   numeric(8,4)  NOT NULL,
        cre_by          text          NOT NULL DEFAULT 'system',
        cre_dt          timestamptz   NOT NULL DEFAULT now(),
        mod_by          text          NOT NULL DEFAULT 'system',
        mod_dt          timestamptz   NOT NULL DEFAULT now()
      );

      ALTER TABLE irs_brackets ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'irs_brackets' AND policyname = 'Allow all for service_role') THEN
          CREATE POLICY "Allow all for service_role" ON irs_brackets FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$;
    `

    const sqlRes = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: createSQL }),
      }
    )

    if (!sqlRes.ok) {
      const errBody = await sqlRes.text()
      console.error(`❌ Failed to create tables: ${sqlRes.status}`, errBody)
      process.exit(1)
    }

    console.log('✅ Tables created successfully')

    // Give PostgREST a moment to pick up the schema change
    console.log('   Waiting 5s for schema cache refresh...')
    await new Promise(r => setTimeout(r, 5000))
  } else {
    console.log('✅ Both tables already exist')
  }

  // ── 2. Clear existing data (idempotent) ──────────────────────────────────
  await deleteAll('fegli_rates')
  await deleteAll('irs_brackets')
  console.log('✅ Cleared existing data')

  // ── 3. Seed fegli_rates ──────────────────────────────────────────────────
  const fegliRows = [
    { age_min: 0,  age_max: 34, opt_a: 0.43, opt_b: 0.043, opt_c: 0.43  },
    { age_min: 35, age_max: 39, opt_a: 0.43, opt_b: 0.043, opt_c: 0.52  },
    { age_min: 40, age_max: 44, opt_a: 0.65, opt_b: 0.65,  opt_c: 0.8   },
    { age_min: 45, age_max: 49, opt_a: 1.3,  opt_b: 0.13,  opt_c: 1.15  },
    { age_min: 50, age_max: 54, opt_a: 2.17, opt_b: 0.217, opt_c: 1.8   },
    { age_min: 55, age_max: 59, opt_a: 3.9,  opt_b: 0.39,  opt_c: 2.88  },
    { age_min: 60, age_max: 64, opt_a: 13,   opt_b: 0.867, opt_c: 5.21  },
    { age_min: 65, age_max: 69, opt_a: 0,    opt_b: 1.04,  opt_c: 6.13  },
    { age_min: 70, age_max: 74, opt_a: 0,    opt_b: 1.863, opt_c: 8.3   },
    { age_min: 75, age_max: 79, opt_a: 0,    opt_b: 3.9,   opt_c: 12.48 },
    { age_min: 80, age_max: 99, opt_a: 0,    opt_b: 6.24,  opt_c: 16.9  },
  ].map(r => ({ ...r, cre_by: 'Admin', mod_by: 'Admin', cre_dt: now, mod_dt: now }))

  await insertRows('fegli_rates', fegliRows)
  console.log(`✅ Seeded ${fegliRows.length} rows into fegli_rates`)

  // ── 4. Seed irs_brackets ─────────────────────────────────────────────────
  const irsRows = [
    { filing_status: 'Single',  floor: 0,      ceiling: 24150,   base_tax: 0,    marginal_rate: 0     },
    { filing_status: 'Single',  floor: 24151,  ceiling: 36550,   base_tax: 0.1,  marginal_rate: 0.034 },
    { filing_status: 'Single',  floor: 36551,  ceiling: 74550,   base_tax: 0.12, marginal_rate: 0.078 },
    { filing_status: 'Single',  floor: 74551,  ceiling: 129850,  base_tax: 0.22, marginal_rate: 0.138 },
    { filing_status: 'Single',  floor: 129851, ceiling: 225925,  base_tax: 0.24, marginal_rate: 0.182 },
    { filing_status: 'Single',  floor: 225926, ceiling: 280375,  base_tax: 0.32, marginal_rate: 0.208 },
    { filing_status: 'Single',  floor: 280376, ceiling: 664750,  base_tax: 0.35, marginal_rate: 0.29  },
    { filing_status: 'Single',  floor: 664751, ceiling: 2000000, base_tax: 0.37, marginal_rate: 0.37  },
    { filing_status: 'Married', floor: 0,      ceiling: 32200,   base_tax: 0,    marginal_rate: 0     },
    { filing_status: 'Married', floor: 32201,  ceiling: 57000,   base_tax: 0.1,  marginal_rate: 0.044 },
    { filing_status: 'Married', floor: 57001,  ceiling: 133000,  base_tax: 0.12, marginal_rate: 0.087 },
    { filing_status: 'Married', floor: 133001, ceiling: 243600,  base_tax: 0.22, marginal_rate: 0.148 },
    { filing_status: 'Married', floor: 343601, ceiling: 435750,  base_tax: 0.24, marginal_rate: 0.188 },
    { filing_status: 'Married', floor: 435751, ceiling: 544650,  base_tax: 0.32, marginal_rate: 0.215 },
    { filing_status: 'Married', floor: 544651, ceiling: 800900,  base_tax: 0.35, marginal_rate: 0.258 },
    { filing_status: 'Married', floor: 800901, ceiling: 2000000, base_tax: 0.37, marginal_rate: 0.37  },
  ].map(r => ({ ...r, cre_by: 'Admin', mod_by: 'Admin', cre_dt: now, mod_dt: now }))

  await insertRows('irs_brackets', irsRows)
  console.log(`✅ Seeded ${irsRows.length} rows into irs_brackets`)

  // ── 5. Verify ───────────────────────────────────────────────────────────
  const fRes = await fetch(`${SUPABASE_URL}/rest/v1/fegli_rates?select=id`, { headers })
  const fData = await fRes.json()
  const iRes = await fetch(`${SUPABASE_URL}/rest/v1/irs_brackets?select=id`, { headers })
  const iData = await iRes.json()

  console.log(`\n📊 Verification:`)
  console.log(`   fegli_rates:  ${fData.length} rows`)
  console.log(`   irs_brackets: ${iData.length} rows`)
  console.log('\n🎉 Done!')
}

run().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
