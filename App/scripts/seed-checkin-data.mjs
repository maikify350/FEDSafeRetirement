/**
 * Seed realistic check-in data for the Seminar - Richmont event.
 * ~25 invitees, ~10 with guests, varied check-in states.
 */

const SUPABASE_URL = 'https://gqarlkfmpgaotbezpkbs.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxYXJsa2ZtcGdhb3RiZXpwa2JzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2NDYzNCwiZXhwIjoyMDkwNjQwNjM0fQ.N8TxFsnqnGUkMK_qmvATDSs-kyneci8ULziUHzpOwq8'

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Prefer': 'return=representation',
}

const api = (path) => `${SUPABASE_URL}/rest/v1/${path}`

// ── Step 1: Find the Seminar - Richmont event ──────────────────────────────
async function getEvent() {
  const res = await fetch(api('events?description=ilike.*Seminar*Richm*&select=id,description'), { headers })
  const data = await res.json()
  if (!data.length) throw new Error('Seminar - Richmont event not found')
  return data[0]
}

// ── Step 2: Update expected counts ─────────────────────────────────────────
async function updateExpectedCounts(eventId) {
  await fetch(api(`events?id=eq.${eventId}`), {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ expected_attendees: 25, expected_guests: 12 }),
  })
  console.log('✅ Updated expected counts: 25 attendees, 12 guests')
}

// ── Step 3: Clear existing test data (keep John & Jane Smith) ──────────────
async function clearOldData(eventId) {
  // Delete all attendees for this event (fresh start)
  await fetch(api(`event_attendees?event_fk=eq.${eventId}`), {
    method: 'DELETE',
    headers,
  })
  console.log('🧹 Cleared existing attendees')
}

// ── Step 4: Seed attendees ─────────────────────────────────────────────────
const ATTENDEES = [
  // Invitees (type 1) — pre-registered federal employees
  { first_name: 'Robert',   last_name: 'Anderson',  phone: '804-555-0101', email: 'r.anderson@usps.gov',     type: 1 },
  { first_name: 'Patricia', last_name: 'Baker',     phone: '804-555-0102', email: 'p.baker@treasury.gov',    type: 1 },
  { first_name: 'James',    last_name: 'Campbell',  phone: '804-555-0103', email: 'j.campbell@dod.mil',      type: 1 },
  { first_name: 'Linda',    last_name: 'Davis',     phone: '804-555-0104', email: 'l.davis@va.gov',          type: 1 },
  { first_name: 'Michael',  last_name: 'Edwards',   phone: '804-555-0105', email: 'm.edwards@fbi.gov',       type: 1 },
  { first_name: 'Barbara',  last_name: 'Foster',    phone: '804-555-0106', email: 'b.foster@ssa.gov',        type: 1 },
  { first_name: 'William',  last_name: 'Garcia',    phone: '804-555-0107', email: 'w.garcia@irs.gov',        type: 1 },
  { first_name: 'Elizabeth', last_name: 'Harris',   phone: '804-555-0108', email: 'e.harris@hud.gov',        type: 1 },
  { first_name: 'David',    last_name: 'Jackson',   phone: '804-555-0109', email: 'd.jackson@usda.gov',      type: 1 },
  { first_name: 'Susan',    last_name: 'King',      phone: '804-555-0110', email: 's.king@epa.gov',          type: 1 },
  { first_name: 'Richard',  last_name: 'Lewis',     phone: '804-555-0111', email: 'r.lewis@fema.gov',        type: 1 },
  { first_name: 'Jessica',  last_name: 'Martinez',  phone: '804-555-0112', email: 'j.martinez@gsa.gov',      type: 1 },
  { first_name: 'Thomas',   last_name: 'Nelson',    phone: '804-555-0113', email: 't.nelson@nasa.gov',       type: 1 },
  { first_name: 'Sarah',    last_name: 'Owens',     phone: '804-555-0114', email: 's.owens@opm.gov',         type: 1 },
  { first_name: 'Charles',  last_name: 'Parker',    phone: '804-555-0115', email: 'c.parker@doi.gov',        type: 1 },
  { first_name: 'Karen',    last_name: 'Quinn',     phone: '804-555-0116', email: 'k.quinn@doc.gov',         type: 1 },
  { first_name: 'Joseph',   last_name: 'Robinson',  phone: '804-555-0117', email: 'j.robinson@dot.gov',      type: 1 },
  { first_name: 'Nancy',    last_name: 'Scott',     phone: '804-555-0118', email: 'n.scott@doe.gov',         type: 1 },
  { first_name: 'Daniel',   last_name: 'Thompson',  phone: '804-555-0119', email: 'd.thompson@dhs.gov',      type: 1 },
  { first_name: 'Lisa',     last_name: 'Walker',    phone: '804-555-0120', email: 'l.walker@hhs.gov',        type: 1 },
  // Leads (type 2) — walk-in prospects discovered at event
  { first_name: 'Kevin',    last_name: 'Mitchell',  phone: '804-555-0201', email: 'kevin.mitchell@gmail.com', type: 2 },
  { first_name: 'Angela',   last_name: 'Perez',     phone: '804-555-0202', email: 'angela.perez@yahoo.com',   type: 2 },
  { first_name: 'Brian',    last_name: 'Turner',    phone: '804-555-0203', email: 'brian.turner@outlook.com', type: 2 },
  { first_name: 'Michelle', last_name: 'White',     phone: '804-555-0204', email: null,                       type: 2 },
  { first_name: 'Steven',   last_name: 'Young',     phone: '804-555-0205', email: 'steve.young@gmail.com',    type: 2 },
]

