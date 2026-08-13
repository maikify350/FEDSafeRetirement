/**
 * Export unique facilities whose address is NOT a real physical street address
 * (PO Box, General Delivery, rural route, etc.) so they can be back-filled
 * manually. These geocode poorly, throwing off radius / exclusion searches.
 *
 * Output: scripts/pobox_facilities.csv
 *   facility_name, facility_address, facility_city, facility_state,
 *   facility_zip_code, lead_count, current_lat, current_lon, reason,
 *   corrected_address  ← blank column for manual entry
 *
 * Usage:
 *   node scripts/export_pobox_facilities.js                 # all states
 *   node scripts/export_pobox_facilities.js --states IA,WI  # filter
 */

const pg = require('pg');
const fs = require('fs');
const path = require('path');

// ── Load DB connection string from .env (never hardcode credentials) ────────
const env = {};
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const i = t.indexOf('=');
    if (i < 0) return;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^"|"$/g, '');
  });
}
const CONNECTION_STRING = env['NEXT_PUBLIC_DIRECT_CONNECTION_STRING'] || process.env.NEXT_PUBLIC_DIRECT_CONNECTION_STRING;
if (!CONNECTION_STRING) {
  console.error('❌ Missing NEXT_PUBLIC_DIRECT_CONNECTION_STRING in .env');
  process.exit(1);
}

// Direct host is often unreachable; fall back to the regional pooler.
function poolerFrom(direct, region = 'us-east-2') {
  const m = direct.match(/^postgresql:\/\/([^:]+):([^@]+)@db\.([^.]+)\.supabase\.co:\d+\/(.+)$/);
  if (!m) return null;
  const [, user, pass, ref, db] = m;
  return `postgresql://${user}.${ref}:${pass}@aws-1-${region}.pooler.supabase.com:6543/${db}`;
}
async function connectClient() {
  for (const cs of [CONNECTION_STRING, poolerFrom(CONNECTION_STRING)].filter(Boolean)) {
    const client = new pg.Client({ connectionString: cs, connectionTimeoutMillis: 10000 });
    try { await client.connect(); return client; }
    catch (e) { console.log(`… ${cs.includes('pooler') ? 'pooler' : 'direct'} connect failed: ${e.message}`); try { await client.end(); } catch {} }
  }
  throw new Error('Could not connect to the database on any host');
}

const args = process.argv.slice(2);
const statesIdx = args.indexOf('--states');
const statesFilter = statesIdx >= 0 && args[statesIdx + 1]
  ? args[statesIdx + 1].toUpperCase().split(',').map(s => s.trim())
  : null;

// Non-physical / hard-to-geocode address patterns → reason label.
function nonPhysicalReason(addr) {
  const a = (addr || '').toUpperCase();
  if (!a.trim()) return 'BLANK';
  if (/\bP\.?\s*O\.?\s*BOX\b/.test(a)) return 'PO BOX';
  if (/\bGENERAL DELIVERY\b/.test(a)) return 'GENERAL DELIVERY';
  if (/^\s*(RR|HC)\s*\d/.test(a)) return 'RURAL ROUTE / HC';
  if (/\bBOX\s+\d+/.test(a)) return 'BOX #';
  return null;
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function run() {
  const client = await connectClient();
  console.log('✅ Connected');

  const { rows } = await client.query(`
    SELECT facility_name, facility_address, facility_city, facility_state,
           facility_zip_code, count(*)::int AS lead_count,
           max(lat) AS lat, max(lon) AS lon
    FROM leads
    WHERE facility_address IS NOT NULL
      ${statesFilter ? `AND facility_state IN (${statesFilter.map(s => `'${s}'`).join(',')})` : ''}
    GROUP BY facility_name, facility_address, facility_city, facility_state, facility_zip_code
    ORDER BY facility_state, lead_count DESC
  `);

  const flagged = rows
    .map(r => ({ ...r, reason: nonPhysicalReason(r.facility_address) }))
    .filter(r => r.reason);

  const headers = ['facility_name', 'facility_address', 'facility_city', 'facility_state',
    'facility_zip_code', 'lead_count', 'current_lat', 'current_lon', 'reason', 'corrected_address'];
  const lines = [headers.join(',')];
  for (const r of flagged) {
    lines.push([
      r.facility_name, r.facility_address, r.facility_city, r.facility_state,
      r.facility_zip_code, r.lead_count, r.lat ?? '', r.lon ?? '', r.reason, '',
    ].map(csvCell).join(','));
  }

  const out = path.join(__dirname, 'pobox_facilities.csv');
  fs.writeFileSync(out, lines.join('\n'), 'utf8');

  const totalLeads = flagged.reduce((n, r) => n + r.lead_count, 0);
  const byReason = {};
  for (const r of flagged) byReason[r.reason] = (byReason[r.reason] || 0) + 1;

  console.log(`\nFlagged facilities: ${flagged.length}  (covering ${totalLeads} leads)`);
  console.log('By reason:', byReason);
  console.log(`\n📄 Written: ${out}`);
  await client.end();
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
