import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sql = fs.readFileSync(path.join(__dirname, 'migrate-event-checkin.sql'), 'utf8')

const PROJECT_ID = 'gqarlkfmpgaotbezpkbs'
const PAT = 'sbp_edb5a6c6044368687551033d083a29327c4b96c9'

async function run() {
  console.log('Running migration via Supabase Management API...')

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PAT}`,
    },
    body: JSON.stringify({ query: sql })
  })

  const text = await res.text()
  console.log(`Status: ${res.status}`)
  
  try {
    const data = JSON.parse(text)
    console.log(JSON.stringify(data, null, 2))
  } catch {
    console.log(text.substring(0, 1000))
  }
}

run().catch(console.error)
