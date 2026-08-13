import pg from 'pg'

const connectionString = 'postgresql://postgres.gqarlkfmpgaotbezpkbs:Ninalove$!2026@aws-1-us-east-2.pooler.supabase.com:6543/postgres'

async function run() {
  const client = new pg.Client({ connectionString })
  
  try {
    await client.connect()
    const res = await client.query(`
      SELECT 
        facility_state,
        count(*) as total_leads_with_coords
      FROM leads
      WHERE facility_state IN ('WI', 'OK', 'IA')
        AND lat IS NOT NULL
      GROUP BY facility_state
    `)
    console.log('Active coordinates count per state:')
    console.log(res.rows)
  } catch (err) {
    console.error(err)
  } finally {
    await client.end()
  }
}

run()
