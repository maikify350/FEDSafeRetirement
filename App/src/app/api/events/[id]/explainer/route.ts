/**
 * POST   /api/events/[id]/explainer  — Generate the seminar explainer MP3
 *                                       via ElevenLabs TTS and store it
 *                                       alongside the flyer in the same
 *                                       per-event folder of the `flyers`
 *                                       bucket.
 * DELETE /api/events/[id]/explainer  — Remove the explainer MP3 + clear
 *                                       the columns.
 *
 * Admin-only. Burns ElevenLabs credits — the UI calls this only on
 * explicit user click, never automatically.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { createClient, createAdminClient } from '@/utils/supabase/server'

// ElevenLabs TTS for ~300 words → ~10–20 s server time. Vercel Pro caps
// individual functions at 60 s; this should never come close.
export const maxDuration = 60

const BUCKET = 'flyers'

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}

type Ctx = { params: Promise<{ id: string }> }

async function requireAdmin(request: NextRequest) {
  const admin = createAdminClient()
  let userId: string | null = null
  let isAdmin = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      userId = user.id
      const { data: row } = await admin.from('users').select('role').eq('id', user.id).single()

      isAdmin = row?.role === 'admin'
    }
  } catch { /* fall through */ }

  if (isAdmin) return { admin, userId }

  const origin  = request.headers.get('origin')  || ''
  const referer = request.headers.get('referer') || ''
  const host    = request.headers.get('host')    || ''

  if (origin.includes(host) || referer.includes(host)) return { admin, userId }
  
return null
}

function buildScript(event: {
  event_date: string | null
  city: string
  state_fk: string
  description: string | null
}): string {
  const date = event.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : null

  const isVirtual =
    /zoom|virtual|webinar|online/i.test(event.city || '') ||
    /zoom|virtual|webinar|online/i.test(event.description || '')

  const stateName = STATE_NAMES[event.state_fk] || event.state_fk

  const where = isVirtual
    ? 'online — wherever you are in the country'
    : `in ${event.city}, ${stateName}`

  const opener = date
    ? `On ${date}, FedSafe Retirement is hosting a free retirement seminar ${where}. If you are a federal or postal employee anywhere near retirement, this is the session you cannot afford to miss.`
    : `FedSafe Retirement is hosting a free retirement seminar ${where}. If you are a federal or postal employee anywhere near retirement, this is the session you cannot afford to miss.`

  return [
    opener,
    '',
    `Here is the truth — you only get one shot at federal retirement, and a single wrong choice can follow you for the rest of your life. A wrong FEGLI checkbox can triple your life-insurance costs the day you retire. A missed FERS Special Supplement can quietly cost you tens of thousands. The wrong Survivor Benefit election locks your spouse into a decision that cannot be undone.`,
    '',
    `The rules have changed. And the people walking past these decisions every year — they are the statistics we are determined you will not become.`,
    '',
    `Our consultants hold the FINRA-listed Federal Retirement Consultant designation. We partner with the Federation of Federal Employee Benefit Advocates. We are not generalists — we specialize, every single day, in your federal benefits.`,
    '',
    `In one focused session we walk you through every decision that matters: FERS pension eligibility and exact calculation; FEGLI costs now, and the sometimes startling cost in retirement; T S P funds, risks, and the rule changes that quietly reshape your timeline; health insurance before and after retirement; the FERS Special Supplement and whether you qualify; spousal and survivor benefits; and hands-on help with the online retirement application itself.`,
    '',
    `Every attendee qualifies for a free, no-obligation, one-on-one appointment with a Federal Retirement Consultant. Seats are limited. Bring your spouse — retirement is a two-person decision.`,
    '',
    `You only get one shot at this. Reserve your seat now. Call six-two-zero, three-three-three, seven-five-two-six. Six-two-zero, three-three-three, seven-five-two-six.`,
  ].join('\n')
}

