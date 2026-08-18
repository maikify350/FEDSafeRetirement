import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '../.env')

const env = {}
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  })
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://gqarlkfmpgaotbezpkbs.supabase.co'
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxYXJsa2ZtcGdhb3RiZXpwa2JzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2NDYzNCwiZXhwIjoyMDkwNjQwNjM0fQ.N8TxFsnqnGUkMK_qmvATDSs-kyneci8ULziUHzpOwq8'

console.log('Supabase URL:', supabaseUrl)
console.log('Service key exists:', Boolean(serviceKey))

async function run() {
  // Ensure 'videos' bucket exists and is public
  try {
    const bucketRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: 'videos', name: 'videos', public: true }),
    })
    console.log('Bucket create/check status:', bucketRes.status)
  } catch (e) {
    console.log('Bucket check completed')
  }

  // Files to upload
  const rootDir = path.join(__dirname, '../../')
  const files = [
    { local: path.join(rootDir, 'SocialMedia/GoogleDrive_Export/03_Video_Postal_Retirement_Reel.mp4'), remote: '01_Video_Postal_Retirement_Reel.mp4' },
    { local: path.join(rootDir, 'SocialMedia/GoogleDrive_Export/03_Video_Postal_Retirement_Reel.mp4'), remote: '03_Video_Postal_Retirement_Reel.mp4' },
    { local: path.join(rootDir, 'SocialMedia/GoogleDrive_Export/04_Video_FEGLI_Shock_Alert_Reel.mp4'), remote: '02_Video_FEGLI_Shock_Alert_Reel.mp4' },
    { local: path.join(rootDir, 'SocialMedia/GoogleDrive_Export/04_Video_FEGLI_Shock_Alert_Reel.mp4'), remote: '04_Video_FEGLI_Shock_Alert_Reel.mp4' },
  ]

  for (const f of files) {
    if (!fs.existsSync(f.local)) {
      console.warn(`Local file not found: ${f.local}`)
      continue
    }

    const buf = fs.readFileSync(f.local)
    const sizeMB = (buf.length / 1024 / 1024).toFixed(2)
    console.log(`Uploading ${f.remote} (${sizeMB} MB) to Supabase 'videos' bucket...`)

    const upRes = await fetch(`${supabaseUrl}/storage/v1/object/videos/${f.remote}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'video/mp4',
        'x-upsert': 'true',
      },
      body: buf,
    })

    console.log(`  Upload HTTP ${upRes.status}`)
    const pubUrl = `${supabaseUrl}/storage/v1/object/public/videos/${f.remote}`
    console.log(`  Public Storage URL: ${pubUrl}`)
  }

  console.log('\n✅ All video assets successfully uploaded to Supabase Storage!')
}

run().catch(console.error)
