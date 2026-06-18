import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gqarlkfmpgaotbezpkbs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxYXJsa2ZtcGdhb3RiZXpwa2JzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2NDYzNCwiZXhwIjoyMDkwNjQwNjM0fQ.N8TxFsnqnGUkMK_qmvATDSs-kyneci8ULziUHzpOwq8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables') // Assuming there might be an RPC or I can try another way
  if (error) {
    // Try a direct query to pg_catalog if allowed
    const { data: tables, error: pgError } = await supabase.from('pg_tables').select('tablename').eq('schemaname', 'public')
    console.log('Tables:', tables)
    console.log('PG Error:', pgError)
  } else {
    console.log('Tables:', data)
  }
}

listTables()
