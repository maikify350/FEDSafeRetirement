/**
 * POST /api/users/[id]/avatar
 * Accepts multipart/form-data with a "file" field.
 * Uploads to Supabase Storage (avatars bucket) and updates avatar_url in users table.
 * Max size: 5MB. Allowed types: image/jpeg, image/png, image/webp, image/gif.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { createClient, createAdminClient } from '@/utils/supabase/server'

const BUCKET = 'avatars'
const MAX_BYTES = 5 * 1024 * 1024  // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Auth check
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Authorization: admin OR self
  const { data: callerRow } = await admin.from('users').select('role').eq('id', authUser.id).single()
  const isAdmin = callerRow?.role === 'admin'
  const isSelf  = authUser.id === id

  if (!isAdmin && !isSelf) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Parse the multipart form
  let formData: FormData

  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Validate type and size
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 415 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 5 MB limit' }, { status: 413 })
  }

  // Derive extension from mime type
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png':  'png',
    'image/webp': 'webp',
    'image/gif':  'gif',
  }

  const ext      = extMap[file.type] ?? 'jpg'
  const path     = `${id}/profile.${ext}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  // Remove any existing avatar files for this user (clean up old extension variants)
  const { data: existing } = await admin.storage.from(BUCKET).list(id)

  if (existing && existing.length > 0) {
    const oldPaths = existing.map((f) => `${id}/${f.name}`)

    await admin.storage.from(BUCKET).remove(oldPaths)
  }

  // Upload
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // Get public URL
  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)

  // Bust cache with a timestamp query param so the browser reloads the image
  const avatar_url = `${publicUrl}?t=${Date.now()}`

  // Persist URL to users table
  const { data, error: dbErr } = await admin
    .from('users')
    .update({ avatar_url, mod_by: authUser.email ?? 'system' })
    .eq('id', id)
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ avatar_url: data.avatar_url })
}
