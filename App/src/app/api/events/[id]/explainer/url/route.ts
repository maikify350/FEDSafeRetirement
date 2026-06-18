/**
 * GET /api/events/[id]/explainer/url
 *
 * Returns a short-lived signed URL for the seminar explainer MP3 so the
 * UI can stream the audio. Auth required (any role); admin-only protects
 * generate/delete, not playback.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'

const BUCKET = 'flyers'
const SIGNED_URL_TTL_S = 30 * 60 // 30 minutes — long enough to listen + replay

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'event id is required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from('events')
    .select('explainer_path')
    .eq('id', id)
    .single()

  if (error)              return NextResponse.json({ error: error.message }, { status: 500 })
  if (!row?.explainer_path) return NextResponse.json({ error: 'No explainer attached' }, { status: 404 })

  const { data: signed, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(row.explainer_path, SIGNED_URL_TTL_S)

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: signErr?.message || 'Failed to sign URL' }, { status: 500 })
  }

  return NextResponse.json({
    url:        signed.signedUrl,
    expires_in: SIGNED_URL_TTL_S,
  })
}
