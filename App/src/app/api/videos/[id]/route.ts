/**
 * GET    /api/videos/[id] — Retrieve single video
 * PUT    /api/videos/[id] — Update video record
 * DELETE /api/videos/[id] — Soft delete video (is_deleted = true)
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isUUID(id)) {
      return NextResponse.json({ error: 'Video record not found' }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('videos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const body = await request.json()
    const userIdentifier = user.email || user.id

    const updatePayload: Record<string, any> = {
      mod_by: userIdentifier,
    }

    if (body.title !== undefined) updatePayload.title = body.title.trim()
    if (body.format !== undefined) updatePayload.format = body.format === 'long' ? 'long' : 'short'
    if (body.generation_mode !== undefined) updatePayload.generation_mode = body.generation_mode === 'static' ? 'static' : 'motion'
    if (body.video_model !== undefined) updatePayload.video_model = body.video_model
    if (body.duration_sec !== undefined) updatePayload.duration_sec = Number(body.duration_sec) || 40
    if (body.script !== undefined) updatePayload.script = body.script
    if (body.ai_directive !== undefined) updatePayload.ai_directive = body.ai_directive
    if (body.cta_text !== undefined) updatePayload.cta_text = body.cta_text
    if (body.cta_on_every_frame !== undefined) updatePayload.cta_on_every_frame = Boolean(body.cta_on_every_frame)
    if (body.tts_engine !== undefined) updatePayload.tts_engine = body.tts_engine
    if (body.voice_id !== undefined) updatePayload.voice_id = body.voice_id
    if (body.voice_name !== undefined) updatePayload.voice_name = body.voice_name
    if (body.tempo !== undefined) updatePayload.tempo = Number(body.tempo) || 1.00
    if (body.status !== undefined) updatePayload.status = body.status
    if (body.video_url !== undefined) updatePayload.video_url = body.video_url
    if (body.audio_url !== undefined) updatePayload.audio_url = body.audio_url
    if (body.thumbnail_url !== undefined) updatePayload.thumbnail_url = body.thumbnail_url
    if (body.hyperframes !== undefined) updatePayload.hyperframes = Array.isArray(body.hyperframes) ? body.hyperframes : []
    if (body.continuity_references !== undefined) updatePayload.continuity_references = Array.isArray(body.continuity_references) ? body.continuity_references : []
    if (body.media_assets !== undefined) updatePayload.media_assets = Array.isArray(body.media_assets) ? body.media_assets : []
    if (body.metadata !== undefined) updatePayload.metadata = body.metadata

    // Script Library V2 & Production Fields
    if (body.script_no !== undefined) updatePayload.script_no = body.script_no ? Number(body.script_no) : null
    if (body.batch_no !== undefined) updatePayload.batch_no = body.batch_no ? Number(body.batch_no) : null
    if (body.batch_name !== undefined) updatePayload.batch_name = body.batch_name
    if (body.target_length_min !== undefined) updatePayload.target_length_min = body.target_length_min ? Number(body.target_length_min) : null
    if (body.target_length_max !== undefined) updatePayload.target_length_max = body.target_length_max ? Number(body.target_length_max) : null
    if (body.spoken_cta !== undefined) updatePayload.spoken_cta = body.spoken_cta
    if (body.onscreen_structure !== undefined) updatePayload.onscreen_structure = body.onscreen_structure
    if (body.end_screen_text !== undefined) updatePayload.end_screen_text = body.end_screen_text
    if (body.broll_notes !== undefined) updatePayload.broll_notes = body.broll_notes
    if (body.lead_capture_destination !== undefined) updatePayload.lead_capture_destination = body.lead_capture_destination
    if (body.cta_type !== undefined) updatePayload.cta_type = body.cta_type
    if (body.platforms !== undefined) updatePayload.platforms = Array.isArray(body.platforms) ? body.platforms : []
    if (body.video_source !== undefined) updatePayload.video_source = body.video_source

    // If ID is not a UUID (e.g. seeded demo template), insert it as a real record in videos
    if (!isUUID(id)) {
      const insertPayload = {
        ...updatePayload,
        title: updatePayload.title || 'Untitled Video',
        cre_by: userIdentifier,
      }
      const { data, error } = await admin
        .from('videos')
        .insert(insertPayload)
        .select('*')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }

    const { data, error } = await admin
      .from('videos')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isUUID(id)) {
      return NextResponse.json({ success: true, deleted: true })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('videos')
      .update({
        is_deleted: true,
        mod_by: user.email || user.id,
      })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
