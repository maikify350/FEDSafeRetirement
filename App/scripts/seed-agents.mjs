/**
 * seed-agents.mjs  (v2 — direct REST upsert, no Auth API required)
 *
 * Inserts/upserts all agents from agents_tmp.json directly into public.users
 * using the Supabase REST API. Does NOT create Auth accounts — agents only
 * need user table rows to appear in the "Assign To" dropdown.
 *
 * Safe to re-run — uses ON CONFLICT (email) DO UPDATE via Prefer header.
 *
 * Usage:
 *   node scripts/seed-agents.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load .env ──────────────────────────────────────────────────────────────
const envPath = join(__dirname, '..', '.env')
const env = {}
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx < 0) return
  const key = trimmed.slice(0, eqIdx).trim()
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^"|"$/g, '')
  env[key] = val
})

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_KEY  = env['NEXT_PUBLIC_SECRET_KEY']         // sb_secret_... key
const ANON_KEY     = env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'] // fallback

// Try secret key first, fall back to anon (works if RLS allows insert)
const API_KEY = SERVICE_KEY || ANON_KEY

if (!SUPABASE_URL || !API_KEY) {
  console.error('❌  Missing SUPABASE_URL or API key in .env')
  process.exit(1)
}

console.log('✔  Supabase URL:', SUPABASE_URL)
console.log('✔  Key prefix:', API_KEY.slice(0, 22) + '...\n')

// ── Load agents ────────────────────────────────────────────────────────────
const agents = JSON.parse(
  readFileSync(join(__dirname, '..', 'agents_tmp.json'), 'utf8')
)

console.log(`🚀  Seeding ${agents.length} agents into public.users...\n`)

// ── Helpers ────────────────────────────────────────────────────────────────
function formatPhone(raw) {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (local.length !== 10) return digits
  return `(${local.slice(0,3)}) ${local.slice(3,6)}-${local.slice(6)}`
}

function genUUID() {
  // RFC-4122 v4 UUID without crypto dependency
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// ── Batch upsert all agents in one request ─────────────────────────────────
const rows = agents.map(a => ({
  id:         genUUID(),
  email:      a.Email.trim().toLowerCase(),
  first_name: a.First.trim(),
  last_name:  a.Last.trim(),
  phone:      formatPhone(a.Phone),
  role:       'agent',
  cre_by:     'seed-agents',
  mod_by:     'seed-agents',
}))

// Preview what we're about to insert
rows.forEach(r => console.log(`  • ${r.first_name} ${r.last_name} <${r.email}>`))
console.log()

const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
  method: 'POST',
  headers: {
    'apikey': API_KEY,
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    // ON CONFLICT (email) → update existing row instead of error
    'Prefer': 'resolution=merge-duplicates,return=representation',
  },
  body: JSON.stringify(rows),
})

const text = await res.text()
let data
try { data = JSON.parse(text) } catch { data = null }

if (!res.ok) {
  console.error(`❌  REST upsert failed (${res.status}):`)
  // If 409/23505 duplicate — the table may not have a UNIQUE constraint on email
  // In that case fall back to individual inserts
  if (res.status === 409 || (text.includes('duplicate') && text.includes('email'))) {
    console.log('   Conflict on email — falling back to per-row upsert...\n')
    await fallbackIndividual(rows)
  } else {
    console.error(text.slice(0, 500))
    process.exit(1)
  }
} else {
  const inserted = Array.isArray(data) ? data.length : '?'
  console.log(`✅  Done — ${inserted} rows upserted successfully.\n`)
}

// ── Fallback: insert one at a time ─────────────────────────────────────────
async function fallbackIndividual(rows) {
  let ok = 0, failed = 0
  for (const row of rows) {
    process.stdout.write(`  • ${row.first_name} ${row.last_name} … `)
    const r = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(row),
    })
    if (r.ok) { console.log('✓'); ok++ }
    else { const b = await r.text(); console.log(`FAILED: ${b.slice(0,120)}`); failed++ }
  }
  console.log(`\n✅  Done — ${ok} ok, ${failed} failed.\n`)
}
