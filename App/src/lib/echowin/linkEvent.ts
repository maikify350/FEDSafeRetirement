/**
 * Resolve the scheduled event for a seminar registration by its conference
 * location city, so each echo lead links back to the event — and therefore to
 * the agent assigned to that event (events.assignedto_fk).
 *
 * conference_location looks like "Greenville, South Carolina"; we match the
 * city part ("Greenville") against events.city. Returns the event id, or null
 * when there's no city or no matching event.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

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
