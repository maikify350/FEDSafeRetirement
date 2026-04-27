/**
 * GET /api/blueprint/act-extract?contactId={uuid}
 *
 * Single-source-of-truth wrapper around the ACT! CRM contacts endpoint.
 * Maintains the field lists for template2.pdf requirements and builds the
 * OData $select string automatically — change the arrays here and the
 * outbound API call updates everywhere.
 *
 * Source of field requirements: Docs/template2_pdf_requirements.json
 *
 * Auth: server-side Basic → Bearer using env vars:
 *   ACT_API_BASE  – https://apius.act.com/act.web.api
 *   ACT_USERNAME  – act account email
 *   ACT_PASSWORD  – act account password
 *   ACT_DATABASE  – act database name (e.g. H2226003316)
 *
 * CORS: open to all origins so the Chrome extension can reach it.
 */

import { NextRequest, NextResponse } from 'next/server'

// ── CORS ─────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ═════════════════════════════════════════════════════════════════════════════
//  FIELD REGISTRY  ← single source of truth
//  Edit these arrays to add/remove fields. The $select URL is built from them.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Standard root-level fields on the ACT contact object.
 * Ref: direct_crm_fields.root in template2_pdf_requirements.json
 */
const ROOT_FIELDS = [
  'fullName',
  'firstName',
  'lastName',
  'birthday',
  'editedBy',
  'businessAddress',   // nested object — contains .state used for tax calcs
] as const

/**
 * Custom field machine names.
 * ACT may honour individual names in $select; if not, `customFields` (included
 * below) returns the full blob as a guaranteed fallback.
 * Ref: direct_crm_fields.customFields in template2_pdf_requirements.json
 */
const CUSTOM_FIELDS = [
  'ageyy',                                         // renamed from cust_age_033220843
  'cust_spouseage_074349200',
  'spousedob',
  'servicecomputationdate',
  'retiredate',
  'sickleavehours',
  'unusedsickleavehours',
  'salaryamount',
  'cust_totalbasicpayshow_060132240',
  'high3avgsalary',
  'feglicodeactive',
  'fegliperpayperiod',
  'feglireduction',
  'optiona_retire',
  'optionb_retire',
  'optionc_retire',
  'optiona',
  'optionb',
  'optionc',
  'survisorbenetit',                        // legacy misspelling present in CRM
  'survivorbenefit',
  'survivorelection',
  'maritalstatus',
  'yrsofmilitaryservice',
  'socialsecurityincome',
  'currentnetincomeperpayperiod',
  'cust_currentnetincomepermonth_054503101',
  'tsptraditionalbalance',
  'tsprothbalance',
  'tsptotalbalance',
  'brokerageaccountsnq',
  'stocks',
  'other40ksira',
  'homevalue',
  'mortgage',
  'mortage',                                // legacy misspelling present in CRM
  'bank',
  'checking',
  'savings',
  'emergencysavings',
  'cds',
  'moneymarket',
  'bonds',
  'cust_fehbpermonth_023844547',
  'cust_dentalinsurancepermonth_030554373',
  'cust_visioninsurancepermonth_032424647',
  'myconcerns',
  'myrecomendations',
] as const

/**
 * The generated $select value — built once at module load.
 * Includes `customFields` as a guaranteed fallback blob alongside individual
 * custom field names (ACT honours whichever it understands).
 */
const SELECT = [
  ...ROOT_FIELDS,
  'customFields',   // fallback blob — covers ACT versions that don't sub-select custom fields
  ...CUSTOM_FIELDS,
].join(',')

// ═════════════════════════════════════════════════════════════════════════════
//  AUTH HELPER
// ═════════════════════════════════════════════════════════════════════════════

