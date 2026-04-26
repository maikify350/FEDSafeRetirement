/**
 * FEGLI Intelligence Engine
 * Ported from ActCopilotExtension/fegli_api.js
 * Rate table fields: age_min, age_max, basic, opt_a, opt_b, opt_c
 */

export interface FegliRateBand {
  age_min: number
  age_max: number
  basic: number
  opt_a: number
  opt_b: number
  opt_c: number
}

export interface FegliCustomFields {
  age?: string | number
  cust_age_033220843?: string | number // alias — normalized to `age`
  salaryamount?: string | number
  feglicodeactive?: string
  fegliperpayperiod?: string | number
  basiclife?: string
  optiona?: boolean | string
  optionb?: string | number
  optionc?: string | number
  [key: string]: unknown
}

export interface FegliResult {
  customFields: FegliCustomFields
}

function calculateBIA(salary: number): { base: number; total: number } {
  const roundedBase = Math.ceil(salary / 1000) * 1000
  return { base: roundedBase, total: roundedBase + 2000 }
}

export function getOPMLetter(hasA: boolean, bMult: number, hasC: boolean): string {
  const map: Record<number, string[]> = {
    0: ['C', 'D', 'E', 'F'],
    1: ['G', 'H', 'I', 'J'],
    2: ['K', 'L', 'M', 'N'],
    3: ['9', 'P', 'Q', 'R'],
    4: ['S', 'T', 'U', 'V'],
    5: ['W', 'X', 'Y', 'Z'],
  }
  const col = !hasA && !hasC ? 0 : hasA && !hasC ? 1 : !hasA && hasC ? 2 : 3
  return map[bMult][col]
}

function getComponentsFromLetter(letter: string): { bMult: number; hasA: boolean; hasC: boolean } {
  let bMult = 0
  if ('CDEF'.includes(letter)) bMult = 0
  else if ('GHIJ'.includes(letter)) bMult = 1
  else if ('KLMN'.includes(letter)) bMult = 2
  else if ('9PQR'.includes(letter)) bMult = 3
  else if ('STUV'.includes(letter)) bMult = 4
  else if ('WXYZ'.includes(letter)) bMult = 5

  const hasA = 'DFHJLNPRTVXZ'.includes(letter)
  const hasC = 'EFIJMNQRUVYZ'.includes(letter)
  return { bMult, hasA, hasC }
}

function decipherActiveCode(
  salary: number,
  age: number,
  biWeeklyCost: number,
  rateTable: FegliRateBand[]
): string {
  const rates = rateTable.find(r => age >= r.age_min && age <= r.age_max)
  if (!rates) return 'C0'

  const bia = calculateBIA(salary)
  const basicPrem = (bia.total / 1000) * rates.basic

  let bestMatch = 'C0'
  let minDiff = 9999

  for (let b = 0; b <= 5; b++) {
    for (let c = 0; c <= 5; c++) {
      for (let a = 0; a <= 1; a++) {
        const hasA = a === 1
        const hasC = c > 0
        const test =
          basicPrem +
          a * rates.opt_a +
          b * (bia.base / 1000) * rates.opt_b +
          c * rates.opt_c

        if (test > biWeeklyCost + 0.05) continue
        const diff = biWeeklyCost - test
        if (diff < minDiff) {
          minDiff = diff
          bestMatch = getOPMLetter(hasA, b, hasC) + c
        }
      }
    }
  }
  return bestMatch
}

/** Strip currency symbols/commas then parse as float */
function parseCurrency(val: string | number | undefined): number {
  return parseFloat(String(val ?? '0').replace(/[$,]/g, '')) || 0
}

export function executeFegliCalculation(
  customFields: FegliCustomFields,
  rateTable: FegliRateBand[]
): FegliResult {
  const fields = { ...customFields }

  // Normalize age alias
  if (fields.cust_age_033220843 !== undefined && fields.age === undefined) {
    fields.age = fields.cust_age_033220843
  }

  const salary = parseCurrency(fields.salaryamount)
  const age = parseInt(String(fields.age ?? '0'), 10) || 0
  const biWeeklyCost = parseCurrency(fields.fegliperpayperiod)
  const existingCode = String(fields.feglicodeactive ?? '').trim()

  // Resolve FEGLI code
  let finalCode = 'C0'
  if (existingCode !== '') {
    finalCode = existingCode.toUpperCase()
  } else if (biWeeklyCost > 0) {
    finalCode = decipherActiveCode(salary, age, biWeeklyCost, rateTable)
  }

  const bia = calculateBIA(salary)
  const codeInfo = getComponentsFromLetter(finalCode[0])
  const cMult = parseInt(finalCode[1]) || 0

  // Calculate premiums from rate table (mirrors fegli_api.js calculateCurrentButton)
  const rates = rateTable.find(r => age >= r.age_min && age <= r.age_max)
  const basicPremium = rates ? (bia.total / 1000) * rates.basic : 0
  const optAPremium  = rates && codeInfo.hasA ? rates.opt_a : 0
  const optBPremium  = rates ? codeInfo.bMult * (bia.base / 1000) * rates.opt_b : 0
  const optCPremium  = rates ? cMult * rates.opt_c : 0
  const currentCost  = Math.round((basicPremium + optAPremium + optBPremium + optCPremium) * 100) / 100

  fields.feglicodeactive = finalCode
  fields.feglinetcost = currentCost.toFixed(2)
  fields.basiclife = bia.total.toFixed(2)
  fields.optiona = codeInfo.hasA
  fields.optionb = codeInfo.bMult.toString()
  fields.optionc = cMult.toString()

  return { customFields: fields }
}
