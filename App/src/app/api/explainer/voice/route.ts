/**
 * POST /api/explainer/voice — record the narration first, then time every shot to the spoken words.
 *
 * Body: { plan: ExplainerPlan, speed?: number, stability?: number, similarity?: number, style?: number }
 * Returns: { plan } with plan.voice filled (audio_url, words, silences, caption_blocks, pace, duration) and
 *          every shot re-timed so it starts on a spoken word and hands over inside real silence.
 *
 * ElevenLabs "with timestamps" gives exact character times; the MP3 is stored in the public `videos` bucket at
 * explainer/<stamp>/voice.mp3 so Remotion (and the Video Studio) can play it.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createAdminClient } from '@/utils/supabase/server'
import { authorizeExplainerRequest } from '@/lib/explainer/auth'
import { runPlanChecks } from '@/lib/explainer/checks'
import { buildVoiceTiming, type ElevenAlignment } from '@/lib/explainer/timing'
import type { ExplainerPlan } from '@/lib/explainer/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

/** Normalise for TTS the same way the Video Studio does: no markup, pauses become sentence breaks. */
function ttsText(script: string): string {
  return script.replace(/<[^>]*>/g, '').replace(/\*\*/g, '').replace(/\s*\/+\s*/g, '. ').replace(/\s+/g, ' ').trim()
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeExplainerRequest(request)

    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const apiKey = process.env.ELEVENLABS_API_KEY

    if (!apiKey) return NextResponse.json({ error: 'ELEVENLABS_API_KEY is not configured' }, { status: 503 })

    const body = await request.json()
    const plan: ExplainerPlan = body.plan

    if (!plan?.brief || !Array.isArray(plan.shots) || !plan.shots.length) return NextResponse.json({ error: 'plan with shots is required' }, { status: 400 })

    // The script is the shots' narration in order, so word mapping is exact.
    const script = plan.shots.map(s => s.narration.trim()).filter(Boolean).join(' ')
    const text = ttsText(script)

    if (!text) return NextResponse.json({ error: 'Plan has no narration' }, { status: 400 })

    const voiceId = plan.brief.voiceId || 'GGRMgbKfr7QscdcrvWga'
    const modelId = String(body.model_id || process.env.EXPLAINER_TTS_MODEL || 'eleven_multilingual_v2')

    const settings = {
      stability: Number(body.stability ?? 0.5),
      similarity_boost: Number(body.similarity ?? 0.8),
      style: Number(body.style ?? 0),
      use_speaker_boost: true,
      speed: Math.min(1.2, Math.max(0.7, Number(body.speed ?? 1.05))),
    }

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: modelId, voice_settings: settings }),
    })

    if (!res.ok) {
      const t = await res.text()

      
return NextResponse.json({ error: `ElevenLabs ${res.status}: ${t.slice(0, 300)}` }, { status: 502 })
    }

    const json: any = await res.json()
    const alignment: ElevenAlignment | undefined = json.normalized_alignment || json.alignment

    if (!alignment?.characters?.length) return NextResponse.json({ error: 'ElevenLabs returned no alignment' }, { status: 502 })

    const audio = Buffer.from(json.audio_base64, 'base64')
    const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    const objectPath = `explainer/${stamp}/voice.mp3`
    const admin = createAdminClient()
    const { error: upErr } = await admin.storage.from('videos').upload(objectPath, audio, { contentType: 'audio/mpeg', upsert: true })

    if (upErr) return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 })
    const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/videos/${objectPath}`

    const timing = buildVoiceTiming(alignment, plan.shots)

    const next: ExplainerPlan = {
      ...plan,
      script,
      shots: timing.shots,
      brief: { ...plan.brief, durationSec: Math.round(timing.duration) },
      voice: {
        audio_url: audioUrl,
        duration: timing.duration,
        pace: timing.pace,
        words: timing.words,
        silences: timing.silences,
        caption_blocks: timing.caption_blocks,
        unmatched_shots: timing.unmatched,
        voice_id: voiceId,
        model_id: modelId,
        recorded_at: new Date().toISOString(),
      },
    }

    next.qa = runPlanChecks(next)

    return NextResponse.json({ plan: next, audio_url: audioUrl, duration: timing.duration, pace: timing.pace, words: timing.words.length, unmatched_shots: timing.unmatched })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Voice error' }, { status: 500 })
  }
}
