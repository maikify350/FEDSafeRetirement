/**
 * GET /api/voices/credits — Returns TTS credit balances for all providers
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const credits: {
    elevenlabs: { remaining: number; limit: number; used: number; tier: string; resetDate: string | null } | null
    openai: { status: 'active' | 'unknown'; note: string } | null
  } = {
    elevenlabs: null,
    openai: null,
  }

  // ElevenLabs
  const elApiKey = process.env.ELEVENLABS_API_KEY
  console.log('[Credits] ELEVENLABS_API_KEY present:', !!elApiKey, 'length:', elApiKey?.length || 0)
  if (elApiKey) {
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: { 'xi-api-key': elApiKey },
      })
      console.log('[Credits] ElevenLabs response status:', res.status)
      if (res.ok) {
        const data = await res.json()
        const remaining = (data.character_limit || 0) - (data.character_count || 0)
        const resetDate = data.next_character_count_reset_unix
          ? new Date(data.next_character_count_reset_unix * 1000).toISOString()
          : null
        credits.elevenlabs = {
          remaining: Math.max(0, remaining),
          limit: data.character_limit || 0,
          used: data.character_count || 0,
          tier: data.tier || 'free',
          resetDate,
        }
      } else {
        const errText = await res.text()
        console.error('[Credits] ElevenLabs error:', res.status, errText.slice(0, 200))
      }
    } catch (err: any) {
      console.error('[Credits] ElevenLabs fetch error:', err.message)
    }
  } else {
    console.warn('[Credits] No ELEVENLABS_API_KEY env var found')
  }

  // OpenAI — no public "credits" endpoint; we just confirm the key exists
  const oaiKey = process.env.OPENAI_API_KEY
  if (oaiKey) {
    credits.openai = {
      status: 'active',
      note: 'Pay-per-use (no character cap)',
    }
  }

  return NextResponse.json(credits)
}
