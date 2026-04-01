/**
 * Run SQL migration against Supabase via direct PostgreSQL connection.
 * Usage: node scripts/run-migration.mjs
 */
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Try pooler connection (port 6543) which is more commonly accessible
const connectionString = process.env.NEXT_PUBLIC_DIRECT_CONNECTION_STRING
  || 'postgresql://postgres.gqarlkfmpgaotbezpkbs:Ninalove$!2026@aws-0-us-east-1.pooler.supabase.com:6543/postgres'

async function runMigration() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('Connecting to Supabase PostgreSQL...')
    await client.connect()
    console.log('Connected!')

    // Read the migration SQL
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    console.log('Running migration: 001_initial_schema.sql ...')
    await client.query(sql)
    console.log('✅ Migration completed successfully!')

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    console.log('\nTables in public schema:')
    result.rows.forEach(row => console.log(`  - ${row.table_name}`))

    // Check seed user
    const userResult = await client.query(`SELECT id, email, role FROM public.users WHERE email = 'rgarcia350@gmail.com'`)
    if (userResult.rows.length > 0) {
      console.log(`\n✅ Seed user: ${userResult.rows[0].email} (${userResult.rows[0].role})`)
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigration()
