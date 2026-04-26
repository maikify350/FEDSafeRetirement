/**
 * POST /api/proxy/calculatefinal
 *
 * Full retirement income projection — the "Final Calculation" button.
 * Runs Chris's PDF_Preparer_API.executeFinalCalculation() which computes
 * FERS pension, Social Security, TSP distribution, FEGLI, federal/state
 * taxes, survivor benefits, insurance deductions, and income gap analysis.
 *
 * Requires 6 rate/tax data sources:
 *   1. fegli_rates_employee       (Supabase)
 *   2. fegli_rates_annuitant      (Supabase)
 *   3. federal tax brackets       (bundled JSON — TODO: migrate to Supabase)
 *   4. state income tax rates     (bundled JSON)
 *   5. state retirement tax rules (bundled JSON)
 *
 * CORS: open to all origins so the Chrome extension on Act.com can reach it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import path from 'path'
import fs from 'fs'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDF_Preparer_API = require('@/lib/pdfgen/cowboy_pdf_preparer_api.js')

// CORS headers
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

/**
 * Load a bundled JSON rate file from the pdfgen directory.
 * Vercel bundles files relative to the source, so we resolve from __dirname
 * with a fallback to process.cwd() for local dev.
 */
function loadBundledJson(filename: string): unknown[] {
  const candidates = [
    path.resolve(process.cwd(), 'src/lib/pdfgen', filename),
    path.resolve(__dirname, '..', '..', '..', '..', 'lib/pdfgen', filename),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'))
    }
  }
  throw new Error(`Bundled rate file not found: ${filename}`)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customFields: rawFields, contactId, actJson: rawActJson } = body ?? {}

    // Accept either raw actJson (full ACT shape) or just customFields
    const actJson = rawActJson
      ? rawActJson
      : rawFields
        ? { customFields: { ...rawFields } }
        : null

    if (!actJson) {
      return NextResponse.json(
        { success: false, error: 'Missing customFields or actJson in request body' },
        { status: 400, headers: CORS }
      )
    }

    // Fetch FEGLI rate tables from Supabase
    const admin = createAdminClient()

    const [empResult, annResult] = await Promise.all([
      admin.from('fegli_rates_employee')
        .select('age_min, age_max, basic, opt_a, opt_b, opt_c')
        .order('age_min', { ascending: true }),
      admin.from('fegli_rates_annuitant')
        .select('age_min, age_max, basic_75, basic_50, basic_0, opt_a, opt_b, opt_c')
        .order('age_min', { ascending: true }),
    ])

    if (empResult.error || !empResult.data) {
      throw new Error(`Employee rates: ${empResult.error?.message ?? 'no data'}`)
    }
    if (annResult.error || !annResult.data) {
      throw new Error(`Annuitant rates: ${annResult.error?.message ?? 'no data'}`)
    }

    // Load bundled tax rate files
    const stateTaxRates = loadBundledJson('state_income_tax_rates.json')
    const stateRetirementTaxRules = loadBundledJson('state_retirement_tax_rules.json')

    // Federal tax brackets — currently empty array (TODO: create Supabase table)
    // The calculation still works — it just uses 0% federal marginal rate
    const federalTaxBrackets: unknown[] = []

    // Run Chris's full retirement calculation engine
    const result = PDF_Preparer_API.executeFinalCalculation(
      actJson,
      empResult.data,        // employee FEGLI rates
      annResult.data,        // annuitant FEGLI rates
      federalTaxBrackets,    // federal tax brackets
      stateTaxRates,         // state income tax rates
      stateRetirementTaxRules // state retirement tax rules
    )

    return NextResponse.json(
      {
        success: true,
        contactId: contactId ?? null,
        ratesSource: {
          fegli_employee: 'supabase:fegli_rates_employee',
          fegli_annuitant: 'supabase:fegli_rates_annuitant',
          federal_tax: 'TODO:supabase (currently empty)',
          state_tax: 'bundled:state_income_tax_rates.json',
          state_retirement: 'bundled:state_retirement_tax_rules.json',
        },
        result: result.customFields,
        displayFields: result.displayFields,
        stateTaxGuidance: result.stateTaxGuidance,
        fieldList: result.fieldList,
      },
      { status: 200, headers: CORS }
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[/api/proxy/calculatefinal] Error:', msg)
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500, headers: CORS }
    )
  }
}
