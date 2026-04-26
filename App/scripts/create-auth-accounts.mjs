// create-auth-accounts.mjs
// Creates Supabase Auth accounts for all users in the `users` table
// that don't already have one. Sets password to pass123.
// Skips rgarcia350@gmail.com (admin).

const SUPABASE_URL = 'https://gqarlkfmpgaotbezpkbs.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxYXJsa2ZtcGdhb3RiZXpwa2JzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2NDYzNCwiZXhwIjoyMDkwNjQwNjM0fQ.N8TxFsnqnGUkMK_qmvATDSs-kyneci8ULziUHzpOwq8'
const SKIP_EMAIL = 'rgarcia350@gmail.com'
const PASSWORD = 'pass123'

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}

async function getAuthUsers() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers })
  const data = await res.json()
  return new Set((data.users ?? []).map(u => u.email?.toLowerCase()))
}

async function getAppUsers() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,email,first_name,last_name`, {
    headers: { ...headers, 'Prefer': 'return=representation' }
  })
  return await res.json()
}

async function run() {
  const existingAuthEmails = await getAuthUsers()
  console.log('Existing Auth accounts:', [...existingAuthEmails])

  const appUsers = await getAppUsers()
  console.log(`Found ${appUsers.length} user(s) in app users table.\n`)

  for (const user of appUsers) {
    const email = user.email?.toLowerCase()
    if (!email) { console.log(`⚠️  Skipping user with no email (id: ${user.id})`); continue }
    if (email === SKIP_EMAIL.toLowerCase()) { console.log(`⏭  Skipping ${email} (admin)`); continue }
    if (existingAuthEmails.has(email)) {
      console.log(`⏭  Already has Auth account: ${email}`)
      continue
    }

    // Create Auth account
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        password: PASSWORD,
        email_confirm: true,  // skip email confirmation
        user_metadata: { first_name: user.first_name, last_name: user.last_name }
      })
    })

    if (res.ok) {
      console.log(`✅ Created: ${email} (${user.first_name} ${user.last_name})`)
    } else {
      const err = await res.json()
      console.error(`❌ Failed: ${email} —`, err.msg ?? err.message ?? JSON.stringify(err))
    }
  }

  console.log('\nDone.')
}

run().catch(console.error)
