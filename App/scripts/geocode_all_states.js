/**
 * Geocode ALL leads missing lat/lon — processes state by state.
 *
 * Uses MAPBOX Geocoding API (NOT Google — Mapbox is orders of magnitude cheaper).
 *   - Mapbox permanent geocoding: $0.75 / 1,000 requests
 *   - Mapbox temporary geocoding (used here): FREE up to 100,000/month, then $0.75/1K
 *   - Google Places: ~$5–$17 / 1,000 requests ← DO NOT USE
 *
 * Strategy:
 *   1. Groups leads by unique facility address (de-dupes API calls)
 *   2. One Mapbox call per unique address, then bulk-updates all matching leads
 *   3. 150ms sleep between calls → ~400 req/min (within Mapbox's 600/min limit)
 *   4. Processes one state at a time, can be filtered via --states flag
 *
 * Usage:
 *   node scripts/geocode_all_states.js                    # All un-geocoded states
 *   node scripts/geocode_all_states.js --states WI        # Wisconsin only
 *   node scripts/geocode_all_states.js --states WI,OK,IA  # Multiple states
 *   node scripts/geocode_all_states.js --dry-run           # Show counts without geocoding
 *   node scripts/geocode_all_states.js --fix-pobox         # Re-geocode mislocated PO-box facilities
 *   node scripts/geocode_all_states.js --fix-pobox --dry-run --states IA
 *
 * Geocoding falls back to the City/State/ZIP centroid when the street line is
 * a PO Box or Mapbox's match is low-confidence (relevance < 0.8), so PO-box
 * "addresses" land in the correct metro instead of a far-off fuzzy match.
 */

const pg = require('pg');
const fs = require('fs');
const path = require('path');

// ── Load .env ──────────────────────────────────────────────────────────────
const env = {};
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) return;
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim().replace(/^"|"$/g, '');
  });
}

const MAPBOX_KEY = env['NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN'] || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const CONNECTION_STRING = env['NEXT_PUBLIC_DIRECT_CONNECTION_STRING'] || process.env.NEXT_PUBLIC_DIRECT_CONNECTION_STRING;

if (!MAPBOX_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env');
  process.exit(1);
}
if (!CONNECTION_STRING) {
  console.error('❌ Missing NEXT_PUBLIC_DIRECT_CONNECTION_STRING in .env');
  process.exit(1);
}

// The direct host (db.<ref>.supabase.co) is often unreachable; the regional
// pooler is reliable. Build the pooler string from the same credentials and
// connect via whichever responds.
function poolerFrom(direct, region = 'us-east-2') {
  const m = direct.match(/^postgresql:\/\/([^:]+):([^@]+)@db\.([^.]+)\.supabase\.co:\d+\/(.+)$/);
  if (!m) return null;
  const [, user, pass, ref, db] = m;
  return `postgresql://${user}.${ref}:${pass}@aws-1-${region}.pooler.supabase.com:6543/${db}`;
}
async function connectClient() {
  const candidates = [CONNECTION_STRING, poolerFrom(CONNECTION_STRING)].filter(Boolean);
  for (const cs of candidates) {
    const client = new pg.Client({ connectionString: cs, connectionTimeoutMillis: 10000 });
    try { await client.connect(); return client; }
    catch (e) { console.log(`… ${cs.includes('pooler') ? 'pooler' : 'direct'} connect failed: ${e.message}`); try { await client.end(); } catch {} }
  }
  throw new Error('Could not connect to the database on any host');
}

// ── Parse CLI args ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fixPobox = args.includes('--fix-pobox');
const statesIdx = args.indexOf('--states');
const statesFilter = statesIdx >= 0 && args[statesIdx + 1]
  ? args[statesIdx + 1].toUpperCase().split(',').map(s => s.trim())
  : null;  // null = all states

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Mapbox geocode (FREE tier: 100K/month) ─────────────────────────────────
async function geocodeMapbox(query) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_KEY}&limit=1&country=US`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox HTTP ${res.status}`);
  const data = await res.json();
  const f = data.features && data.features[0];
  if (!f) return null;
  return { lat: f.center[1], lon: f.center[0], relevance: f.relevance ?? 0 };
}

// Mapbox returns a low-confidence match below this; treat it as unreliable.
const RELEVANCE_MIN = 0.8;

// PO Box "addresses" have no physical location. Mapbox returns a garbage
// far-away fuzzy match (e.g. "PO BOX 9998, Cedar Rapids" → Keokuk, 114mi off).
const isPoBox = (addr) => /\bp\.?\s*o\.?\s*box\b/i.test(addr || '');

