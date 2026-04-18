/**
 * POST /api/proxy/calculate
 *
 * FEGLI calculation endpoint — callable from Act! CRM Copilot extension.
 * Fetches rate table from the existing /api/fegli-rates-employee endpoint
 * (same host, no direct Supabase access), then runs the FEGLI engine.
 *
 * CORS: open to all origins so the Chrome extension on Act.com can reach it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeFegliCalculation, getOPMLetter, FegliCustomFields } from '@/lib/fegli-engine'

// ── CORS headers ─────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ── Build the list of valid OPM FEGLI codes ───────────────────────────────────
function getValidFegliCodes(): string[] {
  const codes: string[] = []
  for (const bMult of [0, 1, 2, 3, 4, 5]) {
    for (const hasA of [false, true]) {
      codes.push(`${getOPMLetter(hasA, bMult, false)}0`)
      for (let c = 1; c <= 5; c++) {
        codes.push(`${getOPMLetter(hasA, bMult, true)}${c}`)
      }
    }
  }
  codes.push('A0', 'B0', '99') // OPM special codes
  return codes
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customFields: rawFields, contactId } = body ?? {}

    if (!rawFields) {
      return NextResponse.json(
        { success: false, error: 'Missing customFields in request body' },
        { status: 400, headers: CORS }
      )
    }

    // ── Normalize age alias ─────────────────────────────────────────────────
    const customFields: FegliCustomFields = { ...rawFields }
    if (customFields.cust_age_033220843 !== undefined && customFields.age === undefined) {
      customFields.age = customFields.cust_age_033220843
    }

    // ── Validate required fields ────────────────────────────────────────────
    const required = [
      { key: 'age',          label: 'Age' },
      { key: 'salaryamount', label: 'Salary' },
    ]
    const missing = required
      .filter(f => {
        const val = customFields[f.key]
        return val === null || val === undefined || val === ''
      })
      .map(f => `${f.label} (${f.key})`)

    const hasCode   = customFields.feglicodeactive && String(customFields.feglicodeactive).trim() !== ''
    const hasAmount = customFields.fegliperpayperiod && String(customFields.fegliperpayperiod).trim() !== ''

    if (!hasCode && !hasAmount) {
      missing.push('FEGLI Code or FEGLI Per Pay Period (need at least one)')
    }

    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields', missingFields: missing, received: customFields },
        { status: 422, headers: CORS }
      )
    }

    // ── Validate FEGLI code ─────────────────────────────────────────────────
    if (hasCode) {
      const code = String(customFields.feglicodeactive).trim().toUpperCase()
      if (!getValidFegliCodes().includes(code)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid FEGLI code: "${code}"`,
            hint: 'Must be a valid OPM code (e.g. Z5, C0, W3).',
            received: customFields,
          },
          { status: 422, headers: CORS }
        )
      }
    }

    // ── Fetch rate table from our own endpoint ──────────────────────────────
    const ratesUrl = new URL('/api/fegli-rates-employee', request.url).toString()
    const ratesResp = await fetch(ratesUrl)
    if (!ratesResp.ok) {
      throw new Error(`Failed to fetch FEGLI rates from ${ratesUrl}: ${ratesResp.status}`)
    }
    const rateTable = await ratesResp.json()

    // ── Run FEGLI engine ────────────────────────────────────────────────────
    const result = executeFegliCalculation(customFields, rateTable)

    return NextResponse.json(
      {
        success: true,
        contactId: contactId ?? null,
        ratesSource: ratesUrl,
        input: customFields,
        result: result.customFields,
      },
      { status: 200, headers: CORS }
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[/api/proxy/calculate] Error:', msg)
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500, headers: CORS }
    )
  }
}
