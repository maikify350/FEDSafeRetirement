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
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: userRow } = await admin.from('users').select('role').eq('id', authUser.id).single()
  if (userRow?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
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

  // ── Upload via admin client (bypasses storage RLS) ──────────────────────────
  const { error: upErr } = await admin.storage
    .from('Forms')
    .upload(path, bytes, { contentType: 'application/pdf', upsert: true })

  if (upErr) {
    return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from('Forms').getPublicUrl(path)

  // Auto-persist form_url in the forms table so the user doesn't need to
  // manually save the edit dialog just to commit the uploaded URL.
  if (formId !== 'unknown') {
    await admin
      .from('forms')
      .update({ form_url: publicUrl })
      .eq('form_id', formId)
  }

  return NextResponse.json({ url: publicUrl, path })
}
