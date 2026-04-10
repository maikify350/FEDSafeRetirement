/**
 * GET /api/events/lookup
 *
 * Find the agent assigned to an event matching the supplied criteria.
 *
 * Query parameters (all required):
 *   date   – "YYYY-MM-DD"
 *   time   – "HH:MM"  (24-hour)
 *   state  – 2-letter state code, e.g. "TX"
 *   city   – city name (case-insensitive)
 *
 * Success 200 – event found with an assigned agent:
 *   {
 *     event_id:   string,
 *     event_seq:  number,
 *     description: string,
 *     event_date: string,
 *     event_time: string,
 *     duration:   number | null,
 *     state:      string,
 *     city:       string,
 *     agent: {
 *       id:         string,   // users.id UUID
 *       first_name: string,
 *       last_name:  string,
 *       full_name:  string,
 *       email:      string,
 *       phone:      string | null,
 *       act_uuid:   string | null   // populated once users.act_uuid column exists
 *     }
 *   }
 *
 * 404 – no matching event, or event exists but has no agent assigned.
 * 400 – missing required query parameters.
 *
 * Matching rules:
 *   • event_date must match exactly.
 *   • event_time matches within the event's duration window:
 *       event_time <= requested_time < event_time + duration
 *     If duration is NULL or 0, an exact minute match is used.
 *   • state_fk matches case-insensitively.
 *   • city matches case-insensitively (trimmed).
 *
 * When multiple events match (overlapping), the earliest-starting one wins.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Convert "HH:MM" or "HH:MM:SS" to total minutes since midnight
function toMinutes(t: string): number {
  const parts = t.split(':').map(Number)
  return parts[0] * 60 + (parts[1] ?? 0)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const date  = searchParams.get('date')?.trim()   // "YYYY-MM-DD"
  const time  = searchParams.get('time')?.trim()   // "HH:MM"
  const state = searchParams.get('state')?.trim().toUpperCase()
  const city  = searchParams.get('city')?.trim()

  // ── Validate params ──────────────────────────────────────────────────────
  const missing: string[] = []
  if (!date)  missing.push('date')
  if (!time)  missing.push('time')
  if (!state) missing.push('state')
  if (!city)  missing.push('city')

  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required parameter(s): ${missing.join(', ')}` },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // ── Fetch all events on that date in that state ──────────────────────────
  // We pull city matching server-side via ilike for case-insensitivity.
  const { data: events, error } = await supabase
    .from('events')
    .select(`
      id,
      event_seq,
      description,
      event_date,
      event_time,
      duration,
      state_fk,
      city,
      assignedto_fk,
      assignedto:users!events_assignedto_fk_fkey (
        id,
        first_name,
        last_name,
        email,
        phone,
        act_uuid
      )
    `)
    .eq('event_date', date!)
    .eq('state_fk', state!)
    .ilike('city', city!)            // case-insensitive city match
    .not('assignedto_fk', 'is', null) // must have an assigned agent
    .order('event_time', { ascending: true })

  if (error) {
    // act_uuid column may not exist yet — retry without it gracefully
    if (error.message.includes('act_uuid')) {
      return retryWithoutActUuid(supabase, date!, state!, city!, time!)
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!events || events.length === 0) {
    return NextResponse.json(
      { error: 'No event found for the supplied date, time, state, and city.' },
      { status: 404 }
    )
  }

  // ── Find best-matching event by time window ──────────────────────────────
  const requestedMin = toMinutes(time!)

  const match = events.find(ev => {
    if (!ev.event_time) return false
    const startMin = toMinutes(ev.event_time as string)
    const durMin   = (ev.duration as number | null) ?? 0
    if (durMin > 0) {
      // Within window: start ≤ requested < start + duration
      return requestedMin >= startMin && requestedMin < startMin + durMin
    }
    // No duration: exact minute match
    return requestedMin === startMin
  })

  if (!match) {
    return NextResponse.json(
      { error: 'No event covers the requested time slot for that location.' },
      { status: 404 }
    )
  }

  const agent = match.assignedto as {
    id: string; first_name: string; last_name: string
    email: string; phone: string | null; act_uuid?: string | null
  } | null

  if (!agent) {
    return NextResponse.json(
      { error: 'Event found but no agent is assigned to it.' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    event_id:    match.id,
    event_seq:   match.event_seq,
    description: match.description,
    event_date:  match.event_date,
    event_time:  match.event_time,
    duration:    match.duration,
    state:       match.state_fk,
    city:        match.city,
    agent: {
      id:         agent.id,
      first_name: agent.first_name,
      last_name:  agent.last_name,
      full_name:  `${agent.first_name} ${agent.last_name}`.trim(),
      email:      agent.email,
      phone:      agent.phone ?? null,
      act_uuid:   agent.act_uuid ?? null,   // null until users.act_uuid column is added
    },
  })
}

// ── Fallback: query without act_uuid in case the column doesn't exist yet ───
async function retryWithoutActUuid(
  supabase: Awaited<ReturnType<typeof import('@/utils/supabase/server').createClient>>,
  date: string, state: string, city: string, time: string
) {
  const { data: events, error } = await supabase
    .from('events')
    .select(`
      id, event_seq, description, event_date, event_time, duration, state_fk, city, assignedto_fk,
      assignedto:users!events_assignedto_fk_fkey (
        id, first_name, last_name, email, phone
      )
    `)
    .eq('event_date', date)
    .eq('state_fk', state)
    .ilike('city', city)
    .not('assignedto_fk', 'is', null)
    .order('event_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!events || events.length === 0) {
    return NextResponse.json({ error: 'No event found for the supplied criteria.' }, { status: 404 })
  }

  const requestedMin = toMinutes(time)
  const match = events.find(ev => {
    if (!ev.event_time) return false
    const startMin = toMinutes(ev.event_time as string)
    const durMin   = (ev.duration as number | null) ?? 0
    return durMin > 0
      ? requestedMin >= startMin && requestedMin < startMin + durMin
      : requestedMin === startMin
  })

  if (!match) return NextResponse.json({ error: 'No event covers the requested time slot.' }, { status: 404 })

  const agent = match.assignedto as {
    id: string; first_name: string; last_name: string; email: string; phone: string | null
  } | null

  if (!agent) return NextResponse.json({ error: 'Event has no assigned agent.' }, { status: 404 })

  return NextResponse.json({
    event_id: match.id, event_seq: match.event_seq, description: match.description,
    event_date: match.event_date, event_time: match.event_time, duration: match.duration,
    state: match.state_fk, city: match.city,
    agent: {
      id: agent.id, first_name: agent.first_name, last_name: agent.last_name,
      full_name: `${agent.first_name} ${agent.last_name}`.trim(),
      email: agent.email, phone: agent.phone ?? null,
      act_uuid: null,  // column not yet added to users table
    },
  })
}
