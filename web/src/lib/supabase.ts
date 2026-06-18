/**
 * Supabase browser client — used ONLY for Realtime subscriptions.
 * All data mutations still go through the backend REST API.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key, {
  realtime: { params: { eventsPerSecond: 10 } },
})
