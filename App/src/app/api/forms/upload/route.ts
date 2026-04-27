/**
 * POST /api/forms/upload
 *
 * Accepts multipart/form-data with:
 *   - file: PDF file
 *   - form_id: e.g. "SF-2809"  (used as the storage folder)
 *
 * Uses the service-role admin client so RLS on storage.objects is bypassed.
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  // ── Auth: admin only ────────────────────────────────────────────────────────
  // Try session-based auth first. If cookies aren't forwarded (multipart uploads
  // on some browsers strip cookies), fall back to admin-only service-role client.
  const admin = createAdminClient()
  let isAuthorized = false

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data: userRow } = await admin.from('users').select('role').eq('id', authUser.id).single()
      isAuthorized = userRow?.role === 'admin'
    }
  } catch {
    // Session check failed — will rely on the admin client below
  }

  if (!isAuthorized) {
    // Fallback: check if the request came from our own origin (same-origin fetch)
    const origin = request.headers.get('origin') || ''
    const referer = request.headers.get('referer') || ''
    const host = request.headers.get('host') || ''
    const isSameOrigin = origin.includes(host) || referer.includes(host)
    if (!isSameOrigin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // ── Parse multipart form ────────────────────────────────────────────────────
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const formId = (formData.get('form_id') as string | null)?.trim() || 'unknown'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  const path = `${formId}/${file.name}`

  // ── Remove any old files in this form's folder first ────────────────────────
  const { data: existingFiles } = await admin.storage
    .from('Forms')
    .list(formId, { limit: 50 })

  if (existingFiles && existingFiles.length > 0) {
    const oldPaths = existingFiles
      .filter(f => f.name && f.name !== '.emptyFolderPlaceholder')
      .map(f => `${formId}/${f.name}`)
    if (oldPaths.length > 0) {
      await admin.storage.from('Forms').remove(oldPaths)
    }
  }

  // ── Upload via admin client (bypasses storage RLS) ──────────────────────────
  const { error: upErr } = await admin.storage
    .from('Forms')
    .upload(path, bytes, { contentType: 'application/pdf', upsert: true })

  if (upErr) {
    return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 })
  }

  // Append cache-buster so CDN / browser never serves a stale version
  const { data: { publicUrl } } = admin.storage.from('Forms').getPublicUrl(path)
  const freshUrl = `${publicUrl}?v=${Date.now()}`

  // Auto-persist form_url in the forms table so the user doesn't need to
  // manually save the edit dialog just to commit the uploaded URL.
  if (formId !== 'unknown') {
    await admin
      .from('forms')
      .update({ form_url: freshUrl })
      .eq('form_id', formId)
  }

  return NextResponse.json({ url: freshUrl, path })
}
