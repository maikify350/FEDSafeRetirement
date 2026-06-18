const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: __dirname + '/../.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAPBOX_KEY = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (!SUPABASE_URL || !SUPABASE_KEY || !MAPBOX_KEY) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Starting enrichment for SC and KY...');
  const startTime = Date.now();

  // 1. Fetch all records for SC and KY missing lat
  console.log('Fetching leads from Supabase...');
  
  let allLeads = [];
  let page = 0;
  let pageSize = 5000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('leads')
      .select('id, facility_address, facility_city, facility_state, facility_zip_code')
      .in('facility_state', ['SC', 'KY'])
      .is('lat', null)
      .neq('facility_address', '')
      .not('facility_address', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching leads:', error);
      return;
    }

    if (data.length > 0) {
      allLeads.push(...data);
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`Fetched ${allLeads.length} total records to process.`);

  // 2. Find unique facilities
  const uniqueFacilities = new Map();
  for (const lead of allLeads) {
    // Generate a unique key for the facility
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
  console.log(`Found ${facilities.length} unique facilities to geocode.`);

  // 3. Geocode and Update
  let successCount = 0;
  let errorCount = 0;
  let updatedRecordsCount = 0;

  for (let i = 0; i < facilities.length; i++) {
    const fac = facilities[i];
    const fullAddress = `${fac.address}, ${fac.city}, ${fac.state} ${fac.zip}`;
    
    try {
      // Mapbox API call
      const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${MAPBOX_KEY}&limit=1`;
      const response = await fetch(mapboxUrl);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        // Mapbox returns [longitude, latitude]
        const [lon, lat] = data.features[0].center;

        // Update Supabase
        const { error: updateError } = await supabase
          .from('leads')
          .update({ lat, lon })
          .eq('facility_address', fac.address)
          .eq('facility_city', fac.city)
          .eq('facility_state', fac.state)
          .eq('facility_zip_code', fac.zip);

        if (updateError) {
          console.error(`Error updating DB for ${fullAddress}:`, updateError);
          errorCount++;
        } else {
          successCount++;
          updatedRecordsCount += fac.count;
          if (successCount % 10 === 0 || i === facilities.length - 1) {
            console.log(`Progress: Geocoded ${successCount}/${facilities.length} facilities...`);
          }
        }
      } else {
        console.warn(`No results from Mapbox for: ${fullAddress}`);
        errorCount++;
      }
    } catch (err) {
      console.error(`Exception processing ${fullAddress}:`, err.message);
      errorCount++;
    }
  }

  const endTime = Date.now();
  const timeTakenSec = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n--- ENRICHMENT COMPLETE ---');
  console.log(`Time taken: ${timeTakenSec} seconds`);
  console.log(`Unique Facilities Geocoded: ${successCount} successful, ${errorCount} failed`);
  console.log(`Total Lead Records Backfilled: ${updatedRecordsCount}`);
}

run();
