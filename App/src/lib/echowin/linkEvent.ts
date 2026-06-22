/**
 * Resolve the scheduled event for a seminar registration.
 *
 * In-person seminars are matched by their conference location CITY
 * (resolveEventIdByCity). Webinars have no physical city, so they're matched
 * by DATE instead (resolveWebinarEventId) using the webinar date the echowin
 * webhook sends in its body. Either way the linked event carries the assigned
 * agent (events.assignedto_fk).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

/**
 * Best-effort parse of a loose date string into { month, day, year? }.
 * Handles ISO ("2026-06-28"), US slash ("6/28/2026") and human
 * ("Sunday, June 28th" / "June 28" / "June 28th, 2026"). Returns null when
 * nothing date-like is found (e.g. an unresolved "$webinarDate" template).
 */
export function parseLooseDate(raw: string | null | undefined): { month: number; day: number; year?: number } | null {
  if (!raw) return null
  const s = String(raw).trim()

  if (!s || s.startsWith('$')) return null // unresolved echowin template variable

  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)

  if (m) return { year: +m[1], month: +m[2], day: +m[3] }

  m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/)
  if (m) return { month: +m[1], day: +m[2], year: +m[3] < 100 ? 2000 + +m[3] : +m[3] }

  const lower = s.toLowerCase()
  const mi = MONTHS.findIndex(name => lower.includes(name))

  if (mi >= 0) {
    const dayMatch = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/)
    const yearMatch = lower.match(/\b(20\d{2})\b/)

    if (dayMatch) return { month: mi + 1, day: +dayMatch[1], year: yearMatch ? +yearMatch[1] : undefined }
  }

  return null
}

export async function resolveEventIdByCity(
  supabase: SupabaseClient,
  conferenceLocation: string | null
): Promise<string | null> {
  if (!conferenceLocation) return null
  const city = conferenceLocation.split(',')[0]?.trim()

  if (!city) return null

  const { data } = await supabase
    .from('events')
    .select('id, event_date')
    .ilike('city', city)
    .order('event_date', { ascending: true })

  return data?.[0]?.id ?? null
}

/**
 * Resolve a WEBINAR event for a city-less registration.
 *
 * `dateCandidates` are loose date strings from the echowin webhook body
 * (e.g. body.webinarDate "2026-06-28" or body.webinar "Sunday, June 28th").
 * We match the first parseable one against a webinar event's date. If none
 * parse or match, we fall back to the nearest upcoming webinar (else the most
 * recent), so a webinar registration always links to *a* webinar.
 */
export async function resolveWebinarEventId(
  supabase: SupabaseClient,
  dateCandidates: (string | null | undefined)[]
): Promise<string | null> {
  const { data } = await supabase
    .from('events')
    .select('id, event_date, description')
    .ilike('description', '%webinar%')
    .order('event_date', { ascending: true })

  if (!data?.length) return null

  for (const candidate of dateCandidates) {
    const want = parseLooseDate(candidate)

    if (!want) continue

    const hit = data.find(e => {
      if (!e.event_date) return false
      const [y, mo, d] = e.event_date.split('-').map(Number)

      return mo === want.month && d === want.day && (!want.year || y === want.year)
    })

    if (hit) return hit.id
  }

  // No parseable / matching date — link to the nearest upcoming webinar.
  const todayIso = new Date().toISOString().slice(0, 10)
  const upcoming = data.find(e => e.event_date && e.event_date >= todayIso)

  return (upcoming ?? data[data.length - 1]).id
}
