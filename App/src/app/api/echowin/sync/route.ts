/**
 * POST /api/echowin/sync
 *
 * Polls echowin for calls since the last sync, parses each transcript
 * with Claude, and upserts rows into public.echo_leads in Supabase.
 *
 * Called by Vercel cron every 15 minutes (vercel.json) or manually via POST.
 *
 * GET /api/echowin/sync  — returns last sync timestamp and row count
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { listCalls, findContactByNumber } from '@/lib/echowin/client'
import { parseCallTranscript } from '@/lib/echowin/parser'
import { storeRecording } from '@/lib/echowin/recordings'
import { resolveEventIdByCity, resolveWebinarEventId } from '@/lib/echowin/linkEvent'
import { coerceDob, normalizeRetirementYear, computeAge } from '@/lib/echowin/normalize'

// echowin's API ignores the `after` filter and a single call can take several
// seconds (OpenAI parse + recording download), so give the catch-up run room.
export const maxDuration = 300

const SYNC_STATE_KEY = 'echowin_last_sync'

// ── GET — return sync status ─────────────────────────────────────────────────
export async function GET() {
  const supabase = createAdminClient()

  const [{ data: syncState }, { count }] = await Promise.all([
    supabase.from('app_settings').select('value').eq('key', SYNC_STATE_KEY).maybeSingle(),
    supabase.from('echo_leads').select('*', { count: 'exact', head: true }),
  ])

  return NextResponse.json({
    lastSync:  syncState?.value ?? null,
    totalLeads: count ?? 0,
  })
}

// ── POST — run sync ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Authorize: Vercel cron (Authorization: Bearer ${CRON_SECRET}, sent automatically
  // when CRON_SECRET is set in the Vercel env) OR a logged-in user (the "Sync Calls"
  // button). Blocks anonymous callers from triggering paid OpenAI/echowin work.
  const cronSecret = process.env.CRON_SECRET
  const isCron = !!cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`

  if (!isCron) {
    const auth = await createClient()
    const { data: { user } } = await auth.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // ── 1. Last sync timestamp ───────────────────────────────────────────────
  const { data: syncState } = await supabase
    .from('app_settings').select('value').eq('key', SYNC_STATE_KEY).maybeSingle()

  const lastSync: string | null = syncState?.value ?? null
  const syncStart = new Date().toISOString()

  // ── 2. Fetch all new calls since last sync ───────────────────────────────
  const allCalls = []
  let page = 1, hasMore = true

  while (hasMore) {
    const resp = await listCalls({ page, limit: 100, after: lastSync ?? undefined })

    allCalls.push(...resp.data)
    hasMore = page < resp.pagination.totalPages
    page++
  }

  if (allCalls.length === 0) {
    await saveSyncState(supabase, syncStart)
    
return NextResponse.json({ synced: 0, message: 'No new calls', lastSync })
  }

  // ── 3. Load blocklist (call_ids the user has manually deleted) ───────────
  const { data: blocked } = await supabase
    .from('echo_leads_blocked')
    .select('call_id')

  const blockedIds = new Set((blocked ?? []).map((r: { call_id: string }) => r.call_id))

  // ── 3b. Load call_ids we already have ────────────────────────────────────
  // echowin ignores the `after` filter, so every run returns ALL calls. Without
  // this, we'd re-run OpenAI parsing + recording downloads on every existing
  // call each run — which times the function out. Skip what we already stored.
  const callIds = allCalls.map(c => c.id)
  const existingIds = new Set<string>()

  for (let i = 0; i < callIds.length; i += 200) {
    const { data: rows } = await supabase
      .from('echo_leads')
      .select('call_id')
      .in('call_id', callIds.slice(i, i + 200))

    for (const r of rows ?? []) existingIds.add(r.call_id)
  }

  // ── 4. Parse + upsert each call ──────────────────────────────────────────
  const results: { callId: string; status: string; name?: string }[] = []

  for (const call of allCalls) {
    try {
      // Skip calls the user has manually deleted
      if (blockedIds.has(call.id)) {
        results.push({ callId: call.id, status: 'skipped_blocked' })
        continue
      }

      // Skip calls we already ingested — the heavy work (OpenAI + recording) is
      // pointless for these, and re-doing it for every call is what timed out.
      if (existingIds.has(call.id)) {
        results.push({ callId: call.id, status: 'skipped_exists' })
        continue
      }

      // Skip calls with almost no transcript (dropped/test calls)
      if (!call.transcript || call.transcript.length < 3) {
        results.push({ callId: call.id, status: 'skipped_short' })
        continue
      }

      const [parsed, recordingUrl] = await Promise.all([
        parseCallTranscript(call),
        call.recordingUrl ? storeRecording(call.recordingUrl, call.id) : Promise.resolve(null),
      ])

      // Fill a missing email from echowin's contact record. (We deliberately do
      // NOT pull contact names — for unparsed calls they're caller-ID junk.)
      const firstName = parsed.firstName, lastName = parsed.lastName
      let email = parsed.email

      if (!email) {
        const contact = await findContactByNumber(call.from)

        if (contact?.email) email = contact.email
      }

      // Link the seminar to its scheduled event by city (carries the agent).
      // City-less calls are webinars — fall back to the nearest webinar event.
      let eventId = await resolveEventIdByCity(supabase, parsed.conferenceLocation)

      if (!eventId && !parsed.conferenceLocation) {
        eventId = await resolveWebinarEventId(supabase, [])
      }

      const row = {
        call_id:                   call.id,
        call_date:                 call.createdAt,
        agent_name:                call.agent?.name ?? null,
        caller_phone:              call.from,
        first_name:                firstName,
        last_name:                 lastName,
        email:                     email,
        phone:                     parsed.phone ?? call.from,
        dob:                       coerceDob(parsed.dob),
        age:                       computeAge(coerceDob(parsed.dob)),
        event_id:                  eventId,
        address:                   parsed.address,
        city:                      parsed.city,
        state:                     parsed.state,
        zip:                       parsed.zip,
        conference_location:       parsed.conferenceLocation,
        estimated_retirement_year: normalizeRetirementYear(parsed.estimatedRetirementYear),
        guest_name:                parsed.guestName,
        guest_is_fed_employee:     parsed.guestIsFedEmployee,
        call_summary:              call.summary ?? parsed.rawSummary,
        call_duration_seconds:     call.duration,
        call_score:                (call as any).score ?? null,
        call_quality:              (call as any).quality ?? null,
        sentiment_happy:           (call as any).sentiment?.happy ?? null,
        sentiment_sad:             (call as any).sentiment?.sad ?? null,
        sentiment_angry:           (call as any).sentiment?.angry ?? null,
        sentiment_neutral:         (call as any).sentiment?.neutral ?? null,
        recording_url:             recordingUrl,
        parse_confidence:          parsed.confidence,
        notes:                     parsed.notes,
        parsed_data:               parsed,
        raw_payload:               call,
        cre_by:                    'echowin',
        mod_by:                    'echowin',
      }

      const { error } = await supabase
        .from('echo_leads')
        .upsert(row, { onConflict: 'call_id' })

      if (error) throw error

      results.push({
        callId: call.id,
        status: 'synced',
        name:   [firstName, lastName].filter(Boolean).join(' ') || call.from,
      })
    } catch (err) {
      console.error(`[echowin/sync] call ${call.id}:`, err)
      results.push({ callId: call.id, status: 'error' })
    }
  }

  // ── 4. Save sync timestamp ───────────────────────────────────────────────
  await saveSyncState(supabase, syncStart)

  return NextResponse.json({
    synced:  results.filter(r => r.status === 'synced').length,
    skipped: results.filter(r => r.status.startsWith('skipped')).length,
    errors:  results.filter(r => r.status === 'error').length,
    total:   allCalls.length,
    results,
  })
}

async function saveSyncState(supabase: ReturnType<typeof createAdminClient>, ts: string) {
  await supabase
    .from('app_settings')
    .upsert({ key: SYNC_STATE_KEY, value: ts }, { onConflict: 'key' })
}
