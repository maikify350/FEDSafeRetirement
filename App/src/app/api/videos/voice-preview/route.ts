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

    // Preprocess text for slash pause markers (each '/' = 1s pause) and vocal emphasis
    const processedText = rawPreviewText
      // 1. Pauses: each '/' injects deliberate silence cadence ('... ... ')
      .replace(/\/+/g, (match: string) => {
        return (' ... ... '.repeat(match.length)) + ' '
      })
      // 2. Bold / Emphasis: transform **word**, <b>word</b>, <loud>word</loud> to UPPERCASE with acoustic stress for ElevenLabs vocal punch
      .replace(/\*\*([^*]+)\*\*/g, (_: string, p1: string) => ` ${p1.toUpperCase()}! `)
      .replace(/<b>(.*?)<\/b>/gi, (_: string, p1: string) => ` ${p1.toUpperCase()}! `)
      .replace(/<loud>(.*?)<\/loud>/gi, (_: string, p1: string) => ` ${p1.toUpperCase()}! `)
      .replace(/<emphasis>(.*?)<\/emphasis>/gi, (_: string, p1: string) => ` ${p1.toUpperCase()} `)
      .replace(/<whisper>(.*?)<\/whisper>/gi, (_: string, p1: string) => ` (softly) ${p1} `)
      .replace(/<fast>(.*?)<\/fast>/gi, '$1')
      .replace(/<slow>(.*?)<\/slow>/gi, (_: string, p1: string) => ` ${p1} `)
      .replace(/<spell>(.*?)<\/spell>/gi, (_: string, p1: string) => p1.split('').join(' '))
      .replace(/\[pause:([\d.]+)s?\]/gi, (_: string, p1: string) => ' ... ... '.repeat(Math.max(1, Math.round(parseFloat(p1) || 1))))

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
              stability: 0.32,          // Lower stability for high dynamic emotional variance & pitch inflection
              similarity_boost: 0.75,
              style: 0.60,              // High style for prominent vocal emphasis on uppercase words
              use_speaker_boost: true,
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
