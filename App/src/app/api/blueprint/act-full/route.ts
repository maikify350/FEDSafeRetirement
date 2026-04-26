/**
 * GET /api/blueprint/act-full?contactId={uuid}
 *
 * Full-field ACT! CRM extract — returns EVERY field on a contact record with:
 *   1. Flattened custom fields (customFields blob merged into root level)
 *   2. Normalized field names  — cust_<name>_<digits> → <name>
 *   3. Lookup value transforms — strips ACT sort-prefix from picklist values
 *                                e.g. "2-10" → "10",  "1-0%" → "0"
 *   4. Rep/agent header        — pulled from the contact's `owner` record
 *                                (name, email, phone)
 *
 * Auth: server-side Basic → Bearer via env vars:
 *   ACT_API_BASE  – https://apius.act.com/act.web.api
 *   ACT_USERNAME  – act account email
 *   ACT_PASSWORD  – act account password
 *   ACT_DATABASE  – act database name (e.g. H2226003316)
 *
 * CORS: open to all origins so the Chrome extension can reach it.
 *
 * Test pair:
 *   Client (Hal)        2840103a-4d74-44c5-a5f3-01f708d34d30
 *   Rep (Christopher)   984e429c-c188-4ab5-b8b8-21d18a4618f0
 */

import { NextRequest, NextResponse } from 'next/server'

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ═════════════════════════════════════════════════════════════════════════════
//  AUTH
// ═════════════════════════════════════════════════════════════════════════════

