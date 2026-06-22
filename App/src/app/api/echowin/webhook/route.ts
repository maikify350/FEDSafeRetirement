/**
 * POST /api/echowin/webhook
 *
 * Receives post-call webhook POSTs from echowin and immediately parses
 * the transcript with Claude, then upserts the result into echo_leads.
 *
 * Configure this URL in echowin dashboard:
 *   https://fedsafe-retirement.vercel.app/api/echowin/webhook
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { createAdminClient } from '@/utils/supabase/server'
import { parseCallTranscript } from '@/lib/echowin/parser'
import { storeRecording } from '@/lib/echowin/recordings'
import { findContactByNumber, getCall, listCalls, type EchoCall } from '@/lib/echowin/client'
import { resolveEventIdByCity, resolveWebinarEventId } from '@/lib/echowin/linkEvent'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Looking up the call + parsing + recording download can take a few seconds.
export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Optional shared-secret gate. Only enforced when ECHOWIN_WEBHOOK_SECRET is set,
  // so it never breaks ingestion until you opt in. To enable: set the env var and
  // append ?key=<secret> to the webhook URL configured in echowin.
  const webhookSecret = process.env.ECHOWIN_WEBHOOK_SECRET

  if (webhookSecret && req.nextUrl.searchParams.get('key') !== webhookSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // echowin's webhook only sends a small template (e.g. { "phone": "$phone" }),
  // NOT the full call object. Resolve the real call from echowin's API using
  // whatever identifier was sent — a call id if present, otherwise the phone.
  let body: Record<string, any>

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Log exactly what echowin sent (no secrets), so it's easy to confirm in the
  // Vercel logs whether the webhook variables ($webinar, $eventId, ...) resolve.
  console.log('[echowin/webhook] body fields:', JSON.stringify({
    phone:          body.phone,
    name:           body.name,
    email:          body.email,
    webinar:        body.webinar,
    webinarDate:    body.webinarDate,
    eventId:        body.eventId ?? body.event_id ?? body.webinarUUID,
    retirementYear: body.retirementYear,
    address:        body.address,
    age:            body.age,
  }))

  const digits = (s: string) => (s || '').replace(/\D/g, '')
  const callId = body.call_id ?? body.callId ?? body.id ?? null
  const phone  = body.phone ?? body.from ?? null

  let payload: EchoCall | null = null

  try {
    if (callId) {
      payload = await getCall(String(callId))
    } else if (phone) {
      // echowin ignores `after`, so scan the most recent calls for this number.
      const { data } = await listCalls({ limit: 30 })

      payload = data.find(c => digits(c.from) === digits(String(phone))) ?? null
    }
  } catch (err) {
    console.error('[echowin/webhook] call lookup failed:', err)
  }

  // Return 200 (not an error) so echowin doesn't flag the delivery / keep retrying.
  if (!payload?.id || !payload?.from) {
    return NextResponse.json({ ok: true, skipped: 'no_matching_call', callId, phone })
  }

  // Skip dead/hung-up calls with no usable transcript (mirrors the sync guard),
  // so 7-second "heard the greeting and hung up" calls never create empty rows.
  if (!payload.transcript || payload.transcript.length < 3) {
    return NextResponse.json({ ok: true, skipped: 'short_or_empty', callId: payload.id })
  }

  const supabase = createAdminClient()

  // Parse transcript and mirror recording into Supabase storage
  const [parsed, recordingUrl] = await Promise.all([
    parseCallTranscript(payload),
    payload.recordingUrl ? storeRecording(payload.recordingUrl, payload.id) : Promise.resolve(null),
  ])

  // Fill a missing email from echowin's contact record. (We deliberately do
  // NOT pull contact names — for unparsed calls they're caller-ID junk.)
  const firstName = parsed.firstName, lastName = parsed.lastName
  let email = parsed.email

  if (!email) {
    const contact = await findContactByNumber(payload.from)

    if (contact?.email) email = contact.email
  }

  // Link to the scheduled event (carries the assigned agent). Priority:
  //   1. Explicit event UUID from the webhook body — deterministic, preferred.
  //   2. In-person seminars: match by conference city.
  //   3. City-less calls (webinars): match by webinar date, else nearest webinar.
  let eventId: string | null = null
  const explicitId = body.eventId ?? body.event_id ?? body.webinarUUID ?? body.eventUuid ?? null

  if (explicitId && UUID_RE.test(String(explicitId))) {
    const { data: ev } = await supabase.from('events').select('id').eq('id', explicitId).maybeSingle()

    eventId = ev?.id ?? null
    if (!eventId) console.warn('[echowin/webhook] body.eventId not found in events:', explicitId)
  }

  if (!eventId) eventId = await resolveEventIdByCity(supabase, parsed.conferenceLocation)

  if (!eventId && !parsed.conferenceLocation) {
    eventId = await resolveWebinarEventId(supabase, [body.webinarDate, body.webinar])
  }

  // Caller age comes from the echowin webhook body (not the call transcript).
  const ageRaw = body.age ?? body.callerAge ?? body.Age
  const ageNum = ageRaw != null && String(ageRaw).trim() !== '' ? parseInt(String(ageRaw), 10) : NaN
  const age = Number.isFinite(ageNum) ? ageNum : null

  const row = {
    call_id:                   payload.id,
    call_date:                 payload.createdAt,
    agent_name:                payload.agent?.name ?? null,
    caller_phone:              payload.from,
    first_name:                firstName,
    last_name:                 lastName,
    email:                     email,
    phone:                     parsed.phone ?? payload.from,
    age:                       age,
    event_id:                  eventId,
    address:                   parsed.address,
    city:                      parsed.city,
    state:                     parsed.state,
    zip:                       parsed.zip,
    conference_location:       parsed.conferenceLocation,
    estimated_retirement_year: parsed.estimatedRetirementYear,
    guest_name:                parsed.guestName,
    guest_is_fed_employee:     parsed.guestIsFedEmployee,
    call_summary:              payload.summary ?? parsed.rawSummary,
    call_duration_seconds:     payload.duration,
    call_score:                (payload as any).score ?? null,
    call_quality:              (payload as any).quality ?? null,
    sentiment_happy:           (payload as any).sentiment?.happy ?? null,
    sentiment_sad:             (payload as any).sentiment?.sad ?? null,
    sentiment_angry:           (payload as any).sentiment?.angry ?? null,
    sentiment_neutral:         (payload as any).sentiment?.neutral ?? null,
    recording_url:             recordingUrl,
    parse_confidence:          parsed.confidence,
    notes:                     parsed.notes,
    parsed_data:               parsed,
    raw_payload:               payload,
    cre_by:                    'echowin',
    mod_by:                    'echowin',
  }

  const { error } = await supabase
    .from('echo_leads')
    .upsert(row, { onConflict: 'call_id' })

  if (error) {
    console.error('[echowin/webhook] Supabase upsert error:', error)
    
return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[echowin/webhook] Saved: ${payload.id} — ${[firstName, lastName].filter(Boolean).join(' ') || payload.from} → ${parsed.conferenceLocation ?? 'unknown location'}`)

  return NextResponse.json({
    ok: true,
    callId: payload.id,
    name: [firstName, lastName].filter(Boolean).join(' ') || null,
    conferenceLocation: parsed.conferenceLocation,
    confidence: parsed.confidence,
  })
}
