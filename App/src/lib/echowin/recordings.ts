/**
 * Downloads a recording from echowin's CDN and stores it in the
 * Supabase 'echo_recordings' bucket. Returns the public URL.
 * If the download or upload fails, returns the original echowin URL as fallback.
 */

import { createAdminClient } from '@/utils/supabase/server'

const BUCKET = 'echo_recordings'

export async function storeRecording(
  echowinUrl: string,
  callId: string,
): Promise<string> {
  try {
    const res = await fetch(echowinUrl)

    if (!res.ok) throw new Error(`echowin fetch ${res.status}`)

    const buffer = Buffer.from(await res.arrayBuffer())
    const path   = `${callId}.wav`

    const supabase = createAdminClient()

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType:  'audio/wav',
        upsert:       true,
      })

    if (error) throw error

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)

    
return data.publicUrl
  } catch (err) {
    console.error('[echowin/recordings] storage failed, using original URL:', err)
    
return echowinUrl
  }
}
