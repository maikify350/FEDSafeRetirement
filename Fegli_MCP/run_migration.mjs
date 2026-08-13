/**
 * Run the Supabase migration via REST API.
 * Uses the service role key to execute raw SQL through the pg REST endpoint.
 * Run: node run_migration.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../App/.env') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE env vars')
  process.exit(1)
}

const sql = fs.readFileSync(path.join(__dirname, 'supabase_migration.sql'), 'utf8')

// Split into individual statements to run sequentially
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 10 && !s.startsWith('--'))

console.log(`\nRunning ${statements.length} SQL statements...\n`)

for (const stmt of statements) {
  const stmtPreview = stmt.slice(0, 60).replace(/\n/g, ' ')
  process.stdout.write(`  ▶ ${stmtPreview}... `)
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({ query: stmt }),
    })

    // exec_sql may not exist — fall back to direct pg endpoint
    if (res.status === 404) {
      // Use Supabase's SQL editor endpoint (available in all plans)
      const pgRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ query: stmt }),
      })
      console.log(pgRes.ok ? '✅' : `⚠️  ${pgRes.status}`)
    } else {
      const body = await res.text()
      console.log(res.ok ? '✅' : `⚠️  ${res.status}: ${body.slice(0,100)}`)
    }
  } catch (err) {
    console.log(`❌ ${err.message}`)
  }
}

console.log('\nDone. Verify in Supabase dashboard → Table Editor → rag_documents')
