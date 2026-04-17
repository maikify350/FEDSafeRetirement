/**
 * seed-fegli-employee-annuitant.mjs
 *
 * Creates the fegli_rates_employee and fegli_rates_annuitant tables in Supabase
 * and seeds them with the CSV data from DataSeed/.
 *
 * Uses the Supabase REST API (service_role key) — no direct DB connection needed.
 *
 * Usage:  node scripts/seed-fegli-employee-annuitant.mjs
 */

const SUPABASE_URL = 'https://gqarlkfmpgaotbezpkbs.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxYXJsa2ZtcGdhb3RiZXpwa2JzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2NDYzNCwiZXhwIjoyMDkwNjQwNjM0fQ.N8TxFsnqnGUkMK_qmvATDSs-kyneci8ULziUHzpOwq8'
const PAT = 'sbp_edb5a6c6044368687551033d083a29327c4b96c9'
const PROJECT_ID = 'gqarlkfmpgaotbezpkbs'

const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
}

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

async function deleteAll(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=not.is.null`, {
    method: 'DELETE',
    headers,
  })
  if (res.status === 404) return 'not_found'
  if (!res.ok && res.status !== 406) {
    const body = await res.text()
    throw new Error(`Delete ${table} failed (${res.status}): ${body}`)
  }
  return 'ok'
}

async function tableExists(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, {
    method: 'GET',
    headers,
  })
  return res.ok
}

async function run() {
  const now = new Date().toISOString()

  // ── 1. Check if tables exist ──────────────────────────────────────────────
  const empExists = await tableExists('fegli_rates_employee')
  const annExists = await tableExists('fegli_rates_annuitant')

  if (!empExists || !annExists) {
    console.log('⚠️  One or both tables do not exist yet.')
    console.log('   Please run the SQL migration first:')
    console.log('   → Open https://supabase.com/dashboard/project/gqarlkfmpgaotbezpkbs/sql/new')
    console.log('   → Paste the contents of scripts/migrations/create_fegli_employee_annuitant.sql')
    console.log('   → Click "Run"')
    console.log('   → Then re-run this script.')
    process.exit(1)
  }

  console.log('✅ Both tables exist')

  // ── 2. Clear existing data (idempotent) ──────────────────────────────────
  await deleteAll('fegli_rates_employee')
  await deleteAll('fegli_rates_annuitant')
  console.log('✅ Cleared existing data')

  // ── 3. Seed fegli_rates_employee ─────────────────────────────────────────
  // From DataSeed/fegli_rates_employee.csv:
  // AgeMin,AgeMax,Basic,OptA,OptB,OptC
  const employeeRows = [
    { age_min: 0,  age_max: 34, basic: 0.16, opt_a: 0.2,  opt_b: 0.02,  opt_c: 0.2   },
    { age_min: 35, age_max: 39, basic: 0.16, opt_a: 0.2,  opt_b: 0.02,  opt_c: 0.24  },
    { age_min: 40, age_max: 44, basic: 0.16, opt_a: 0.3,  opt_b: 0.03,  opt_c: 0.37  },
    { age_min: 45, age_max: 50, basic: 0.16, opt_a: 0.6,  opt_b: 0.06,  opt_c: 0.53  },
    { age_min: 50, age_max: 54, basic: 0.16, opt_a: 1,    opt_b: 0.1,   opt_c: 0.83  },
    { age_min: 55, age_max: 59, basic: 0.16, opt_a: 1.8,  opt_b: 0.18,  opt_c: 1.33  },
    { age_min: 60, age_max: 64, basic: 0.16, opt_a: 6,    opt_b: 0.4,   opt_c: 2.43  },
    { age_min: 65, age_max: 69, basic: 0.16, opt_a: 6,    opt_b: 0.48,  opt_c: 2.83  },
    { age_min: 70, age_max: 74, basic: 0.16, opt_a: 6,    opt_b: 0.86,  opt_c: 3.83  },
    { age_min: 75, age_max: 79, basic: 0.16, opt_a: 6,    opt_b: 1.8,   opt_c: 5.76  },
    { age_min: 80, age_max: 99, basic: 0.16, opt_a: 6,    opt_b: 2.88,  opt_c: 7.8   },
  ].map(r => ({ ...r, notes: '', cre_by: 'Admin', mod_by: 'Admin', cre_dt: now, mod_dt: now }))

  await insertRows('fegli_rates_employee', employeeRows)
  console.log(`✅ Seeded ${employeeRows.length} rows into fegli_rates_employee`)

  // ── 4. Seed fegli_rates_annuitant ────────────────────────────────────────
  // From DataSeed/fegli_rates_annuitant.csv:
  // AgeMin,AgeMax,Basic_75,Basic_50,Basic_0,OptA,OptB,OptC
  const annuitantRows = [
    { age_min: 0,  age_max: 34, basic_75: 0.3467, basic_50: 1.0967, basic_0: 2.5967, opt_a: 0.43,  opt_b: 0.043, opt_c: 0.43  },
    { age_min: 35, age_max: 39, basic_75: 0.3467, basic_50: 1.0967, basic_0: 2.5967, opt_a: 0.43,  opt_b: 0.043, opt_c: 0.52  },
    { age_min: 40, age_max: 44, basic_75: 0.3467, basic_50: 1.0967, basic_0: 2.5967, opt_a: 0.65,  opt_b: 0.65,  opt_c: 0.8   },
    { age_min: 45, age_max: 50, basic_75: 0.3467, basic_50: 1.0967, basic_0: 2.5967, opt_a: 1.3,   opt_b: 0.13,  opt_c: 1.15  },
    { age_min: 50, age_max: 54, basic_75: 0.3467, basic_50: 1.0967, basic_0: 2.5967, opt_a: 2.17,  opt_b: 0.217, opt_c: 1.8   },
    { age_min: 55, age_max: 59, basic_75: 0.3467, basic_50: 1.0967, basic_0: 2.5967, opt_a: 3.9,   opt_b: 0.39,  opt_c: 2.88  },
    { age_min: 60, age_max: 64, basic_75: 0.3467, basic_50: 1.0967, basic_0: 2.5967, opt_a: 13,    opt_b: 0.867, opt_c: 5.27  },
    { age_min: 65, age_max: 69, basic_75: 0,      basic_50: 0.75,   basic_0: 2.25,   opt_a: 0,     opt_b: 1.04,  opt_c: 6.13  },
    { age_min: 70, age_max: 74, basic_75: 0,      basic_50: 0.75,   basic_0: 2.25,   opt_a: 0,     opt_b: 1.863, opt_c: 8.3   },
    { age_min: 75, age_max: 79, basic_75: 0,      basic_50: 0.75,   basic_0: 2.25,   opt_a: 0,     opt_b: 3.9,   opt_c: 12.48 },
    { age_min: 80, age_max: 99, basic_75: 0,      basic_50: 0.75,   basic_0: 2.25,   opt_a: 0,     opt_b: 6.24,  opt_c: 16.9  },
  ].map(r => ({ ...r, notes: '', cre_by: 'Admin', mod_by: 'Admin', cre_dt: now, mod_dt: now }))

  await insertRows('fegli_rates_annuitant', annuitantRows)
  console.log(`✅ Seeded ${annuitantRows.length} rows into fegli_rates_annuitant`)

  // ── 5. Verify ───────────────────────────────────────────────────────────
  const eRes = await fetch(`${SUPABASE_URL}/rest/v1/fegli_rates_employee?select=id`, { headers })
  const eData = await eRes.json()
  const aRes = await fetch(`${SUPABASE_URL}/rest/v1/fegli_rates_annuitant?select=id`, { headers })
  const aData = await aRes.json()

  console.log(`\n📊 Verification:`)
  console.log(`   fegli_rates_employee:  ${eData.length} rows`)
  console.log(`   fegli_rates_annuitant: ${aData.length} rows`)
  console.log('\n🎉 Done!')
}

run().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
