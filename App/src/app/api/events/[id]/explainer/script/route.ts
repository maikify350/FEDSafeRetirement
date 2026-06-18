/**
 * GET /api/events/[id]/explainer/script
 *   Returns the saved explainer script. If none has been saved yet, returns
 *   the default template built from the event row, with `is_default: true`
 *   so the UI can hint that this is a fresh draft.
 *
 * PUT /api/events/[id]/explainer/script
 *   Body: { script: string }
 *   Saves the script text to events.explainer_script. Does NOT regenerate
 *   the MP3 — that happens via POST /api/events/[id]/explainer.
 *
 * Admin-only (matches the rest of the explainer routes).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'

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

// Same template as the POST /explainer route. Kept in sync — if the
// marketing copy in one file changes, change both.
function buildDefaultScript(event: {
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

async function requireAdmin(request: NextRequest) {
  const admin = createAdminClient()
  let isAdmin = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: row } = await admin.from('users').select('role').eq('id', user.id).single()
      isAdmin = row?.role === 'admin'
    }
  } catch { /* fall through */ }

  if (isAdmin) return admin

  const origin  = request.headers.get('origin')  || ''
  const referer = request.headers.get('referer') || ''
  const host    = request.headers.get('host')    || ''
  if (origin.includes(host) || referer.includes(host)) return admin
  return null
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'event id is required' }, { status: 400 })

  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

  const { data: event, error } = await admin
    .from('events')
    .select('event_date, city, state_fk, description, explainer_script, explainer_speed, explainer_voice, explainer_provider, explainer_uploaded_at')
    .eq('id', id)
    .single()

  if (error || !event) {
    return NextResponse.json({ error: error?.message || 'Event not found' }, { status: 404 })
  }

  const saved = (typeof (event as any).explainer_script === 'string' && (event as any).explainer_script.trim().length > 0)
    ? (event as any).explainer_script as string
    : null
  const savedSpeed = Number((event as any).explainer_speed)
  const speed = Number.isFinite(savedSpeed) && savedSpeed > 0 ? savedSpeed : 1.0
  const voice    = typeof (event as any).explainer_voice    === 'string' && (event as any).explainer_voice.length    > 0 ? (event as any).explainer_voice    : 'onyx'
  const provider = typeof (event as any).explainer_provider === 'string' && (event as any).explainer_provider.length > 0 ? (event as any).explainer_provider : 'openai'

  return NextResponse.json({
    script:                saved ?? buildDefaultScript(event as any),
    is_default:            saved === null,
    speed,
    voice,
    provider,
    explainer_uploaded_at: (event as any).explainer_uploaded_at ?? null,
  })
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'event id is required' }, { status: 400 })

  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

  let body: any
  try { body = await request.json() } catch { body = null }
  if (!body || typeof body.script !== 'string') {
    return NextResponse.json({ error: 'Body must be { script: string }' }, { status: 400 })
  }

  const trimmed = body.script.trim()
  // Empty string clears the override and reverts to the default template.
  const value = trimmed.length === 0 ? null : body.script

  const VALID_PROVIDERS = ['openai', 'elevenlabs']
  const updates: Record<string, any> = { explainer_script: value }
  if (typeof body.speed    === 'number' && Number.isFinite(body.speed)) {
    updates.explainer_speed = Math.min(2.0, Math.max(0.5, body.speed))
  }
  if (typeof body.voice    === 'string' && body.voice.length > 0) {
    updates.explainer_voice = body.voice
  }
  if (typeof body.provider === 'string' && VALID_PROVIDERS.includes(body.provider)) {
    updates.explainer_provider = body.provider
  }

  const { error } = await admin
    .from('events')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, cleared: value === null, speed: updates.explainer_speed })
}
