// reset-passwords.mjs — sets all user passwords to "123" except rgarcia350@gmail.com
const SUPABASE_URL = 'https://gqarlkfmpgaotbezpkbs.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxYXJsa2ZtcGdhb3RiZXpwa2JzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2NDYzNCwiZXhwIjoyMDkwNjQwNjM0fQ.N8TxFsnqnGUkMK_qmvATDSs-kyneci8ULziUHzpOwq8'
const SKIP_EMAIL = 'rgarcia350@gmail.com'
const NEW_PASSWORD = 'pass123'

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}

// Fetch all users (paginated)
async function getAllUsers() {
  let users = []
  let page = 1
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers })
    const data = await res.json()
    const batch = data.users ?? []
    users = users.concat(batch)
    if (batch.length < 1000) break
    page++
  }
  return users
}

async function resetPasswords() {
  const users = await getAllUsers()
  console.log(`Found ${users.length} user(s) total.`)

  for (const user of users) {
    const email = user.email ?? ''
    if (email.toLowerCase() === SKIP_EMAIL.toLowerCase()) {
      console.log(`⏭  Skipping ${email} (protected)`)
      continue
    }

    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ password: NEW_PASSWORD }),
    })

    if (res.ok) {
      console.log(`✅ Reset: ${email}`)
    } else {
      const err = await res.json()
      console.error(`❌ Failed: ${email} —`, err.message ?? JSON.stringify(err))
    }
  }

  console.log('\nDone.')
}

resetPasswords().catch(console.error)
