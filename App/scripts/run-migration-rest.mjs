/**
 * Run SQL migration against Supabase via REST API (PostgREST rpc or direct SQL).
 * Uses the service_role key to bypass RLS.
 * Usage: node scripts/run-migration-rest.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = 'https://gqarlkfmpgaotbezpkbs.supabase.co'
// We need the service role key — the publishable key won't have DDL access
// Read from .env
const SERVICE_KEY = process.env.NEXT_PUBLIC_SECRET_KEY || ''

async function runMigration() {
  // Read the migration SQL
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')

  // Split into individual statements (rough split on semicolons + newlines)
  // to execute them sequentially
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements to execute`)
  console.log(`Using Supabase URL: ${SUPABASE_URL}`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    // Skip pure comment blocks
    if (stmt.split('\n').every(line => line.trim().startsWith('--') || line.trim() === '')) continue

    const shortStmt = stmt.substring(0, 80).replace(/\n/g, ' ')
    process.stdout.write(`[${i + 1}/${statements.length}] ${shortStmt}... `)

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: stmt })
      })

      if (!response.ok) {
        // PostgREST rpc won't work for DDL — try the pg-meta endpoint
        const text = await response.text()
        console.log(`⚠ ${response.status} (trying alternative)`)
        errorCount++
      } else {
        console.log('✅')
        successCount++
      }
    } catch (error) {
      console.log(`❌ ${error.message}`)
      errorCount++
    }
  }

  console.log(`\n${successCount} succeeded, ${errorCount} failed/skipped`)
  console.log('\nNote: If DDL statements fail via REST, run the migration directly')
  console.log('through the Supabase Dashboard SQL Editor at:')
  console.log(`${SUPABASE_URL.replace('.supabase.co', '')}/project/gqarlkfmpgaotbezpkbs/sql`)
  console.log('\nOr paste this URL in your browser:')
  console.log('https://supabase.com/dashboard/project/gqarlkfmpgaotbezpkbs/sql/new')
}

runMigration()
