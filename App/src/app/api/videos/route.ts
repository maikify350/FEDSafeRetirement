/**
 * GET  /api/videos — List all non-deleted video records
 * POST /api/videos — Create a new video record
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
    const format = params.get('format')
    const mode = params.get('mode')
    const status = params.get('status')
    const source = params.get('source')
    const batch = params.get('batch')
    const search = params.get('search')

    let query = admin
      .from('videos')
      .select('*')
      .eq('is_deleted', false)
      .order('script_no', { ascending: true, nullsFirst: false })
      .order('cre_dt', { ascending: false })

    if (format && format !== 'all') {
      query = query.eq('format', format)
    }

    if (mode && mode !== 'all') {
      query = query.eq('generation_mode', mode)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (source && source !== 'all') {
      query = query.eq('video_source', source)
    }

    if (batch && batch !== 'all') {
      query = query.eq('batch_no', parseInt(batch, 10))
    }

    if (search && search.trim()) {
      query = query.or(`title.ilike.%${search.trim()}%,script.ilike.%${search.trim()}%,ai_directive.ilike.%${search.trim()}%,broll_notes.ilike.%${search.trim()}%,batch_name.ilike.%${search.trim()}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
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
    const body = await request.json()

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const userIdentifier = user.email || user.id

    const insertPayload = {
      title: body.title.trim(),
      format: body.format === 'long' ? 'long' : 'short',
      generation_mode: body.generation_mode === 'static' ? 'static' : 'motion',
      video_model: body.video_model || 'higgsfield',
      duration_sec: Number(body.duration_sec) || 40,
      script: body.script ?? '',
      ai_directive: body.ai_directive ?? '',
      cta_text: body.cta_text ?? '',
      cta_on_every_frame: Boolean(body.cta_on_every_frame),
      tts_engine: body.tts_engine || 'elevenlabs',
      voice_id: body.voice_id || 'pNInz6obpgDQGcFmaJgB',
      voice_name: body.voice_name || 'Adam',
      tempo: Number(body.tempo) || 1.00,
      status: body.status || 'draft',
      video_url: body.video_url || null,
      audio_url: body.audio_url || null,
      thumbnail_url: body.thumbnail_url || null,
      hyperframes: Array.isArray(body.hyperframes) ? body.hyperframes : [],
      continuity_references: Array.isArray(body.continuity_references) ? body.continuity_references : [],
      media_assets: Array.isArray(body.media_assets) ? body.media_assets : [],
      metadata: body.metadata || {},

      // Script Library V2 & Production Fields
      script_no: body.script_no !== undefined && body.script_no !== null ? Number(body.script_no) : null,
      batch_no: body.batch_no !== undefined && body.batch_no !== null ? Number(body.batch_no) : null,
      batch_name: body.batch_name ?? '',
      target_length_min: body.target_length_min !== undefined && body.target_length_min !== null ? Number(body.target_length_min) : null,
      target_length_max: body.target_length_max !== undefined && body.target_length_max !== null ? Number(body.target_length_max) : null,
      spoken_cta: body.spoken_cta ?? '',
      onscreen_structure: body.onscreen_structure ?? '',
      end_screen_text: body.end_screen_text ?? '',
      broll_notes: body.broll_notes ?? '',
      lead_capture_destination: body.lead_capture_destination ?? '',
      cta_type: body.cta_type ?? '',
      platforms: Array.isArray(body.platforms) ? body.platforms : [],
      video_source: body.video_source || 'custom',

      is_deleted: false,
      cre_by: userIdentifier,
      cre_dt: new Date().toISOString(),
      mod_by: userIdentifier,
      mod_dt: new Date().toISOString(),
      version_no: 1,
    }

    const { data, error } = await admin
      .from('videos')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