// Geocode a facility, falling back to the City/State/ZIP centroid when the
// street line is a PO Box or Mapbox's match is low-confidence. The centroid
// lands inside the correct metro, which is what radius/exclusion needs.
async function geocodeFacility(fac) {
  const cityZip = [fac.facility_city, fac.facility_state, fac.facility_zip_code].filter(Boolean).join(', ');
  const full    = [fac.facility_address, fac.facility_city, fac.facility_state, fac.facility_zip_code].filter(Boolean).join(', ');

  if (isPoBox(fac.facility_address)) {
    if (!cityZip) return null;
    const g = await geocodeMapbox(cityZip);
    return g ? { ...g, method: 'pobox→cityzip' } : null;
  }

  const g = await geocodeMapbox(full);
  if (g && g.relevance >= RELEVANCE_MIN) return { ...g, method: 'full' };

  // Low confidence — retry on the city/zip centroid and prefer it.
  if (cityZip) {
    await sleep(150);
    const g2 = await geocodeMapbox(cityZip);
    if (g2 && (!g || g2.relevance >= g.relevance)) return { ...g2, method: 'lowrel→cityzip' };
  }
  return g ? { ...g, method: 'full-lowrel' } : null;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function run() {
  console.log('🌎 Leads Geocoder — Mapbox API (NOT Google)');
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE'}`);
  if (statesFilter) console.log(`   States: ${statesFilter.join(', ')}`);
  else console.log('   States: ALL');
  console.log('');

  const client = await connectClient();
  console.log('✅ Connected to database');

  // Get list of states with un-geocoded leads
  const stateQuery = `
    SELECT facility_state, count(*) as total,
           count(*) FILTER (WHERE lat IS NOT NULL) as geocoded
    FROM leads
    WHERE facility_address IS NOT NULL AND facility_address <> ''
    ${statesFilter ? `AND facility_state IN (${statesFilter.map(s => `'${s}'`).join(',')})` : ''}
    GROUP BY facility_state
    HAVING count(*) FILTER (WHERE lat IS NULL) > 0
    ORDER BY count(*) FILTER (WHERE lat IS NULL) DESC
  `;

  const { rows: stateRows } = await client.query(stateQuery);

  if (stateRows.length === 0) {
    console.log('✅ All leads are already geocoded!');
    await client.end();
    return;
  }

  console.log('\nStates to process:');
  console.log('State'.padEnd(8) + 'Total'.padStart(8) + 'Geocoded'.padStart(10) + 'Missing'.padStart(10) + '  Facilities');

  let totalFacilities = 0;

  for (const row of stateRows) {
    const missing = Number(row.total) - Number(row.geocoded);
    // Count unique facilities
    const { rows: [{ cnt }] } = await client.query(`
      SELECT count(DISTINCT (facility_address, facility_city, facility_zip_code))::integer as cnt
      FROM leads
      WHERE facility_state = $1 AND lat IS NULL
        AND facility_address IS NOT NULL AND facility_address <> ''
    `, [row.facility_state]);
    totalFacilities += cnt;
    console.log(`${row.facility_state.padEnd(8)}${String(row.total).padStart(8)}${String(row.geocoded).padStart(10)}${String(missing).padStart(10)}  ${cnt} unique addrs`);
  }

  console.log(`\nTotal unique facilities to geocode: ${totalFacilities}`);
  console.log(`Estimated Mapbox API calls: ${totalFacilities}`);
  console.log(`Estimated cost: $${(totalFacilities / 1000 * 0.75).toFixed(2)} (or FREE if under 100K/month)`);
  console.log(`Estimated time: ${(totalFacilities * 0.15 / 60).toFixed(1)} minutes\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN — exiting without making changes.');
    await client.end();
    return;
  }

  // Process each state
  let grandSuccessCount = 0;
  let grandErrorCount = 0;
  let grandLeadsUpdated = 0;
  const grandStartTime = Date.now();

  for (const row of stateRows) {
    const state = row.facility_state;
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  Processing: ${state}`);
    console.log('═'.repeat(60));

    const { rows: facilities } = await client.query(`
      SELECT
        facility_address,
        facility_city,
        facility_state,
        facility_zip_code,
        count(*)::integer as lead_count
      FROM leads
      WHERE facility_state = $1
        AND lat IS NULL
        AND facility_address IS NOT NULL
        AND facility_address <> ''
      GROUP BY facility_address, facility_city, facility_state, facility_zip_code
      ORDER BY lead_count DESC
    `, [state]);

    let stateSuccess = 0;
    let stateErrors = 0;
    let stateLeads = 0;
    const stateStart = Date.now();

    for (let i = 0; i < facilities.length; i++) {
      const fac = facilities[i];
      const fullAddress = `${fac.facility_address}, ${fac.facility_city}, ${fac.facility_state} ${fac.facility_zip_code}`;

      try {
        const result = await geocodeFacility(fac);

        if (result) {
          const updateRes = await client.query(`
            UPDATE leads
            SET lat = $1, lon = $2
            WHERE facility_address = $3
              AND facility_city = $4
              AND facility_state = $5
              AND facility_zip_code = $6
              AND lat IS NULL
          `, [result.lat, result.lon, fac.facility_address, fac.facility_city, fac.facility_state, fac.facility_zip_code]);

          stateSuccess++;
          stateLeads += updateRes.rowCount;
        } else {
          console.warn(`  ⚠️  No result: ${fullAddress}`);
          stateErrors++;
        }
      } catch (err) {
        console.error(`  ❌ Error: ${fullAddress} — ${err.message}`);
        stateErrors++;
      }

      // Rate limit: 150ms = ~400/min (Mapbox allows 600/min)
      await sleep(150);

      // Progress every 100 facilities or at the end
      if ((i + 1) % 100 === 0 || i === facilities.length - 1) {
        const elapsedMin = ((Date.now() - stateStart) / 60000).toFixed(1);
        console.log(`  ${state}: ${i + 1}/${facilities.length} facilities (${stateSuccess} ok, ${stateErrors} err, ${stateLeads} leads updated, ${elapsedMin}m)`);
      }
    }

    grandSuccessCount += stateSuccess;
    grandErrorCount += stateErrors;
    grandLeadsUpdated += stateLeads;

    const stateMin = ((Date.now() - stateStart) / 60000).toFixed(1);
    console.log(`  ✅ ${state} done: ${stateSuccess} geocoded, ${stateErrors} failed, ${stateLeads} leads updated in ${stateMin}m`);
  }

  const totalMin = ((Date.now() - grandStartTime) / 60000).toFixed(1);
  console.log('\n' + '═'.repeat(60));
  console.log('GEOCODING COMPLETE');
  console.log('═'.repeat(60));
  console.log(`Total Facilities Geocoded: ${grandSuccessCount}`);
  console.log(`Total Failures:            ${grandErrorCount}`);
  console.log(`Total Lead Records Updated: ${grandLeadsUpdated}`);
  console.log(`Total Time:                ${totalMin} minutes`);
  console.log('═'.repeat(60));

  await client.end();
  console.log('Database connection closed.');
}

