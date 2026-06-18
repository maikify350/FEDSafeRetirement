/**
 * GET /api/events/[id]/flyer/url
 *
 * Returns a short-lived signed URL for the seminar flyer PDF, plus the
 * original filename so the client can force a download with that name.
 * Requires an authenticated user (any role) — Preview/Download is not
 * admin-only, only Replace/Remove is.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'

const BUCKET = 'flyers'
const SIGNED_URL_TTL_S = 5 * 60 // 5 minutes

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
    .select('flyer_path, flyer_filename')
    .eq('id', id)
    .single()

  if (error)        return NextResponse.json({ error: error.message }, { status: 500 })
  if (!row?.flyer_path) return NextResponse.json({ error: 'No flyer attached' }, { status: 404 })

  const { data: signed, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(row.flyer_path, SIGNED_URL_TTL_S, {
      download: row.flyer_filename ?? undefined,
    })

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: signErr?.message || 'Failed to sign URL' }, { status: 500 })
  }

  // Also generate a "view" URL (no forced download) so the UI can
  // open the PDF in a new tab without triggering a save dialog.
  const { data: viewSigned } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(row.flyer_path, SIGNED_URL_TTL_S)

  return NextResponse.json({
    download_url: signed.signedUrl,
    view_url:     viewSigned?.signedUrl ?? signed.signedUrl,
    filename:     row.flyer_filename,
    expires_in:   SIGNED_URL_TTL_S,
  })
}
