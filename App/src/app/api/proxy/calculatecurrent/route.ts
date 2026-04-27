/**
 * POST /api/proxy/calculatecurrent
 *
 * FEGLI "current benefits" calculation endpoint — callable from Act! CRM
 * Copilot extension. Fetches employee rate table from Supabase, then runs
 * Chris's FEGLI_API.calculateCurrentButton() for the actual calculation.
 *
 * CORS: open to all origins so the Chrome extension on Act.com can reach it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FEGLI_API = require('@/lib/pdfgen/fegli_api.js')

// CORS headers
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
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

    // Validate required fields
    const age = rawFields.ageyy ?? rawFields.age ?? rawFields.cust_age_033220843
    const salary = rawFields.salaryamount
    if (!age || !salary) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          missingFields: [
            !age ? 'AgeYY (ageyy, age, or cust_age_033220843)' : null,
            !salary ? 'Salary (salaryamount)' : null,
          ].filter(Boolean),
          received: rawFields,
        },
        { status: 422, headers: CORS }
      )
    }

    const hasCode   = rawFields.feglicodeactive && String(rawFields.feglicodeactive).trim() !== ''
    const hasAmount = rawFields.fegliperpayperiod && String(rawFields.fegliperpayperiod).trim() !== ''
    if (!hasCode && !hasAmount) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          missingFields: ['FEGLI Code or FEGLI Per Pay Period (need at least one)'],
          received: rawFields,
        },
        { status: 422, headers: CORS }
      )
    }

    // Fetch employee rate table from Supabase
    const admin = createAdminClient()
    const { data: rateTable, error: rateError } = await admin
      .from('fegli_rates_employee')
      .select('id, age_min, age_max, basic, opt_a, opt_b, opt_c')
      .order('age_min', { ascending: true })

    if (rateError || !rateTable) {
      throw new Error(`Failed to load employee rate table: ${rateError?.message ?? 'no data'}`)
    }

    // Run Chris's FEGLI_API.calculateCurrentButton()
    // It expects (actJson, employeeRateInput) where actJson has .customFields
    const actJson = { customFields: { ...rawFields } }
    const result = FEGLI_API.calculateCurrentButton(actJson, rateTable)

    return NextResponse.json(
      {
        success: true,
        contactId: contactId ?? null,
        ratesSource: 'supabase:fegli_rates_employee',
        input: rawFields,
        result: result.customFields,
        displayFields: result.displayFields,
      },
      { status: 200, headers: CORS }
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[/api/proxy/calculatecurrent] Error:', msg)
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500, headers: CORS }
    )
  }
}
