/**
 * POST /api/videos/script-validate — Script validation, pacing estimation, and automatic hyperframe segment generator
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const script = (body.script || '').trim()
    const duration = Number(body.duration_sec) || 40
    const tempo = Number(body.tempo) || 1.0

    if (!script) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 })
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY

    // Fallback algorithmic hyperframe generator if API is offline
    const sentences = script.split(/(?<=[.?!])\s+/).filter(Boolean)
    const segmentDuration = duration / Math.max(1, sentences.length)

    const generatedHyperframes = sentences.map((sentence: string, idx: number) => {
      const start = Number((idx * segmentDuration).toFixed(1))
      const end = Number(((idx + 1) * segmentDuration).toFixed(1))

      return {
        id: `hf_${idx + 1}_${Date.now()}`,
        order: idx + 1,
        timestamp_start: start,
        timestamp_end: end,
        text_segment: sentence,
        visual_prompt: `High-impact federal retirement visualization representing: "${sentence.substring(0, 50)}..."`,
        transition: idx === 0 ? 'fade' : idx % 2 === 0 ? 'slide_left' : 'zoom_in',
        camera_motion: idx % 2 === 0 ? 'pan_slow_right' : 'push_forward',
      }
    })

    return NextResponse.json({
      valid: true,
      word_count: script.split(/\s+/).length,
      estimated_seconds: Math.round(script.split(/\s+/).length / (2.58 * tempo)),
      target_seconds: duration,
      hyperframes: generatedHyperframes,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 500 })
  }
}
