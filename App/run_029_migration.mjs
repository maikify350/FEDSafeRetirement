import fs from 'fs'
import pg from 'pg'

const sqlPath = './supabase/migrations/029_radius_export_optimization.sql'
const sql = fs.readFileSync(sqlPath, 'utf8')

const regions = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
  'ap-northeast-2', 'ap-south-1', 'sa-east-1'
]

async function tryRegion(prefix, region) {
  const host = `${prefix}-${region}.pooler.supabase.com`
  const connectionString = `postgresql://postgres.gqarlkfmpgaotbezpkbs:Ninalove$!2026@${host}:6543/postgres`
  
  console.log(`Trying ${prefix}-${region}...`)
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 })
  
  try {
    await client.connect()
    console.log(`Connected! Running migration 029...`)
    await client.query(sql)
    console.log('Migration 029 applied successfully! ✅')
    await client.end()
    return true
  } catch (err) {
    console.log(`Failed: ${err.message.trim()}`)
    try { await client.end() } catch {}
    return false
  }
}

async function run() {
  for (const prefix of ['aws-0', 'aws-1']) {
    for (const region of regions) {
      const success = await tryRegion(prefix, region)
      if (success) {
        console.log('Done!')
        return
      }
    }
  }
  console.error('❌ Could not connect to any regional pooler.')
}

run()