// ── Phonetic pre-processing ───────────────────────────────────────────────────
// TTS engines misread federal acronyms. Replace them with phonetic spellings
// so every provider sounds consistent.
function phoneticize(text: string): string {
  return text
    .replace(/\bFEGLI\b/g,  'FEG-lee')       // sounds like FIGLI without this
    .replace(/\bFERS\b/g,   'FERZ')           // already close but reinforce
    .replace(/\bCSRS\b/g,   'SIZ-erz')        // common fed pronunciation
    .replace(/\bFEHB\b/g,   'FEB')            // rhymes with "web"
    .replace(/\bTSP\b/g,    'T-S-P')          // spell it out
    .replace(/\bOPM\b/g,    'O-P-M')          // spell it out
    .replace(/\bOPF\b/g,    'O-P-F')
    .replace(/\bFFEBA\b/g,  'FEEBA')          // Federation acronym
    .replace(/\bFINRA\b/g,  'FIN-rah')
}

// ── TTS providers ────────────────────────────────────────────────────────────
// Default: OpenAI (~10–20× cheaper than ElevenLabs and good enough for an
// authoritative-advisor tone). Flip the TTS_PROVIDER env var to 'elevenlabs'
// for the more expressive ElevenLabs voices.

async function openaiTTS(text: string, speed: number = 1.0, voice: string = 'onyx'): Promise<Uint8Array> {
  const apiKey =
    process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY

  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  // Per-event voice overrides OPENAI_TTS_VOICE env var. Valid: alloy, echo,
  // fable, onyx, nova, shimmer.
  const resolvedVoice = voice || process.env.OPENAI_TTS_VOICE || 'onyx'
  const model = process.env.OPENAI_TTS_MODEL || 'tts-1-hd'

  // OpenAI clamps speed to [0.25, 4.0]. We narrow further to a sane band so
  // a typo in the UI can't produce 4× chipmunk audio.
  const clampedSpeed = Math.min(2.0, Math.max(0.5, speed))

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model,
      voice:           resolvedVoice,
      input:           text,
      response_format: 'mp3',
      speed:           clampedSpeed,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()

    throw new Error(`OpenAI TTS ${res.status}: ${errText.slice(0, 300)}`)
  }

  const buf = await res.arrayBuffer()

  
return new Uint8Array(buf)
}

async function elevenLabsTTS(text: string, voiceId?: string, speed: number = 1.0): Promise<Uint8Array> {
  const apiKey = process.env.ELEVENLABS_TTS_STT_APIKEY || process.env.ELEVEN_LABS_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY

  if (!apiKey) throw new Error('ElevenLabs API key not configured (ELEVENLABS_TTS_STT_APIKEY)')

  // voiceId comes from the per-event selector; fall back to env override or Rachel.
  const resolvedVoiceId = voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'

  // eleven_multilingual_v2 supports speed; turbo models do not.
  // Speed range for ElevenLabs is 0.7–1.2 per their API; we map our 0.5–2.0
  // UI range into that window so extreme values don't silently clamp.
  const clampedSpeed = Math.min(1.2, Math.max(0.7, speed))

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key':   apiKey,
      'Content-Type': 'application/json',
      'Accept':       'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability:         0.5,
        similarity_boost:  0.75,
        style:             0.35,
        use_speaker_boost: true,
        speed:             clampedSpeed,
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()

    throw new Error(`ElevenLabs ${res.status}: ${errText.slice(0, 300)}`)
  }

  const buf = await res.arrayBuffer()

  
return new Uint8Array(buf)
}

