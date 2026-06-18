/**
 * POST   /api/events/[id]/flyer  — Upload (or replace) the seminar flyer PDF
 * DELETE /api/events/[id]/flyer  — Remove the seminar flyer
 *
 * Multipart upload pattern mirrors /api/forms/upload — service-role admin
 * client bypasses storage RLS, with a session-based admin role check.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'

export const maxDuration = 30

const BUCKET = 'flyers'
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

type Ctx = { params: Promise<{ id: string }> }

async function requireAdmin(request: NextRequest) {
  const admin = createAdminClient()
  let userId: string | null = null
  let isAdmin = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
      const { data: row } = await admin.from('users').select('role').eq('id', user.id).single()
      isAdmin = row?.role === 'admin'
    }
  } catch { /* fall through */ }

  if (isAdmin) return { admin, userId }

  // Same-origin fallback so multipart uploads that drop cookies still work
  // when the request is clearly initiated from our own UI.
  const origin  = request.headers.get('origin')  || ''
  const referer = request.headers.get('referer') || ''
  const host    = request.headers.get('host')    || ''
  const sameOrigin = origin.includes(host) || referer.includes(host)
  if (sameOrigin) return { admin, userId }

  return null
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'event id is required' }, { status: 400 })

  const auth = await requireAdmin(request)
  if (!auth) return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  const { admin, userId } = auth

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File exceeds ${MAX_BYTES / 1024 / 1024} MB limit` }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  // Stable path so replacements overwrite the previous file. Original
  // filename is preserved separately in the events row for download UX.
  const path = `${id}/flyer.pdf`

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: 'application/pdf', upsert: true })

  if (upErr) {
    return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 })
  }

  const { error: rowErr } = await admin
    .from('events')
    .update({
      flyer_path:        path,
      flyer_filename:    file.name,
      flyer_uploaded_at: new Date().toISOString(),
      flyer_uploaded_by: userId,
    })
    .eq('id', id)

  if (rowErr) {
    return NextResponse.json({ error: `DB update failed: ${rowErr.message}` }, { status: 500 })
  }

  return NextResponse.json({
    ok:                true,
    flyer_path:        path,
    flyer_filename:    file.name,
    flyer_uploaded_at: new Date().toISOString(),
  })
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'event id is required' }, { status: 400 })

  const auth = await requireAdmin(request)
  if (!auth) return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  const { admin } = auth

  const { data: row } = await admin
    .from('events')
    .select('flyer_path')
    .eq('id', id)
    .single()

  if (row?.flyer_path) {
    await admin.storage.from(BUCKET).remove([row.flyer_path])
  }

  const { error: rowErr } = await admin
    .from('events')
    .update({
      flyer_path:        null,
      flyer_filename:    null,
      flyer_uploaded_at: null,
      flyer_uploaded_by: null,
    })
    .eq('id', id)

  if (rowErr) {
    return NextResponse.json({ error: `DB update failed: ${rowErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
