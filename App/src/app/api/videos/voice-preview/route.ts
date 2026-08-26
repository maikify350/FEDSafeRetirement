/**
 * POST /api/videos/voice-preview — Multi-provider TTS preview (ElevenLabs, OpenAI, OpenRouter / Qwen)
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const engine = body.engine || 'elevenlabs'
    const voiceId = body.voice_id || 'GGRMgbKfr7QscdcrvWga' // default Kai (Approved Voice)
    const voiceName = body.voice_name || 'Kai'
    const speed = Math.min(2.0, Math.max(0.5, Number(body.speed) || 1.0))
    const rawPreviewText = body.text || `Hello! This is a preview of the ${voiceName} voice for your FEDSafe Retirement video.`

    // Dynamic Voice Settings from UI or optimized defaults
    const stability = typeof body.stability === 'number' ? Math.max(0, Math.min(1, body.stability)) : 0.32
    const style = typeof body.style === 'number' ? Math.max(0, Math.min(1, body.style)) : 0.60
    const similarityBoost = typeof body.similarity_boost === 'number' ? Math.max(0, Math.min(1, body.similarity_boost)) : 0.75
    const useSpeakerBoost = body.use_speaker_boost !== undefined ? Boolean(body.use_speaker_boost) : true

    // Preprocess text with ElevenLabs native prompt engineering & SSML/v3 tags
    const processedText = rawPreviewText
      // 1. Slashes -> native ElevenLabs {{pause:N}} & [pause] tokens
      .replace(/\/+/g, (match: string) => {
        const sec = match.length
        return sec === 1 ? ' {{pause:1}} [short pause] ... ' : ` {{pause:${sec}}} [long pause] ... ... `
      })
      // 2. Bold / Emphasis -> native {{emphasis}} and uppercase stress token
      .replace(/\*\*([^*]+)\*\*/g, (_: string, p1: string) => ` {{emphasis}}${p1.toUpperCase()}{{/emphasis}} `)
      .replace(/<b>(.*?)<\/b>/gi, (_: string, p1: string) => ` {{emphasis}}${p1.toUpperCase()}{{/emphasis}} `)
      .replace(/<loud>(.*?)<\/loud>/gi, (_: string, p1: string) => ` {{emphasis}}${p1.toUpperCase()}{{/emphasis}} `)
      .replace(/<emphasis>(.*?)<\/emphasis>/gi, (_: string, p1: string) => ` {{emphasis}}${p1}{{/emphasis}} `)
      // 3. Emotion and Delivery Tags (v2 {{tag}} & v3 [tag])
      .replace(/<whisper>(.*?)<\/whisper>/gi, (_: string, p1: string) => ` {{whisper}}${p1}{{/whisper}} [whispers] `)
      .replace(/<excited>(.*?)<\/excited>/gi, (_: string, p1: string) => ` {{excited}}${p1}{{/excited}} [excited] `)
      .replace(/<dramatically>(.*?)<\/dramatically>/gi, (_: string, p1: string) => ` [dramatically] ${p1} `)
      .replace(/<thoughtful>(.*?)<\/thoughtful>/gi, (_: string, p1: string) => ` [thoughtful] ${p1} `)
      .replace(/<slow>(.*?)<\/slow>/gi, (_: string, p1: string) => ` {{slow}}${p1}{{/slow}} `)
      .replace(/<fast>(.*?)<\/fast>/gi, '$1')
      .replace(/<spell>(.*?)<\/spell>/gi, (_: string, p1: string) => p1.split('').join(' '))
      .replace(/\[pause:([\d.]+)s?\]/gi, (_: string, p1: string) => ` {{pause:${Math.max(1, Math.round(parseFloat(p1) || 1))}}} `)

    // Provider 1: ElevenLabs
    const apiKey = process.env.ELEVENLABS_API_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || 'sk_da462719dbc91e7ba72b2f0ad2c0b70d84ecad811459991f'

    if (engine === 'elevenlabs' && apiKey) {
      try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text: processedText,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability,
              similarity_boost: similarityBoost,
              style,
              use_speaker_boost: useSpeakerBoost,
            },
          }),
        })

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer()
          return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'audio/mpeg',
              'Cache-Control': 'public, max-age=3600',
            },
          })
        } else {
          const errText = await response.text()
          console.error('[ElevenLabs TTS Error]', response.status, errText)
        }
      } catch (err: any) {
        console.error('[ElevenLabs Fetch Error]', err.message)
      }
    }

    // Provider 2 / Fallback: OpenAI TTS
    const openAiApiKey = process.env.OPENAI_API_KEY

    if (openAiApiKey) {
      const femaleVoices = ['Sarah', 'Alice', 'Bella', 'Lily', 'Jessica', 'Laura', 'Matilda', 'Amelia', 'Elena', 'Hope', 'Natasha', 'Nova', 'Shimmer']
      const isFemale = femaleVoices.includes(voiceName)

      const openAiVoice = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(voiceId.toLowerCase())
        ? voiceId.toLowerCase()
        : isFemale
          ? 'nova'
          : 'onyx'

      try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1-hd',
            input: processedText,
            voice: openAiVoice,
            speed,
          }),
        })

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer()
          return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'audio/mpeg',
              'Cache-Control': 'public, max-age=3600',
            },
          })
        }
      } catch (err: any) {
        console.error('[OpenAI TTS Error]', err.message)
      }
    }

    return NextResponse.json({ error: 'TTS service temporarily unavailable' }, { status: 500 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