async function getActToken(
  base: string,
  username: string,
  password: string,
  database: string,
): Promise<string> {
  const creds = Buffer.from(`${username}:${password}`).toString('base64')
  const resp = await fetch(`${base}/authorize`, {
    headers: {
      Authorization: `Basic ${creds}`,
      'Act-Database-Name': database,
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!resp.ok) throw new Error(`ACT auth failed: HTTP ${resp.status}`)
  const raw = await resp.text()
  return raw.replace(/^"|"$/g, '').replace(/[\r\n]/g, '').trim()
}

// ═════════════════════════════════════════════════════════════════════════════
//  FIELD-NAME NORMALIZER
//  Matches the cleanKey() logic in act-extract and the DOM decoder in
//  field-mapper.js — both strip cust_ prefix and trailing numeric suffix.
//
//  cust_fehbpermonth_023844547  →  fehbpermonth
//  cust_age_033220843           →  age
//  feglicodeactive              →  feglicodeactive   (unchanged)
// ═════════════════════════════════════════════════════════════════════════════

function cleanKey(k: string): string {
  return k
    .replace(/^cust_/i, '')          // strip cust_ prefix
    .replace(/_\d{6,}$/,  '')        // strip trailing _NNNNNN... numeric suffix
    .toLowerCase()
}

// ═════════════════════════════════════════════════════════════════════════════
//  VALUE TRANSFORMS
//
//  ACT uses numeric sort-prefixes on picklist values so they appear in the
//  correct order in the UI (otherwise "100" sorts before "10" lexically).
//  Examples the API returns:
//    "1-0"      → "0"       (whatpercentage, survivorelection amounts, etc.)
//    "2-10"     → "10"
//    "3-25"     → "25"
//    "10-100"   → "100"
//    "1-0%"     → "0"       (some fields include the % sign in the raw value)
//    "2-Yes"    → "Yes"     (boolean-style picklists)
//    "1-No"     → "No"
//
//  Pattern: one or more digits, a hyphen, then the actual value.
//  We only strip if the prefix portion is purely numeric — leaving real
//  hyphenated values like "Self-Only" untouched.
// ═════════════════════════════════════════════════════════════════════════════

function transformValue(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  const trimmed = raw.trim()

  // Match ACT sort-prefix patterns:
  //   "2-10"       → "10"
  //   "1-0%"       → "0"
  //   "11 - 100%"  → "100"   (spaces around hyphen, multi-digit prefix)
  //   "2-Yes"      → "Yes"
  // Only strip when the PREFIX portion is purely numeric.
  const sortPrefixMatch = trimmed.match(/^(\d+)\s*-\s*(.+)$/)
  if (sortPrefixMatch) {
    const rest = sortPrefixMatch[2]
    // Skip stripping if the "rest" looks like an ISO date continuation
    // e.g. "10-15T00:00:00+00:00" — "10" is the month, not an ACT sort prefix
    if (/^\d{1,2}T\d/.test(rest) || rest.includes('T00:00')) {
      return trimmed || null
    }
    // Strip trailing % from numeric values
    const cleaned = rest.replace(/%$/, '').trim()
    return cleaned
  }

  return trimmed || null   // normalise empty strings to null
}

// ═════════════════════════════════════════════════════════════════════════════
//  FETCH A SINGLE CONTACT (all fields, no $select)
// ═════════════════════════════════════════════════════════════════════════════

async function fetchContact(
  base: string,
  token: string,
  database: string,
  contactId: string,
): Promise<Record<string, unknown>> {
  const resp = await fetch(`${base}/api/contacts/${contactId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Act-Database-Name': database,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!resp.ok) {
    throw new Error(`ACT contact fetch failed for ${contactId}: HTTP ${resp.status}`)
  }
  return resp.json() as Promise<Record<string, unknown>>
}

// ═════════════════════════════════════════════════════════════════════════════
//  DYNAMIC FIELD SCHEMA
//
//  ACT omits null custom fields from the customFields blob entirely.
//  We call GET /api/metadata/contacts/fields (authenticated) to get the full
//  schema, then backfill any field not returned by the contact endpoint.
//
//  Fallback hardcoded list is used if the metadata call fails.
// ═════════════════════════════════════════════════════════════════════════════

const FALLBACK_ALWAYS_PRESENT: string[] = [
  'liquid',        // "Liquid (Cash, Checking, Savings, MMA, CDs)"
  'stocksbonds',   // "Stocks, Bonds" combined field
]

async function fetchContactFieldSchema(
  base: string,
  token: string,
  database: string,
): Promise<string[]> {
  try {
    const resp = await fetch(`${base}/api/metadata/contacts/fields`, {
      headers: {
        'Authorization':    `Bearer ${token}`,
        'Act-Database-Name': database,
        'Accept':           'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!resp.ok) return FALLBACK_ALWAYS_PRESENT

    const data = await resp.json() as unknown
    // ACT returns an array of field definition objects.
    // The `fieldName` property uses the format "customfields/rawName" or just "rawName".
    const defs: Record<string, unknown>[] = Array.isArray(data)
      ? data
      : ((data as Record<string, unknown>).fields as Record<string, unknown>[] ?? [])

    // Address sub-fields exist in the schema but belong inside nested objects,
    // not at the top level of the flattened output — exclude them.
    const ADDRESS_SUBFIELDS = new Set(['city','line1','line2','line3','state','postalcode','country','latitude','longitude'])

    const schemaKeys = defs
      .map(def => {
        const raw = String(def.fieldName ?? def.name ?? def.id ?? '')
        const stripped = raw.replace(/^customfields\//i, '').replace(/^homeaddress\//i, '').replace(/^businessaddress\//i, '')
        return cleanKey(stripped)
      })
      .filter(k => Boolean(k) && !k.includes('/') && !ADDRESS_SUBFIELDS.has(k))

    // Always merge the fallback list — some fields (e.g. liquid, stocksbonds) may
    // not appear in the metadata response but are known to exist in this database.
    const merged = Array.from(new Set([...schemaKeys, ...FALLBACK_ALWAYS_PRESENT]))
    return merged
  } catch {
    return FALLBACK_ALWAYS_PRESENT
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  WHOLE-CURRENCY FIELDS  — decimal digits stripped before output
//  "150000.00" → "150000"
// ═════════════════════════════════════════════════════════════════════════════

const WHOLE_CURRENCY_FIELDS = new Set([
  'salaryamount',
  'high3avgsalary',
  'currentnetincomeperpayperiod',
  'currentnetincomepermonth',
  'tsptraditionalbalance',
  'tsprothbalance',
  'tsptotalbalance',
  'liquid',
  'stocksbonds',
])

// ═════════════════════════════════════════════════════════════════════════════
//  FLATTEN + NORMALIZE A CONTACT RECORD
// ═════════════════════════════════════════════════════════════════════════════

function flattenContact(
  contact: Record<string, unknown>,
  knownFields: string[] = FALLBACK_ALWAYS_PRESENT,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {}

  // 1. Walk all root-level fields (skip the customFields blob itself)
  for (const [key, value] of Object.entries(contact)) {
    if (key === 'customFields') continue
    const cleaned = cleanKey(key)
    fields[cleaned] = transformValue(value)
  }

  // 2. Merge customFields blob — cleaned names win over root if both present
  //    and the custom value is non-null.
  // NOTE: some custom fields are ACT-calculated (e.g. cust_age_033220843 → age,
  // cust_spouseage_... → spouseage). These are READ-ONLY — ACT computes them
  // automatically from other fields (DOB, SpouseDOB). Never write back to them
  // via the PDF fill or any update endpoint.
  const blob = (contact.customFields ?? {}) as Record<string, unknown>
  for (const [rawKey, value] of Object.entries(blob)) {
    const cleaned = cleanKey(rawKey)
    const transformed = transformValue(value)
    // Prefer non-null values; custom field overrides root on collision
    if (!(cleaned in fields) || (fields[cleaned] === null && transformed !== null)) {
      fields[cleaned] = transformed
    }
  }

  // 3. Ensure ALL known fields appear — even if ACT omitted them (null value).
  //    knownFields comes from GET /api/metadata/contacts/fields (or fallback list).
  for (const key of knownFields) {
    if (!(key in fields)) fields[key] = null
  }

  // 4. Derive birthday year from the calculated age field.
  //    ACT stores birthday as MM/DD (no year). We use age to reconstruct the
  //    birth year: if this year's birthday has already passed → birthYear = thisYear - age,
  //    otherwise → thisYear - age - 1.
  const bdRaw = fields['birthday']
  const ageRaw = fields['age']
  if (typeof bdRaw === 'string' && ageRaw !== null && ageRaw !== undefined) {
    const age = parseInt(String(ageRaw), 10)
    if (!isNaN(age)) {
      let mm = '', dd = ''

      // Format 1: "10/15"  (slash-separated, no year)
      if (bdRaw.includes('/') && !bdRaw.match(/\d{4}/)) {
        const parts = bdRaw.split('/')
        mm = parts[0]; dd = parts[1]
      }
      // Format 2: "10-15T00:00:00+00:00"  (ACT ISO birthday — no year, T-separated time)
      else if (/^\d{1,2}-\d{1,2}T/.test(bdRaw)) {
        const parts = bdRaw.split('T')[0].split('-')
        mm = parts[0]; dd = parts[1]
      }
      // Format 3: full ISO "1957-10-11T..."  (already has year)
      else if (/^\d{4}-\d{2}-\d{2}T/.test(bdRaw)) {
        const d = new Date(bdRaw)
        if (!isNaN(d.getTime())) {
          mm = String(d.getUTCMonth() + 1).padStart(2, '0')
          dd = String(d.getUTCDate()).padStart(2, '0')
          const yr = d.getUTCFullYear()
          fields['birthday'] = `${mm}/${dd}/${yr}`
        }
        mm = '' // already set above, skip year derivation below
      }

      if (mm && dd) {
        mm = mm.padStart(2, '0')
        dd = dd.padStart(2, '0')
        const now = new Date()
        const thisYearBday = new Date(now.getFullYear(), parseInt(mm, 10) - 1, parseInt(dd, 10))
        const birthYear = now.getFullYear() - age - (thisYearBday > now ? 1 : 0)
        fields['birthday'] = `${mm}/${dd}/${birthYear}`
      }
    }
  }

  // 5. Strip decimals from whole-currency fields.
  //    ACT returns these as "150000.00" — we want "150000".
  for (const key of WHOLE_CURRENCY_FIELDS) {
    const v = fields[key]
    if (typeof v === 'string' && v.includes('.')) {
      const parsed = parseFloat(v)
      if (!isNaN(parsed)) {
        fields[key] = Math.trunc(parsed).toString()
      }
    }
  }

  return fields
}

// ═════════════════════════════════════════════════════════════════════════════
//  EXTRACT REP INFO FROM OWNER OBJECT / CONTACT RECORD
// ═════════════════════════════════════════════════════════════════════════════

function extractRepInfo(repContact: Record<string, unknown>): {
  id: string | null
  name: string | null
  email: string | null
  phone: string | null
} {
  // ACT contact standard fields
  const name =
    (repContact.fullName as string) ??
    [repContact.firstName, repContact.lastName].filter(Boolean).join(' ') ??
    null

  // Email — may be nested under emailAddress object or at root
  const emailObj = repContact.emailAddress as Record<string, unknown> | null
  const email =
    (repContact.email as string) ??
    (emailObj?.address as string) ??
    (emailObj?.emailAddress as string) ??
    null

  // Phone — check multiple common field names
  const phone =
    (repContact.homePhone as string) ??
    (repContact.mobilePhone as string) ??
    (repContact.businessPhone as string) ??
    (repContact.phone as string) ??
    null

  return {
    id:    (repContact.id as string) ?? null,
    name,
    email,
    phone,
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  ROUTE HANDLER
// ═════════════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const contactId = searchParams.get('contactId')?.trim()

  if (!contactId) {
    return NextResponse.json(
      { success: false, error: 'Missing required query param: contactId' },
      { status: 400, headers: CORS },
    )
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(contactId)) {
    return NextResponse.json(
      { success: false, error: `Invalid contactId: "${contactId}" — expected a UUID` },
      { status: 400, headers: CORS },
    )
  }

  const base     = process.env.ACT_API_BASE || 'https://apius.act.com/act.web.api'
  const username = process.env.ACT_USERNAME
  const password = process.env.ACT_PASSWORD
  const database = process.env.ACT_DATABASE

  if (!username || !password || !database) {
    return NextResponse.json(
      { success: false, error: 'ACT credentials not configured (ACT_USERNAME / ACT_PASSWORD / ACT_DATABASE)' },
      { status: 503, headers: CORS },
    )
  }

  try {
    // ── 1. Authenticate ───────────────────────────────────────────────────────
    const token = await getActToken(base, username, password, database)

    // ── 2. Fetch client contact + full field schema in parallel ──────────────
    const [clientContact, fieldSchema] = await Promise.all([
      fetchContact(base, token, database, contactId),
      fetchContactFieldSchema(base, token, database),
    ])

    // ── 3. Resolve the rep / Record Manager ──────────────────────────────────
    //
    // ACT returns two separate fields for the assigned rep:
    //   contact.recordManagerId  — UUID string (use this to fetch the rep record)
    //   contact.recordManager    — display name string ("Christopher Routley")
    //
    // We use recordManagerId to do a full contact fetch so we get email + phone.
    // Fallback: if recordManagerId is absent, try owner.id or owner as a UUID.
    //
    let rep: ReturnType<typeof extractRepInfo> | null = null

    const repId: string | null = (() => {
      // ACT field names returned in the raw contact object may be any casing.
      // Search all keys case-insensitively before flattening happens.
      const keys = Object.keys(clientContact)
      const rmIdKey = keys.find(k => k.toLowerCase() === 'recordmanagerid')
      if (rmIdKey && typeof clientContact[rmIdKey] === 'string') {
        return clientContact[rmIdKey] as string
      }
      // Fallback: owner field
      const ownerKey = keys.find(k => k.toLowerCase() === 'owner')
      const ownerVal = ownerKey ? clientContact[ownerKey] : null
      if (typeof ownerVal === 'string' && UUID_RE.test(ownerVal)) return ownerVal
      if (ownerVal && typeof ownerVal === 'object') {
        const oid = (ownerVal as Record<string, unknown>).id
        if (typeof oid === 'string') return oid
      }
      return null
    })()

    if (repId && UUID_RE.test(repId)) {
      try {
        const repFull = await fetchContact(base, token, database, repId)
        rep = extractRepInfo(repFull)
      } catch {
        // Non-critical — still return the name from the embedded string if available
        rep = {
          id:    repId,
          name:  (clientContact.recordManager as string | null) ?? null,
          email: null,
          phone: null,
        }
      }
    }

    // ── 4. Flatten + normalize client fields ──────────────────────────────────
    // Pass the full schema so every known field appears (null if not in ACT blob)
    const fields = flattenContact(clientContact, fieldSchema)

    // ── 5. Build response ─────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success:   true,
        contactId,
        // Rep/agent info at the top level for easy access
        rep: rep ?? { id: null, name: null, email: null, phone: null },
        // All client fields — flat, normalized, lookup-values cleaned, fully populated
        fields,
        _meta: {
          fetchedAt:        new Date().toISOString(),
          actDatabase:      database,
          totalFieldCount:  Object.keys(fields).length,
          schemaFieldCount: fieldSchema.length,   // 0 = metadata endpoint unavailable, used fallback
          repResolved:      rep !== null,
        },
      },
      { status: 200, headers: CORS },
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[/api/blueprint/act-full] Error:', msg)
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500, headers: CORS },
    )
  }
}
