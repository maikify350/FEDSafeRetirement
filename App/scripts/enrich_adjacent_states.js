const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: __dirname + '/../.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAPBOX_KEY = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Adjacent states to KY: OH, WV, VA, TN, IN, IL, MO
// Adjacent states to SC: NC, GA
const STATES = ['OH', 'WV', 'VA', 'TN', 'IN', 'IL', 'MO', 'NC', 'GA'];

async function enrichState(state) {
  const stateStart = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing state: ${state}`);

  // Fetch leads missing lat for this state
  let allLeads = [];
  let page = 0;
  const pageSize = 5000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('leads')
      .select('id, facility_address, facility_city, facility_state, facility_zip_code')
      .eq('facility_state', state)
      .is('lat', null)
      .neq('facility_address', '')
      .not('facility_address', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error(`  Error fetching leads for ${state}:`, error);
      return { state, facilities: 0, records: 0, errors: 0, time: 0 };
    }

    if (data.length > 0) {
      allLeads.push(...data);
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`  Found ${allLeads.length} records to process`);

  if (allLeads.length === 0) {
    return { state, facilities: 0, records: 0, errors: 0, time: 0 };
  }

  // Find unique facilities
  const uniqueFacilities = new Map();
  for (const lead of allLeads) {
    const key = `${lead.facility_address}|${lead.facility_city}|${lead.facility_state}|${lead.facility_zip_code}`;
    if (!uniqueFacilities.has(key)) {
      uniqueFacilities.set(key, {
        address: lead.facility_address,
        city: lead.facility_city,
        state: lead.facility_state,
        zip: lead.facility_zip_code,
        count: 0
      });
    }
    uniqueFacilities.get(key).count++;
  }

  const facilities = Array.from(uniqueFacilities.values());
  console.log(`  Unique facilities to geocode: ${facilities.length}`);

  let successCount = 0;
  let errorCount = 0;
  let updatedRecords = 0;

  for (let i = 0; i < facilities.length; i++) {
    const fac = facilities[i];
    const fullAddress = `${fac.address}, ${fac.city}, ${fac.state} ${fac.zip}`;

    try {
      const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${MAPBOX_KEY}&limit=1`;
      const response = await fetch(mapboxUrl);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lon, lat] = data.features[0].center;

        const { error: updateError } = await supabase
          .from('leads')
          .update({ lat, lon })
          .eq('facility_address', fac.address)
          .eq('facility_city', fac.city)
          .eq('facility_state', fac.state)
          .eq('facility_zip_code', fac.zip);

        if (updateError) {
          errorCount++;
        } else {
          successCount++;
          updatedRecords += fac.count;
        }
      } else {
        errorCount++;
      }
    } catch (err) {
      errorCount++;
    }

    if ((i + 1) % 50 === 0 || i === facilities.length - 1) {
      console.log(`  Progress: ${i + 1}/${facilities.length} facilities geocoded...`);
    }
  }

  const timeSec = ((Date.now() - stateStart) / 1000).toFixed(1);
  console.log(`  ✓ ${state} done: ${successCount} facilities, ${updatedRecords} records, ${errorCount} errors, ${timeSec}s`);
  return { state, facilities: successCount, records: updatedRecords, errors: errorCount, time: timeSec };
}

async function run() {
  console.log('Starting enrichment for adjacent states...');
  console.log(`States: ${STATES.join(', ')}`);
  const overallStart = Date.now();

  const results = [];
  for (const state of STATES) {
    const result = await enrichState(state);
    results.push(result);
  }

  const overallTime = ((Date.now() - overallStart) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('ENRICHMENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`${'State'.padEnd(8)} ${'Facilities'.padEnd(14)} ${'Records'.padEnd(12)} ${'Errors'.padEnd(10)} Time`);
  console.log('-'.repeat(60));

  let totalFacilities = 0, totalRecords = 0, totalErrors = 0;
  for (const r of results) {
    console.log(`${r.state.padEnd(8)} ${String(r.facilities).padEnd(14)} ${String(r.records).padEnd(12)} ${String(r.errors).padEnd(10)} ${r.time}s`);
    totalFacilities += r.facilities;
    totalRecords += r.records;
    totalErrors += r.errors;
  }
  console.log('-'.repeat(60));
  console.log(`${'TOTAL'.padEnd(8)} ${String(totalFacilities).padEnd(14)} ${String(totalRecords).padEnd(12)} ${String(totalErrors).padEnd(10)} ${overallTime}s`);
}

run();
