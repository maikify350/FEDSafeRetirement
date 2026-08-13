import pg from 'pg'

const connectionString = 'postgresql://postgres.gqarlkfmpgaotbezpkbs:Ninalove$!2026@aws-1-us-east-2.pooler.supabase.com:6543/postgres'

async function run() {
  const client = new pg.Client({ connectionString })
  
  try {
    await client.connect()
    console.log('Connected to Supabase PostgreSQL.')

    // 1. Total leads count in DB
    const totalCountRes = await client.query('SELECT count(*) FROM leads')
    console.log('Total leads in database:', totalCountRes.rows[0].count)

    // 2. Count by state
    const stateCountRes = await client.query(`
      SELECT 
        facility_state, 
        count(*) as total_leads, 
        count(lat) as leads_with_lat,
        count(lon) as leads_with_lon
      FROM leads 
      GROUP BY facility_state
      ORDER BY total_leads DESC
    `)
    console.log('Leads per state:', stateCountRes.rows)

    // 3. Sample WI leads
    const wiSampleRes = await client.query(`
      SELECT id, first_name, last_name, facility_city, lat, lon
      FROM leads
      WHERE facility_state = 'WI'
      LIMIT 10
    `)
    console.log('WI sample leads:', wiSampleRes.rows)

  } catch (err) {
    console.error('Error running query:', err)
  } finally {
    await client.end()
  }
}

run()
