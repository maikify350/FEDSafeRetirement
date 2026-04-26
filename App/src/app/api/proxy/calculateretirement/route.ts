/**
 * POST /api/proxy/calculateretirement
 *
 * FEGLI "retirement projection" calculation endpoint — callable from Act! CRM
 * Copilot extension. Fetches annuitant rate table from Supabase, then runs
 * Chris's FEGLI_API.calculateRetirementButton() for the actual calculation.
 *
 * Required fields: salaryamount, feglicostage (retirement age), feglireduction
 * Optional: optiona_retire, optionb_retire, optionc_retire
 *
 * CORS: open to all origins so the Chrome extension on Act.com can reach it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'

// @ts-expect-error — Chris's JS modules, no type declarations
import FEGLI_API from '@/lib/pdfgen/fegli_api.js'

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
    const salary = rawFields.salaryamount
    const retireAge = rawFields.feglicostage
    if (!salary || !retireAge) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          missingFields: [
            !salary ? 'Salary (salaryamount)' : null,
            !retireAge ? 'Projected FEGLI Age (feglicostage)' : null,
          ].filter(Boolean),
          received: rawFields,
        },
        { status: 422, headers: CORS }
      )
    }

    // Fetch annuitant rate table from Supabase
    const admin = createAdminClient()
    const { data: rateTable, error: rateError } = await admin
      .from('fegli_rates_annuitant')
      .select('id, age_min, age_max, basic_75, basic_50, basic_0, opt_a, opt_b, opt_c')
      .order('age_min', { ascending: true })

    if (rateError || !rateTable) {
      throw new Error(`Failed to load annuitant rate table: ${rateError?.message ?? 'no data'}`)
    }

    // Run Chris's FEGLI_API.calculateRetirementButton()
    // It expects (actJson, annuitantRateInput) where actJson has .customFields
    const actJson = { customFields: { ...rawFields } }
    const result = FEGLI_API.calculateRetirementButton(actJson, rateTable)

    return NextResponse.json(
      {
        success: true,
        contactId: contactId ?? null,
        ratesSource: 'supabase:fegli_rates_annuitant',
        input: rawFields,
        result: result.customFields,
        displayFields: result.displayFields,
      },
      { status: 200, headers: CORS }
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[/api/proxy/calculateretirement] Error:', msg)
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500, headers: CORS }
    )
  }
}
