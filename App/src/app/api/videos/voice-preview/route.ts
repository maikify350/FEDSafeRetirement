/**
 * POST /api/videos/voice-preview — Multi-provider TTS preview (ElevenLabs, OpenAI, OpenRouter / Qwen)
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // ElevenLabs full-script TTS can take 30-60s for long narrations

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const engine = body.engine || 'elevenlabs'
    const voiceId = body.voice_id || 'GGRMgbKfr7QscdcrvWga' // default Kai (Approved Voice)
    const voiceName = body.voice_name || 'Kai'
    const speed = Math.min(2.0, Math.max(0.5, Number(body.speed) || 1.0))
    const rawPreviewText = body.text || `Hello! This is a preview of the ${voiceName} voice for your FEDSafe Retirement video.`

    // Dynamic Voice Settings (0.30 = Creative & Expressive for ElevenLabs v3)
    const stability = typeof body.stability === 'number' ? Math.max(0, Math.min(1, body.stability)) : 0.30
    const style = typeof body.style === 'number' ? Math.max(0, Math.min(1, body.style)) : 0.60
    const similarityBoost = typeof body.similarity_boost === 'number' ? Math.max(0, Math.min(1, body.similarity_boost)) : 0.75
    const useSpeakerBoost = body.use_speaker_boost !== undefined ? Boolean(body.use_speaker_boost) : true

    const modelId = body.model_id || 'eleven_v3'
    const isV3 = modelId === 'eleven_v3'

    // Preprocess text based on ElevenLabs Model Version (v3 vs v2/Turbo)
    let processedText = rawPreviewText

    if (isV3) {
      // --- ElevenLabs v3 Engine: Native Audio Tag & Natural Pause Syntax ---
      // 1. Slashes -> v3 audio pause markers
      processedText = processedText.replace(/\/+/g, (match: string) => {
        const sec = match.length
        return sec === 1 ? ' [short pause] ... ' : ' [long pause] ... ... '
      })
      // 2. Custom pause markers -> v3 pauses
      processedText = processedText
        .replace(/\{\{pause:([\d.]+)\}\}/gi, (_: string, p1: string) => (parseFloat(p1) >= 2 ? ' [long pause] ' : ' [short pause] '))
        .replace(/\[pause:([\d.]+)s?\]/gi, (_: string, p1: string) => (parseFloat(p1) >= 2 ? ' [long pause] ' : ' [short pause] '))
      // 3. Bold / Emphasis -> Upper case stress tokens
      processedText = processedText
        .replace(/\*\*([^*]+)\*\*/g, (_: string, p1: string) => ` ${p1.toUpperCase()} `)
        .replace(/<b>(.*?)<\/b>/gi, (_: string, p1: string) => ` ${p1.toUpperCase()} `)
        .replace(/\{\{emphasis\}\}([\s\S]*?)\{\{\/emphasis\}\}/gi, (_: string, p1: string) => ` ${p1.toUpperCase()} `)
        .replace(/<emphasis>([\s\S]*?)<\/emphasis>/gi, (_: string, p1: string) => ` ${p1.toUpperCase()} `)
      // 4. Transform double curly tag wrappers to v3 bracket tags
      processedText = processedText
        .replace(/\{\{whisper\}\}([\s\S]*?)\{\{\/whisper\}\}/gi, ' [whispers] $1 ')
        .replace(/\{\{excited\}\}([\s\S]*?)\{\{\/excited\}\}/gi, ' [excited] $1 ')
        .replace(/\{\{slow\}\}([\s\S]*?)\{\{\/slow\}\}/gi, ' $1 ')
        .replace(/<whisper>([\s\S]*?)<\/whisper>/gi, ' [whispers] $1 ')
        .replace(/<excited>([\s\S]*?)<\/excited>/gi, ' [excited] $1 ')
        .replace(/<dramatically>([\s\S]*?)<\/dramatically>/gi, ' [dramatically] $1 ')
        .replace(/<thoughtful>([\s\S]*?)<\/thoughtful>/gi, ' [thoughtful] $1 ')
        .replace(/<spell>(.*?)<\/spell>/gi, (_: string, p1: string) => p1.split('').join(' '))
        .replace(/<[^>]*>/g, '')
        .replace(/\{\{[^}]*\}\}/g, '')
    } else {
      // --- Legacy v2 / Turbo 2.5: SSML Break tags & Strip All Bracket Tags ---
      processedText = processedText.replace(/\/+/g, (match: string) => {
        const sec = Math.min(3, Math.max(1, match.length))
        return ` <break time="${sec}.0s" /> `
      })
      processedText = processedText
        .replace(/\{\{pause:([\d.]+)\}\}/gi, (_: string, p1: string) => ` <break time="${parseFloat(p1) || 1.0}s" /> `)
        .replace(/\[(short pause|pause:[^\]]*)\]/gi, ' <break time="1.0s" /> ')
        .replace(/\[long pause\]/gi, ' <break time="2.5s" /> ')
        .replace(/\*\*([^*]+)\*\*/g, (_: string, p1: string) => ` ${p1.toUpperCase()} `)
        .replace(/<b>(.*?)<\/b>/gi, (_: string, p1: string) => ` ${p1.toUpperCase()} `)
        .replace(/\{\{[^}]*\}\}/g, '')
        .replace(/\[(dramatically|thoughtful|excited|whispers|whisper|sighs|exhales|laughs|chuckles|giggles|appalled|annoyed|sad|happy|clears throat)\]/gi, '')
        .replace(/<[^>]*>/g, '')
    }

    // 4. Financial, IRS, Tax Forms & Federal Account Normalization
    const normalizedText = processedText
      // IRS Tax Forms & Accounts
      .replace(/\b401\(?k\)?\b/gi, 'four-oh-one-k')
      .replace(/\b403\(?b\)?\b/gi, 'four-oh-three-b')
      .replace(/\b457\(?b\)?\b/gi, 'four-five-seven-b')
      .replace(/\b529\b/g, 'five-twenty-nine')
      .replace(/\b1099-?R\b/gi, 'ten ninety-nine R')
      .replace(/\bW-?2\b/gi, 'W-two')
      .replace(/\b1040\b/g, 'ten-forty')
      .replace(/\bIRAs?\b/g, 'I-R-A')
      .replace(/\bRMDs?\b/g, 'R-M-D')
      .replace(/\bIRS\b/g, 'I-R-S')
      .replace(/\bSSA\b/g, 'S-S-A')
      .replace(/\bCOLA\b/g, 'CO-la')
      // Federal Retirement Programs & Forms
      .replace(/\bFEGLI\b/g, 'FEG-lee')
      .replace(/\bFERS\b/g, 'FERS')
      .replace(/\bCSRS\b/g, 'C-S-R-S')
      .replace(/\bTSP\b/g, 'T-S-P')
      .replace(/\bPSHB\b/g, 'P-S-H-B')
      .replace(/\bFEHB\b/g, 'F-E-H-B')
      .replace(/\bOPM\b/g, 'O-P-M')
      .replace(/\bORA\b/g, 'O-R-A')
      .replace(/\bSF-?2818\b/gi, 'S-F twenty-eight eighteen')
      .replace(/\bSF-?3107\b/gi, 'S-F thirty-one oh-seven')
      .replace(/\bSF-?2801\b/gi, 'S-F twenty-eight oh-one')
      .replace(/\bDD-?214\b/gi, 'D-D two-fourteen')
      .replace(/\bVGLI\b/g, 'V-G-L-I')
      // Currency, Percentages & Phone numbers
      .replace(/\$([0-9,]+(\.[0-9]{2})?)\b/g, (_: string, p1: string) => {
        const clean = p1.replace(/,/g, '')
        const num = parseFloat(clean)
        if (num >= 1000000) return `${(num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1)} million dollars`
        if (num >= 1000) return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)} thousand dollars`
        return `${clean} dollars`
      })
      .replace(/(\d+)%/g, '$1 percent')
      .replace(/(\d{3})-(\d{3})-(\d{4})/g, '$1, $2, $3')

    // Provider 1: ElevenLabs
    const apiKey = process.env.ELEVENLABS_API_KEY

    if (engine === 'elevenlabs' && apiKey) {
      try {
        const requestPayload: any = {
          text: normalizedText,
          model_id: modelId,
          voice_settings: isV3
            ? { stability }
            : {
                stability,
                similarity_boost: similarityBoost,
                style,
                use_speaker_boost: useSpeakerBoost,
              },
        }

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify(requestPayload),
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

          // Return explicit quota error so the UI can show a dialog
          try {
            const errJson = JSON.parse(errText)
            if (errJson?.detail?.status === 'quota_exceeded' || response.status === 401) {
              return NextResponse.json({
                error: 'ElevenLabs credit quota exceeded. Please switch to OpenAI TTS or purchase more ElevenLabs credits.',
                code: 'elevenlabs_quota_exceeded',
                credits_remaining: errJson?.detail?.message?.match(/(\d+) credits remaining/)?.[1] || '0',
              }, { status: 402 })
            }
          } catch {
            // not JSON, fall through
          }
        }
      } catch (err: any) {
        console.error('[ElevenLabs Fetch Error]', err.message)
      }
    }

    // Provider 2 / Fallback: OpenAI TTS
    const openAiApiKey = process.env.OPENAI_API_KEY

    if (openAiApiKey) {
      const femaleVoices = ['Sarah', 'Alice', 'Bella', 'Lily', 'Jessica', 'Laura', 'Matilda', 'Amelia', 'Elena', 'Hope', 'Natasha', 'Nova', 'Shimmer', 'Kai', 'Aurora', 'Shanni', 'Carolyn', 'Cassidy']
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