// ── Re-geocode PO Box facilities (fixes already-mislocated coords) ──────────
async function runFixPobox() {
  console.log('🛠  PO Box Re-Geocode — fixes mislocated PO-box facilities');
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE'}`);
  if (statesFilter) console.log(`   States: ${statesFilter.join(', ')}`);
  console.log('');

  const client = await connectClient();
  console.log('✅ Connected to database');

  // ALL PO-box facilities, regardless of current lat (we overwrite bad coords).
  const { rows: facilities } = await client.query(`
    SELECT facility_address, facility_city, facility_state, facility_zip_code,
           count(*)::integer as lead_count
    FROM leads
    WHERE facility_address ILIKE '%PO BOX%'
      ${statesFilter ? `AND facility_state IN (${statesFilter.map(s => `'${s}'`).join(',')})` : ''}
    GROUP BY facility_address, facility_city, facility_state, facility_zip_code
    ORDER BY lead_count DESC
  `);

  const totalLeads = facilities.reduce((n, f) => n + f.lead_count, 0);
  console.log(`\nUnique PO-box facilities: ${facilities.length}  (covering ${totalLeads} leads)`);
  console.log(`Estimated time: ${(facilities.length * 0.3 / 60).toFixed(1)} minutes\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN — exiting without making changes.');
    await client.end();
    return;
  }

  let ok = 0, err = 0, leads = 0;
  const start = Date.now();
  for (let i = 0; i < facilities.length; i++) {
    const fac = facilities[i];
    try {
      const result = await geocodeFacility(fac);
      if (result) {
        const upd = await client.query(`
          UPDATE leads SET lat = $1, lon = $2
          WHERE facility_address = $3 AND facility_city = $4
            AND facility_state = $5 AND facility_zip_code = $6
        `, [result.lat, result.lon, fac.facility_address, fac.facility_city, fac.facility_state, fac.facility_zip_code]);
        ok++; leads += upd.rowCount;
      } else {
        console.warn(`  ⚠️  No result: ${[fac.facility_address, fac.facility_city, fac.facility_state, fac.facility_zip_code].join(', ')}`);
        err++;
      }
    } catch (e) {
      console.error(`  ❌ Error: ${fac.facility_address} — ${e.message}`);
      err++;
    }
    await sleep(150);
    if ((i + 1) % 100 === 0 || i === facilities.length - 1) {
      console.log(`  ${i + 1}/${facilities.length} facilities (${ok} ok, ${err} err, ${leads} leads updated, ${((Date.now() - start) / 60000).toFixed(1)}m)`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`PO BOX RE-GEOCODE COMPLETE — ${ok} facilities, ${leads} leads updated, ${err} failed`);
  console.log('═'.repeat(60));
  await client.end();
}

(fixPobox ? runFixPobox() : run()).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
