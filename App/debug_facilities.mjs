import pg from 'pg'

const connectionString = 'postgresql://postgres.gqarlkfmpgaotbezpkbs:Ninalove$!2026@aws-1-us-east-2.pooler.supabase.com:6543/postgres'

async function run() {
  const client = new pg.Client({ connectionString })
  
  try {
    await client.connect()
    console.log('Connected to database. Analyzing facilities for WI, OK, IA...')

    const res = await client.query(`
      SELECT 
        facility_state,
        count(*) as total_leads,
        count(distinct (facility_address, facility_city, facility_state, facility_zip_code)) as unique_facilities
      FROM leads
      WHERE facility_state IN ('WI', 'OK', 'IA')
        AND lat IS NULL
        AND facility_address IS NOT NULL
        AND facility_address <> ''
      GROUP BY facility_state
    `)
    
    console.log('Unique facilities summary:')
    console.log(res.rows)

  } catch (err) {
    console.error('Error:', err)
  } finally {
    await client.end()
  }
}

run()
