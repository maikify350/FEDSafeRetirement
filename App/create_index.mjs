import pg from 'pg'

const connectionString = 'postgresql://postgres.gqarlkfmpgaotbezpkbs:Ninalove$!2026@aws-1-us-east-2.pooler.supabase.com:6543/postgres'

async function run() {
  const client = new pg.Client({ connectionString })
  
  try {
    await client.connect()
    console.log('Connected to database. Creating index on facility columns...')
    
    const startTime = Date.now()
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_facility_lookup 
      ON leads (facility_state, facility_city, facility_address, facility_zip_code);
    `)
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`Index created successfully in ${duration}s! ✅`)

  } catch (err) {
    console.error('Error creating index:', err)
  } finally {
    await client.end()
  }
}

run()
