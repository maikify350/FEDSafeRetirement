const pg = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables for Mapbox key
const env = {};
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^"|"$/g, '');
    env[key] = val;
  });
}

const MAPBOX_KEY = env['NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN'] || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const connectionString = 'postgresql://postgres.gqarlkfmpgaotbezpkbs:Ninalove$!2026@aws-1-us-east-2.pooler.supabase.com:6543/postgres';

if (!MAPBOX_KEY) {
  console.error("Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in environment.");
  process.exit(1);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('Connecting to Supabase PostgreSQL database...');
  const client = new pg.Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected successfully. Querying unique facilities missing coordinates for WI, OK, IA...');

    const facilitiesQuery = `
      SELECT 
        facility_address, 
        facility_city, 
        facility_state, 
        facility_zip_code, 
        count(*)::integer as lead_count
      FROM leads
      WHERE facility_state IN ('WI', 'OK', 'IA')
        AND lat IS NULL
        AND facility_address IS NOT NULL
        AND facility_address <> ''
      GROUP BY facility_address, facility_city, facility_state, facility_zip_code
      ORDER BY facility_state DESC, lead_count DESC
    `;

    const res = await client.query(facilitiesQuery);
    const facilities = res.rows;
    console.log(`Found ${facilities.length} unique facilities missing coordinates.`);

    // Group counts for summary
    const stateCounts = { WI: 0, OK: 0, IA: 0 };
    const stateLeadCounts = { WI: 0, OK: 0, IA: 0 };
    for (const f of facilities) {
      stateCounts[f.facility_state] = (stateCounts[f.facility_state] || 0) + 1;
      stateLeadCounts[f.facility_state] = (stateLeadCounts[f.facility_state] || 0) + f.lead_count;
    }
    console.log('Facilities by state:', stateCounts);
    console.log('Lead records by state:', stateLeadCounts);

    if (facilities.length === 0) {
      console.log('No facilities to geocode! Exiting.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    let updatedLeadsCount = 0;

    const startTime = Date.now();

    for (let i = 0; i < facilities.length; i++) {
      const fac = facilities[i];
      const fullAddress = `${fac.facility_address}, ${fac.facility_city}, ${fac.facility_state} ${fac.facility_zip_code}`;
      
      try {
        const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${MAPBOX_KEY}&limit=1`;
        const response = await fetch(mapboxUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const [lon, lat] = data.features[0].center;

          const updateRes = await client.query(`
            UPDATE leads
            SET lat = $1, lon = $2
            WHERE facility_address = $3
              AND facility_city = $4
              AND facility_state = $5
              AND facility_zip_code = $6
          `, [lat, lon, fac.facility_address, fac.facility_city, fac.facility_state, fac.facility_zip_code]);

          successCount++;
          updatedLeadsCount += fac.lead_count;
        } else {
          console.warn(`[WARN] No geocoding results for: ${fullAddress}`);
          errorCount++;
        }
      } catch (err) {
        console.error(`[ERROR] Failed to process ${fullAddress}:`, err.message);
        errorCount++;
      }

      // Respect rate limits (600 requests/minute) with 150ms sleep
      await sleep(150);

      if ((i + 1) % 50 === 0 || i === facilities.length - 1) {
        const elapsedMin = ((Date.now() - startTime) / 60000).toFixed(1);
        console.log(`  Progress: ${i + 1}/${facilities.length} processed (${successCount} successes, ${errorCount} errors, ${updatedLeadsCount} leads updated, ${elapsedMin}m elapsed)...`);
      }
    }

    const totalTimeMin = ((Date.now() - startTime) / 60000).toFixed(1);
    console.log('\n' + '='.repeat(60));
    console.log('GEOCONVERSIONS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Facilities Processed: ${facilities.length}`);
    console.log(`Successful:                ${successCount}`);
    console.log(`Failed/No Match:           ${errorCount}`);
    console.log(`Total Lead Records Updated: ${updatedLeadsCount}`);
    console.log(`Total Time Taken:          ${totalTimeMin} minutes`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('Fatal error during execution:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
