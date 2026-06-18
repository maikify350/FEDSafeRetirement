
const supabaseUrl = 'https://gqarlkfmpgaotbezpkbs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxYXJsa2ZtcGdhb3RiZXpwa2JzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2NDYzNCwiZXhwIjoyMDkwNjQwNjM0fQ.N8TxFsnqnGUkMK_qmvATDSs-kyneci8ULziUHzpOwq8'

async function getSchema() {
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  })
  const data = await response.json()
  console.log(JSON.stringify(data, null, 2))
}

getSchema()
