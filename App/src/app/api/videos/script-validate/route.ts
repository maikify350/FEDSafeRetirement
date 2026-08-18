/**
 * POST /api/videos/script-validate — Script validation, pacing estimation, and automatic hyperframe segment generator
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const script = (body.script || '').trim()
    const duration = Number(body.duration_sec) || 40
    const tempo = Number(body.tempo) || 1.0

    if (!script) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 })
    }

    // Calculate pause durations: // = 2s, //// = 4s
    const pauseMatches4 = (script.match(/\/\/\/\//g) || []).length
    const scriptWithout4 = script.replace(/\/\/\/\//g, '')
    const pauseMatches2 = (scriptWithout4.match(/\/\//g) || []).length
    const totalPauseSec = (pauseMatches4 * 4) + (pauseMatches2 * 2)

    const cleanWords = script.replace(/<[^>]*>/g, '').replace(/\/\//g, '').trim().split(/\s+/).filter(Boolean)
    const wordCount = cleanWords.length
    const estimatedSeconds = Math.round((wordCount / (2.58 * tempo)) + totalPauseSec)

    // Segment into sentences for Hyperframes
    const sentences = script.split(/(?<=[.?!])\s+/).filter(Boolean)
    const segmentDuration = duration / Math.max(1, sentences.length)

    const generatedHyperframes = sentences.map((sentence: string, idx: number) => {
      const start = Number((idx * segmentDuration).toFixed(1))
      const end = Number(((idx + 1) * segmentDuration).toFixed(1))
      const cleanSentence = sentence.replace(/\/\//g, '').replace(/<[^>]*>/g, '').trim()

      return {
        id: `hf_${idx + 1}_${Date.now()}`,
        order: idx + 1,
        timestamp_start: start,
        timestamp_end: end,
        text_segment: cleanSentence,
        visual_prompt: `High-impact federal retirement visualization representing: "${cleanSentence.substring(0, 50)}..."`,
        transition: idx === 0 ? 'fade' : idx % 2 === 0 ? 'slide_left' : 'zoom_in',
        camera_motion: idx % 2 === 0 ? 'pan_slow_right' : 'push_forward',
      }
    })

    return NextResponse.json({
      valid: true,
      word_count: wordCount,
      pause_seconds: totalPauseSec,
      estimated_seconds: estimatedSeconds,
      target_seconds: duration,
      hyperframes: generatedHyperframes,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 500 })
  }
}
