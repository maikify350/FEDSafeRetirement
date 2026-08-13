import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.')
}

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
