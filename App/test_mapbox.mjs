import fs from 'fs'

// Load .env
const env = {}
if (fs.existsSync('.env')) {
  fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) return
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^"|"$/g, '')
    env[key] = val
  })
}

const MAPBOX_KEY = env['NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN']

async function run() {
  console.log('Mapbox token:', MAPBOX_KEY ? `${MAPBOX_KEY.slice(0, 10)}...` : 'not found')
  if (!MAPBOX_KEY) return

  const fullAddress = '1001 Wisconsin Ave, Madison, WI 53703'
  const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${MAPBOX_KEY}&limit=1`
  
  try {
    const res = await fetch(mapboxUrl)
    console.log('Status:', res.status)
    const json = await res.json()
    console.log('JSON keys:', Object.keys(json))
    if (json.features && json.features.length > 0) {
      console.log('Success! Center:', json.features[0].center)
    } else {
      console.log('No features found. JSON:', json)
    }
  } catch (err) {
    console.error('Fetch error:', err)
  }
}

run()
