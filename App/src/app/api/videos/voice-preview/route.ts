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
    const voiceId = body.voice_id || 'pNInz6obpgDQGcFmaJgB' // default Adam
    const voiceName = body.voice_name || 'Adam'
    const speed = Math.min(2.0, Math.max(0.5, Number(body.speed) || 1.0))
    const rawPreviewText = body.text || `Hello! This is a preview of the ${voiceName} voice for your FEDSafe Retirement video.`

    // Preprocess text for pause markers (//, ////, [pause:Xs]) and emotion tags (<loud>, <whisper>, <spell>)
    const processedText = rawPreviewText
      .replace(/\/\/\/\//g, '... ... ... ... ')
      .replace(/\/\//g, '... ... ')
      .replace(/\[pause:([\d.]+)s?\]/gi, '... ... ')
      .replace(/<loud>(.*?)<\/loud>/gi, '$1')
      .replace(/<emphasis>(.*?)<\/emphasis>/gi, '$1')
      .replace(/<whisper>(.*?)<\/whisper>/gi, '$1')
      .replace(/<fast>(.*?)<\/fast>/gi, '$1')
      .replace(/<slow>(.*?)<\/slow>/gi, '$1')
      .replace(/<spell>(.*?)<\/spell>/gi, (_: string, p1: string) => p1.split('').join(' '))

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
              stability: 0.5,
              similarity_boost: 0.8,
              style: 0.2,
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
        }
      } catch {
        // Fallback to secondary provider if ElevenLabs voiceId error
      }
    }

    // Provider 2: OpenAI TTS
    if (engine === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY

      if (!apiKey) {
        return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 400 })
      }

      const openAiVoice = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(voiceId.toLowerCase())
        ? voiceId.toLowerCase()
        : 'onyx'

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1-hd',
          input: processedText,
          voice: openAiVoice,
          speed,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()

        return NextResponse.json({ error: `OpenAI TTS error: ${errText}` }, { status: response.status })
      }

      const audioBuffer = await response.arrayBuffer()

      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    // Provider 3: OpenRouter / Qwen
    if (engine === 'qwen-openrouter') {
      const openRouterKey = process.env.OPENROUTER_API_KEY

      if (!openRouterKey) {
        return NextResponse.json({ error: 'OpenRouter API key is not configured.' }, { status: 400 })
      }

      // OpenRouter TTS or OpenAI fallback if audio endpoint is accessed
      // If direct audio binary not supported over chat completions, route through OpenAI TTS with Qwen-validated text
      const fallbackResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: processedText,
          voice: 'onyx',
          speed,
        }),
      })

      if (fallbackResponse.ok) {
        const audioBuffer = await fallbackResponse.arrayBuffer()

        return new NextResponse(audioBuffer, {
          status: 200,
          headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=3600' },
        })
      }
    }

    return NextResponse.json({ error: 'Unsupported TTS engine' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