// Guests (type 3) — companions, linked to specific attendees by index
const GUESTS = [
  { parentIdx: 0,  first_name: 'Carol',    last_name: 'Anderson',  phone: '804-555-0301', email: null },
  { parentIdx: 2,  first_name: 'Helen',    last_name: 'Campbell',  phone: null,           email: null },
  { parentIdx: 3,  first_name: 'Mark',     last_name: 'Davis',     phone: '804-555-0303', email: 'm.davis@gmail.com' },
  { parentIdx: 5,  first_name: 'George',   last_name: 'Foster',    phone: null,           email: null },
  { parentIdx: 7,  first_name: 'Paul',     last_name: 'Harris',    phone: '804-555-0305', email: null },
  { parentIdx: 9,  first_name: 'Larry',    last_name: 'King',      phone: '804-555-0306', email: 'larry.king@gmail.com' },
  { parentIdx: 11, first_name: 'Frank',    last_name: 'Martinez',  phone: null,           email: null },
  { parentIdx: 13, first_name: 'Donald',   last_name: 'Owens',     phone: '804-555-0308', email: null },
  { parentIdx: 15, first_name: 'Raymond',  last_name: 'Quinn',     phone: null,           email: null },
  { parentIdx: 17, first_name: 'Gerald',   last_name: 'Scott',     phone: '804-555-0310', email: null },
  { parentIdx: 20, first_name: 'Donna',    last_name: 'Mitchell',  phone: '804-555-0311', email: null },
  { parentIdx: 22, first_name: 'Pamela',   last_name: 'Turner',    phone: null,           email: null },
]

// Check-in states — simulate a seminar in progress (~65% checked in)
// Indices of attendees who are checked in
const CHECKED_IN = [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 13, 14, 16, 17, 20, 22]
// Indices of attendees who are no-shows
const NO_SHOWS = [9, 19]
// Indices of guests who are checked in
const GUESTS_CHECKED_IN = [0, 1, 2, 4, 5, 6, 7, 10]

async function seed(eventId) {
  // Insert all attendees
  const attendeeRows = ATTENDEES.map(a => ({
    event_fk: eventId,
    first_name: a.first_name,
    last_name: a.last_name,
    phone: a.phone,
    email: a.email,
    attendee_type: a.type,
    checked_in: false,
    no_show: false,
  }))

  const res = await fetch(api('event_attendees'), {
    method: 'POST',
    headers,
    body: JSON.stringify(attendeeRows),
  })
  const inserted = await res.json()
  if (!Array.isArray(inserted)) {
    console.error('Failed to insert attendees:', inserted)
    return
  }
  console.log(`✅ Inserted ${inserted.length} attendees`)

  // Insert guests linked to parents
  const guestRows = GUESTS.map(g => ({
    event_fk: eventId,
    parent_fk: inserted[g.parentIdx].id,
    first_name: g.first_name,
    last_name: g.last_name,
    phone: g.phone,
    email: g.email,
    attendee_type: 3,
    checked_in: false,
    no_show: false,
  }))

  const gRes = await fetch(api('event_attendees'), {
    method: 'POST',
    headers,
    body: JSON.stringify(guestRows),
  })
  const insertedGuests = await gRes.json()
  if (!Array.isArray(insertedGuests)) {
    console.error('Failed to insert guests:', insertedGuests)
    return
  }
  console.log(`✅ Inserted ${insertedGuests.length} guests`)

  // Update check-in states for attendees
  for (const idx of CHECKED_IN) {
    if (inserted[idx]) {
      await fetch(api(`event_attendees?id=eq.${inserted[idx].id}`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ checked_in: true, check_in_time: new Date().toISOString() }),
      })
    }
  }
  console.log(`✅ Checked in ${CHECKED_IN.length} attendees`)

  // Mark no-shows
  for (const idx of NO_SHOWS) {
    if (inserted[idx]) {
      await fetch(api(`event_attendees?id=eq.${inserted[idx].id}`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ no_show: true, checked_in: false }),
      })
    }
  }
  console.log(`✅ Marked ${NO_SHOWS.length} no-shows`)

  // Check in some guests
  for (const idx of GUESTS_CHECKED_IN) {
    if (insertedGuests[idx]) {
      await fetch(api(`event_attendees?id=eq.${insertedGuests[idx].id}`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ checked_in: true, check_in_time: new Date().toISOString() }),
      })
    }
  }
  console.log(`✅ Checked in ${GUESTS_CHECKED_IN.length} guests`)
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Seeding check-in data...\n')
  const event = await getEvent()
  console.log(`📋 Event: "${event.description}" (${event.id})`)

  await updateExpectedCounts(event.id)
  await clearOldData(event.id)
  await seed(event.id)

  console.log('\n🎉 Seed complete! Refresh the check-in page to see the data.')
}

main().catch(console.error)