async function getActToken(base: string, username: string, password: string, database: string): Promise<string> {
  const creds = Buffer.from(`${username}:${password}`).toString('base64')
  const resp = await fetch(`${base}/authorize`, {
    headers: {
      'Authorization':    `Basic ${creds}`,
      'Act-Database-Name': database,
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!resp.ok) throw new Error(`ACT auth failed: HTTP ${resp.status}`)
  const raw = await resp.text()
  return raw.replace(/^"|"$/g, '').replace(/[\r\n]/g, '').trim()
}

// ═════════════════════════════════════════════════════════════════════════════
//  CALENDAR HELPER  — BP1 appointment date
// ═════════════════════════════════════════════════════════════════════════════

async function fetchBp1Date(base: string, token: string, database: string, contactId: string): Promise<string | null> {
  try {
    const resp = await fetch(
      `${base}/api/activities?regardingContactId=${contactId}&top=50`,
      {
        headers: {
          'Authorization':    `Bearer ${token}`,
          'Act-Database-Name': database,
          'Accept':           'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      }
    )
    if (!resp.ok) return null
    const data = await resp.json()
    const activities: Record<string, unknown>[] = Array.isArray(data)
      ? data
      : (data.activities ?? data.value ?? [])

    const bp1 = activities.find((a) =>
      String(a.subject ?? a.name ?? a.title ?? '').toUpperCase().includes('BP1')
    )
    if (!bp1) return null
    const start = bp1.startTime ?? bp1.start ?? bp1.startDate ?? null
    return start ? String(start) : null
  } catch {
    return null   // non-critical — calendar errors never block the main response
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
      { status: 400, headers: CORS }
    )
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(contactId)) {
    return NextResponse.json(
      { success: false, error: `Invalid contactId: "${contactId}" — expected a UUID` },
      { status: 400, headers: CORS }
    )
  }

  const base     = process.env.ACT_API_BASE || 'https://apius.act.com/act.web.api'
  const username = process.env.ACT_USERNAME
  const password = process.env.ACT_PASSWORD
  const database = process.env.ACT_DATABASE

  if (!username || !password || !database) {
    return NextResponse.json(
      { success: false, error: 'ACT credentials not configured (ACT_USERNAME / ACT_PASSWORD / ACT_DATABASE)' },
      { status: 503, headers: CORS }
    )
  }

  try {
    // ── 1. Authenticate ─────────────────────────────────────────────────────
    const token = await getActToken(base, username, password, database)

    // ── 2. Fetch contact (with $select) + BP1 in parallel ───────────────────
    const contactUrl = `${base}/api/contacts/${contactId}?$select=${SELECT}`

    const [contactResp, apptDate] = await Promise.all([
      fetch(contactUrl, {
        headers: {
          'Authorization':    `Bearer ${token}`,
          'Act-Database-Name': database,
          'Accept':           'application/json',
        },
        signal: AbortSignal.timeout(15_000),
      }),
      fetchBp1Date(base, token, database, contactId),
    ])

    if (!contactResp.ok) {
      throw new Error(`ACT contact fetch failed: HTTP ${contactResp.status}`)
    }

    const contact = await contactResp.json()

    // ── 3. Flatten + clean field names ──────────────────────────────────────
    //
    // cleanKey():  ageyy  →  ageyy  (unchanged)
    //              cust_fehbpermonth_023844547  →  fehbpermonth
    //              salaryamount  →  salaryamount  (unchanged — no prefix/suffix)
    //
    const cleanKey = (k: string) =>
      k.replace(/^cust_/, '').replace(/_\d+$/, '')

    const fields: Record<string, unknown> = {}

    // Root fields (fullName, firstName, lastName, birthday, editedBy, businessAddress)
    for (const key of ROOT_FIELDS) {
      fields[key] = contact[key] ?? null
    }

    // Custom fields — flatten blob into top level with cleaned names
    const blob = (contact.customFields ?? {}) as Record<string, unknown>
    for (const [rawKey, value] of Object.entries(blob)) {
      const cleaned = cleanKey(rawKey)
      // If two raw keys clean to the same name, prefer the non-null value
      if (!(cleaned in fields) || (fields[cleaned] === null && value !== null)) {
        fields[cleaned] = value
      }
    }

    // ── 4. Return clean flat response ────────────────────────────────────────
    return NextResponse.json(
      {
        success:   true,
        contactId,
        apptDate,     // BP1 startTime — null if no matching activity found
        fields,       // flat, cleaned — all root + custom fields at same level
        _meta: {
          selectFields:     SELECT,
          rootFieldCount:   ROOT_FIELDS.length,
          customFieldCount: CUSTOM_FIELDS.length,
          fetchedAt:        new Date().toISOString(),
          actDatabase:      database,
        },
      },
      { status: 200, headers: CORS }
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[/api/blueprint/act-extract] Error:', msg)
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500, headers: CORS }
    )
  }
}
