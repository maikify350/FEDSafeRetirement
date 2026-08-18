/**
 * POST /api/voices/clone — Instant Voice Cloning via ElevenLabs & F5-TTS Engine
 * Allows Mike Zaino to upload 1-3 minutes of audio to clone his official partner voice.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const name = (formData.get('name') as string) || 'Mike Zaino (Official)'
    const description = (formData.get('description') as string) || 'Founding Senior Partner Mike Zaino custom cloned voice for FedSafe Retirement'

    if (!file) {
      return NextResponse.json({ error: 'Audio recording or file is required (1-3 minutes recommended)' }, { status: 400 })
    }

    const elevenLabsKey = process.env.ELEVENLABS_API_KEY

    if (!elevenLabsKey) {
      return NextResponse.json({ error: 'ELEVENLABS_API_KEY is not configured in environment' }, { status: 500 })
    }

    // Prepare multipart form data for ElevenLabs Voice Clone API
    const elevenFormData = new FormData()
    elevenFormData.append('name', name)
    elevenFormData.append('description', description)
    elevenFormData.append('files', file, file.name || 'mike_voice_sample.mp3')

    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsKey,
      },
      body: elevenFormData,
    })

    if (!response.ok) {
      const errData = await response.json()
      return NextResponse.json({ error: errData.detail?.message || errData.message || 'ElevenLabs cloning failed' }, { status: response.status })
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      voice_id: result.voice_id,
      name,
      description,
      gender: 'm',
      message: 'Mike Zaino voice cloned successfully! It is now available for all video creations.',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Voice cloning failed' }, { status: 500 })
  }
}
