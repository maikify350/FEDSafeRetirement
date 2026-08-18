/**
 * GET  /api/gallery — List assets from Supabase storage buckets ('gallery' & 'videos')
 * POST /api/gallery — Upload new asset to 'gallery' bucket
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createClient, createAdminClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const params = request.nextUrl.searchParams
    const bucket = params.get('bucket') || 'gallery'

    const { data: files, error } = await admin.storage.from(bucket).list('', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Map public URLs
    const items = (files ?? []).filter(f => !f.name.startsWith('.')).map(file => {
      const { data: { publicUrl } } = admin.storage.from(bucket).getPublicUrl(file.name)

      return {
        id: file.id || file.name,
        name: file.name,
        size: file.metadata?.size || 0,
        mimetype: file.metadata?.mimetype || '',
        created_at: file.created_at,
        bucket,
        publicUrl,
        type: file.metadata?.mimetype?.startsWith('video/') ? 'video' : 'image',
      }
    })

    return NextResponse.json(items)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bucket = (formData.get('bucket') as string) || 'gallery'

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${Date.now()}_${sanitizedName}`

    const { data, error } = await admin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: { publicUrl } } = admin.storage.from(bucket).getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      path: data.path,
      fileName,
      publicUrl,
      bucket,
      type: file.type?.startsWith('video/') ? 'video' : 'image',
    }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
