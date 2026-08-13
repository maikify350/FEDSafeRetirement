/**
 * seed-agents-pg.mjs
 * Seeds agents directly via PostgreSQL connection (bypasses Supabase REST/Auth APIs).
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pg from 'pg'
const { Client } = pg

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env')
const env = {}
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx < 0) return
  env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim().replace(/^"|"$/g, '')
})

const connStr = env['NEXT_PUBLIC_DIRECT_CONNECTION_STRING']
if (!connStr) { console.error('❌  NEXT_PUBLIC_DIRECT_CONNECTION_STRING not found in .env'); process.exit(1) }

const agents = JSON.parse(readFileSync(join(__dirname, '..', 'agents_tmp.json'), 'utf8'))
console.log(`\n🚀  Seeding ${agents.length} agents via direct PostgreSQL connection...\n`)

function formatPhone(raw) {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (local.length !== 10) return digits
  return `(${local.slice(0,3)}) ${local.slice(3,6)}-${local.slice(6)}`
}

const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } })
await client.connect()
console.log('✔  Connected to Supabase PostgreSQL\n')

let ok = 0, failed = 0
for (const agent of agents) {
  const email = agent.Email?.trim().toLowerCase()
  const firstName = agent.First.trim()
  const lastName  = agent.Last.trim()
  const phone     = formatPhone(agent.Phone)
  process.stdout.write(`  • ${firstName} ${lastName} <${email}> … `)
  try {
    await client.query(`
      INSERT INTO public.users (id, email, first_name, last_name, phone, role, cre_by, mod_by)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'agent', 'seed', 'seed')
      ON CONFLICT (email) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name  = EXCLUDED.last_name,
        phone      = EXCLUDED.phone,
        role       = EXCLUDED.role,
        mod_by     = 'seed',
        mod_dt     = NOW()
    `, [email, firstName, lastName, phone])
    console.log('✓')
    ok++
  } catch (e) { console.log(`FAILED: ${e.message}`); failed++ }
}

// Also add color column if it doesn't exist yet
try {
  await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT NULL`)
  console.log('\n✔  color column ensured on users table')
} catch(e) { console.log(`\n⚠  color column: ${e.message}`) }

// Auto-assign colors to agents that don't have one
try {
  const colors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16','#06b6d4']
  const { rows } = await client.query(`SELECT id FROM public.users WHERE role='agent' AND color IS NULL ORDER BY last_name, first_name`)
  for (let i = 0; i < rows.length; i++) {
    await client.query(`UPDATE public.users SET color=$1 WHERE id=$2`, [colors[i % colors.length], rows[i].id])
  }
  console.log(`✔  Auto-assigned colors to ${rows.length} agent(s) without a color`)
} catch(e) { console.log(`⚠  Color assignment: ${e.message}`) }

const { rows: verify } = await client.query(`SELECT first_name, last_name, email, role, color FROM public.users WHERE role='agent' ORDER BY last_name`)
console.log(`\n✅  Done — ${ok} seeded/updated, ${failed} failed.\n`)
console.log('Agents in database:')
verify.forEach(r => console.log(`  ${r.first_name} ${r.last_name} <${r.email}>  color: ${r.color||'none'}`))

await client.end()
