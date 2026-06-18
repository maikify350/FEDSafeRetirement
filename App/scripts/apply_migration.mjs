// Apply a SQL migration file to the prod DB.
// Usage: node scripts/apply_migration.mjs supabase/migrations/019_radius_exclusion_city.sql
import fs from 'fs'
import path from 'path'
import pg from 'pg'

const env = {}
const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^"|"$/g, '')
  }
}
const DIRECT = env['NEXT_PUBLIC_DIRECT_CONNECTION_STRING'] || process.env.NEXT_PUBLIC_DIRECT_CONNECTION_STRING
if (!DIRECT) { console.error('❌ Missing NEXT_PUBLIC_DIRECT_CONNECTION_STRING in .env'); process.exit(1) }

// The direct host (db.<ref>.supabase.co) is often unreachable; the regional
// pooler is reliable. Build the pooler string from the same credentials.
export function poolerFrom(direct, region = 'us-east-2') {
  const m = direct.match(/^postgresql:\/\/([^:]+):([^@]+)@db\.([^.]+)\.supabase\.co:\d+\/(.+)$/)
  if (!m) return null
  const [, user, pass, ref, db] = m
  return `postgresql://${user}.${ref}:${pass}@aws-1-${region}.pooler.supabase.com:6543/${db}`
}

const candidates = [DIRECT, poolerFrom(DIRECT)].filter(Boolean)

const file = process.argv[2]
if (!file) { console.error('Usage: node scripts/apply_migration.mjs <path.sql>'); process.exit(1) }
const sql = fs.readFileSync(file, 'utf8')

let applied = false
for (const cs of candidates) {
  const client = new pg.Client({ connectionString: cs, connectionTimeoutMillis: 10000 })
  try {
    await client.connect()
    console.log('✅ Connected via', cs.includes('pooler') ? 'pooler' : 'direct', '— applying', file, '...')
    await client.query(sql)
    console.log('✅ Migration applied successfully')
    applied = true
    await client.end()
    break
  } catch (e) {
    console.log('… connection failed:', e.message)
    try { await client.end() } catch {}
  }
}
if (!applied) { console.error('❌ Could not apply migration on any host'); process.exitCode = 1 }
