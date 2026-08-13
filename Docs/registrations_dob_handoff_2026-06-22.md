# Registrations / echowin — DOB, Age & Event-Linking Handoff (2026-06-22)

Snapshot of work completed this session on the **Registrations** feature (formerly
"Echo Leads") so the echowin agent can be restarted and work resumed cleanly.

## What shipped (all deployed to Vercel `master`)

1. **Renamed "Echo Leads" → "Registrations"** (commit `3567104`)
   - Nav label, route `/echo-leads` → `/registrations`, view component
     `EchoLeadsView` → `RegistrationsView`, page metadata, grid `storageKey`
     (`fs-echo-leads` → `fs-registrations`).
   - The `echowin` vendor API and the `echo_leads` DB table keep their names
     (internal identifiers, not user-facing).

2. **Webinar event linking** (commits `1304561`, `0c17330`)
   - Webinars have no conference city, so `resolveEventIdByCity` returned null.
     The webhook now resolves the event by priority:
     1. **Explicit event UUID** from the webhook body (`webinarUUID` / `eventId` /
        `event_id` / `eventUuid`), verified to exist — **preferred, deterministic**.
     2. Conference **city** (in-person seminars).
     3. City-less calls → **webinar date** (`webinarDate`/`webinar`) match, else
        nearest upcoming webinar (`resolveWebinarEventId`).
   - Sync (cron backup) got the same city-less → nearest-webinar fallback.
   - The webhook **logs the received body fields** — check Vercel logs for
     `[echowin/webhook] body fields:` to confirm which `$variables` echowin resolves.

3. **Event UUID surfaced in Edit Event dialog** (commit `829ea2a`)
   - Click-to-copy monospace chip next to `#seq` in `EventsView.tsx`, so it's easy
     to grab a UUID for the webhook.

4. **DOB + Age + retirement-year normalization** (commit `34c1597`)
   - **Migration `028_echo_leads_dob.sql`** — added `echo_leads.dob date`. ALREADY
     APPLIED to prod (via the IPv4 pooler — see Tooling below). `age integer`
     (migration 027) also confirmed present.
   - DOB collected via webhook body `$dob`; stored by webhook (`coerceDob`, parser
     fallback) and sync (parser-extracted). Parser now extracts `dob` +
     4-digit retirement year.
   - **Age is DERIVED from DOB**: computed live on read (grid column + edit form
     — never goes stale) AND refreshed in the stored `age` int on every write.
     Falls back to echowin/manual age when there's no DOB. Edit-form Age is
     read-only when a DOB is present (`computeAge` in `src/lib/echowin/normalize.ts`).
   - **Retirement year normalized** "27" → "2027" on ingest (webhook + sync + parser).
   - Registrations grid: new **DOB** column (visible) + **Age** column now live-computed;
     all fields appear in the Show/Hide picker. Edit Lead form has DOB (date) + Age fields.

## Current DB state (`echo_leads`, 74 rows)
- `dob` + `age` backfilled for **16 rows** (callers who stated a DOB in the transcript).
  The other 58 are older calls from before the bot asked for DOB → `dob` null
  (Age falls back to stored/echowin value or "—").
- **All** `estimated_retirement_year` values normalized to 4-digit `YYYY`
  (0 malformed remaining; relative phrases like "Five years from now", "this year",
  "15 years" resolved from transcript context by a one-off AI backfill).
- Backfill was pure UPDATE-by-id (no duplicates). `mod_by='dob-backfill'`.

## echowin webhook body (current, confirmed working)
```json
{
  "phone":"$phone",
  "name":"$name",
  "email":"$email",
  "webinarDate": "$webinarDate",
  "webinar":"Sunday, June 28th",
  "webinarUUID":"b0557848-221d-41d5-b20d-6813738dc169",
  "callerNumber": "$callerNumber",
  "retirementYear": "$retirementYear",
  "address": "$address",
  "dob":"$dob"
}
```
- `webinarUUID` = the June 28th webinar event id (event #1, assigned Ben Bailey).
  **For the next webinar, swap in that event's UUID** (copy from Edit Event dialog).

## Bot conversation script (context — what Lisa collects, in order)
Full name → email (spelled letter-by-letter) → phone → **DOB (month, day, year)** →
mailing address → estimated retirement year. (DOB is asked as M/D/Y, so
`coerceDob` handles `MM/DD/YYYY`; 2-digit years assumed 1900s.)

> ⚠️ The OpenAI parser prompt in `src/lib/echowin/parser.ts` still references the
> OLD in-person seminars (Lexington KY / Greenville SC, "Sunday June 14th") and a
> `conferenceLocation` enum limited to those two. For the webinar this is harmless
> (webinar calls → `conferenceLocation` null → linked by `webinarUUID`), but the
> prompt should be refreshed if in-person seminars resume or for cleaner extraction.

## Tooling note (important for future migrations)
- The direct DB host (`db.<ref>.supabase.co`) is **IPv6-only and unreachable** in
  this env. Run DDL via the **IPv4 pooler**:
  `aws-1-us-east-2.pooler.supabase.com:6543`, user `postgres.gqarlkfmpgaotbezpkbs`,
  password from `.env` (`NEXT_PUBLIC_DIRECT_CONNECTION_STRING`). `pg` is installed.
- After DDL, if PostgREST reports "Could not find the 'X' column ... in the schema
  cache", run `NOTIFY pgrst, 'reload schema';` (a stale-cache symptom we hit and fixed).

## Files touched this session
- `src/data/navigation/verticalMenuData.tsx` (nav label + href)
- `src/app/(dashboard)/registrations/page.tsx` (renamed from echo-leads)
- `src/views/registrations/RegistrationsView.tsx` (renamed; DOB/Age columns + edit form)
- `src/views/events/EventsView.tsx` (copyable event UUID)
- `src/lib/echowin/linkEvent.ts` (`resolveWebinarEventId`, `parseLooseDate`)
- `src/lib/echowin/normalize.ts` (NEW: `coerceDob`, `computeAge`, `normalizeRetirementYear`)
- `src/lib/echowin/parser.ts` (extract `dob` + 4-digit year)
- `src/app/api/echowin/webhook/route.ts` and `.../sync/route.ts` (DOB, age-from-DOB,
  retirement-year normalization, event-UUID/date linking, body logging)
- `supabase/migrations/028_echo_leads_dob.sql` (NEW, applied)

## Pending / parked (not part of this session's asks)
- RLS migration `026_rls_policies.sql` — needs final table list + apply (8 advisor items, then 26 warnings).
- Orphaned private "Nathan Dion" ACT duplicate cleanup.
- Full ACT rep-isolation model.
- Optional: refresh the parser prompt for the webinar (see ⚠️ above).
- A few backfilled rows are obvious test calls (Wayne Gretzky, Testy McTester,
  Ricardo/Greg/Mike test entries) — delete via the grid trash-can if desired.