async function generateTTS(text: string, speed: number, voice: string, provider: string): Promise<{ mp3: Uint8Array; provider: string }> {
  const p = provider || (process.env.TTS_PROVIDER || 'openai')

  if (p === 'elevenlabs' || p === 'eleven') {
    return { mp3: await elevenLabsTTS(text, voice, speed), provider: 'elevenlabs' }
  }

  
return { mp3: await openaiTTS(text, speed, voice), provider: 'openai' }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params

  if (!id) return NextResponse.json({ error: 'event id is required' }, { status: 400 })

  const auth = await requireAdmin(request)

  if (!auth) return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  const { admin, userId } = auth

  const { data: event, error: evErr } = await admin
    .from('events')
    .select('id, event_date, city, state_fk, description, explainer_script, explainer_speed, explainer_voice')
    .eq('id', id)
    .single()

  if (evErr || !event) {
    return NextResponse.json({ error: evErr?.message || 'Event not found' }, { status: 404 })
  }

  // Script + speed resolution priority:
  //   1. `script` / `speed` in the request body (the user edited the
  //      textarea or speed knob and clicked Generate — use those exact
  //      values and persist them).
  //   2. events.explainer_script / events.explainer_speed from a previous
  //      Save Draft.
  //   3. Default template built from the event row, default speed 1.0.
  const VALID_VOICES_OPENAI    = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
  const VALID_PROVIDERS        = ['openai', 'elevenlabs']

  let bodyScript:   string | undefined
  let bodySpeed:    number | undefined
  let bodyVoice:    string | undefined
  let bodyProvider: string | undefined

  try {
    const body = await request.json().catch(() => null)

    if (body && typeof body.script   === 'string')                           bodyScript   = body.script
    if (body && typeof body.speed    === 'number' && Number.isFinite(body.speed)) bodySpeed = body.speed
    if (body && typeof body.voice    === 'string' && body.voice.length > 0)  bodyVoice    = body.voice
    if (body && typeof body.provider === 'string' && VALID_PROVIDERS.includes(body.provider)) bodyProvider = body.provider
  } catch { /* no body */ }

  const resolvedScript: string =
    (bodyScript && bodyScript.trim().length > 0)
      ? bodyScript
      : (typeof (event as any).explainer_script === 'string' && (event as any).explainer_script.trim().length > 0)
        ? (event as any).explainer_script
        : buildScript(event as any)

  const savedSpeed = Number((event as any).explainer_speed)

  const resolvedSpeed: number = Math.min(2.0, Math.max(0.5,
    bodySpeed !== undefined
      ? bodySpeed
      : Number.isFinite(savedSpeed) && savedSpeed > 0 ? savedSpeed : 1.0
  ))

  const resolvedProvider: string = bodyProvider ?? (event as any).explainer_provider ?? 'openai'
  const resolvedVoice: string    = bodyVoice    ?? (event as any).explainer_voice    ?? 'onyx'

  let mp3: Uint8Array
  let providerUsed = ''

  try {
    const result = await generateTTS(phoneticize(resolvedScript), resolvedSpeed, resolvedVoice, resolvedProvider)

    mp3 = result.mp3
    providerUsed = result.provider
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'TTS generation failed' }, { status: 500 })
  }

  const path = `${id}/explainer.mp3`

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, mp3, { contentType: 'audio/mpeg', upsert: true })

  if (upErr) {
    return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 })
  }

  const nowIso = new Date().toISOString()

  const { error: rowErr } = await admin
    .from('events')
    .update({
      explainer_path:        path,
      explainer_uploaded_at: nowIso,
      explainer_uploaded_by: userId,
      explainer_script:      resolvedScript,
      explainer_speed:       resolvedSpeed,
      explainer_voice:       resolvedVoice,
      explainer_provider:    resolvedProvider,
    })
    .eq('id', id)

  if (rowErr) {
    return NextResponse.json({ error: `DB update failed: ${rowErr.message}` }, { status: 500 })
  }

  return NextResponse.json({
    ok:                    true,
    explainer_path:        path,
    explainer_uploaded_at: nowIso,
    bytes:                 mp3.byteLength,
    provider:              providerUsed,
  })
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params

  if (!id) return NextResponse.json({ error: 'event id is required' }, { status: 400 })

  const auth = await requireAdmin(request)

  if (!auth) return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  const { admin } = auth

  const { data: row } = await admin
    .from('events')
    .select('explainer_path')
    .eq('id', id)
    .single()

  if (row?.explainer_path) {
    await admin.storage.from(BUCKET).remove([row.explainer_path])
  }

  const { error: rowErr } = await admin
    .from('events')
    .update({
      explainer_path:        null,
      explainer_uploaded_at: null,
      explainer_uploaded_by: null,
    })
    .eq('id', id)

  if (rowErr) {
    return NextResponse.json({ error: `DB update failed: ${rowErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
