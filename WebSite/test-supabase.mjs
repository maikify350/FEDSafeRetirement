import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gqarlkfmpgaotbezpkbs.supabase.co'
const supabaseKey = 'sb_publishable_ZDXaKMDm3JHJGF3Z8gZI3g_GdRls9Tg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase.from('artwork_shortlists').select('*').limit(1)
  console.log('Data:', data)
  console.log('Error:', error)
}

test()
