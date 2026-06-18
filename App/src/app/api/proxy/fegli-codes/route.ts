/**
 * GET /api/proxy/fegli-codes
 * GET /api/proxy/fegli-codes?extended=true   — include C×4 and C×5 post-1998 codes
 *
 * Returns the list of valid OPM FEGLI 2-character codes derived from
 * OPM Benefits Administration Letter 98-210 (Dec 1998).
 *
 * The code letter is determined by 3 boolean flags:
 *   hasA   — employee elected Option A
 *   bMult  — Option B multiplier (0–5)
 *   hasC   — employee elected Option C
 * The digit is the Option C multiplier (0 = no C, 1–5).
 *
 * CORS: explicitly allows appus.act.com so the Chrome extension
 * content script can call this endpoint directly from Act! CRM pages.
 */

import { NextRequest, NextResponse } from 'next/server'

// OPM letter matrix — mirrors FEGLI_API.getOPMLetter() in fegli_api.js
// Columns: [noA_noC, hasA_noC, noA_hasC, hasA_hasC]
const OPM_LETTER_MAP: Record<number, string[]> = {
  0: ['C', 'D', 'E', 'F'],
  1: ['G', 'H', 'I', 'J'],
  2: ['K', 'L', 'M', 'N'],
  3: ['9', 'P', 'Q', 'R'],
  4: ['S', 'T', 'U', 'V'],
  5: ['W', 'X', 'Y', 'Z'],
}

function getOPMLetter(hasA: boolean, bMult: number, hasC: boolean): string {
  const col = !hasA && !hasC ? 0 : hasA && !hasC ? 1 : !hasA && hasC ? 2 : 3
  return OPM_LETTER_MAP[bMult][col]
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) {
  const extended = request.nextUrl.searchParams.get('extended') === 'true'

  const bMultipliers = [0, 1, 2, 3, 4, 5]
  const cMax = extended ? 5 : 3   // OPM 98-210 baseline caps C at ×3

  const standardCodes: string[] = []
  const codeMap: Record<string, {
    letter: string; cMult: number; bMult: number
    hasA: boolean; hasC: boolean; label: string
  }> = {}

  for (const bMult of bMultipliers) {
    for (const hasA of [false, true]) {
      // No Option C entry
      const letterNoC = getOPMLetter(hasA, bMult, false)
      const codeNoC   = `${letterNoC}0`
      if (!codeMap[codeNoC]) {
        codeMap[codeNoC] = {
          letter: letterNoC, cMult: 0, bMult, hasA, hasC: false,
          label: `Basic${bMult > 0 ? ` + B×${bMult}` : ''}${hasA ? ' + A' : ''}`,
        }
        standardCodes.push(codeNoC)
      }

      // Option C entries (×1 through cMax)
      for (let cMult = 1; cMult <= cMax; cMult++) {
        const letterC = getOPMLetter(hasA, bMult, true)
        const codeC   = `${letterC}${cMult}`
        if (!codeMap[codeC]) {
          codeMap[codeC] = {
            letter: letterC, cMult, bMult, hasA, hasC: true,
            label: `Basic${bMult > 0 ? ` + B×${bMult}` : ''}${hasA ? ' + A' : ''} + C×${cMult}`,
          }
          standardCodes.push(codeC)
        }
      }
    }
  }

  // 3 special codes from OPM BAL 98-210
  const specialCodes = [
    { code: 'A0', label: 'Ineligible for FEGLI', special: true },
    { code: 'B0', label: 'FEGLI Waived',          special: true },
    { code: '99', label: 'FEGLI Coverage Unspecified', special: true },
  ]
  for (const s of specialCodes) {
    codeMap[s.code] = {
      letter: s.code[0], cMult: parseInt(s.code[1]) || 0,
      bMult: 0, hasA: false, hasC: false, label: s.label,
    }
  }

  const allCodes = [...standardCodes, ...specialCodes.map(s => s.code)]
  const letters  = [...new Set(standardCodes.map(c => c[0]))]

  return NextResponse.json(
    {
      codes:        allCodes,
      standardCodes,
      specialCodes: specialCodes.map(s => s.code),
      letters,
      codeMap,
      total:        allCodes.length,
      extended,
      source:       'OPM BAL 98-210',
    },
    { headers: CORS_HEADERS }
  )
}
