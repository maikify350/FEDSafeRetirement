/**
 * FEDSafe Retirement — FOIA Data Import Script
 *
 * Reads the FOIA 2025 USPS Employee Roster Excel file and imports
 * 472,576 records into the Supabase `leads` table in batches of 1,000.
 *
 * Usage: node import-foia-data.mjs
 */

import XLSX from 'xlsx'

const { readFile, utils } = XLSX
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ── Config ────────────────────────────────────────────────────────────────────
const BATCH_SIZE = 500
const SKIP_ROWS = 122000  // Resume from this row (already imported)
const EXCEL_PATH = resolve(__dirname, '../DataSeed/00 FOIA 2025 PO REVISED.xlsx')

// Load env from .env file
const envPath = resolve(__dirname, '.env')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()

  if (!trimmed || trimmed.startsWith('#')) return

  const eqIdx = trimmed.indexOf('=')

  if (eqIdx === -1) return
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
})

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or ANON_KEY in .env')
  process.exit(1)
}

console.log(`📁 Excel file: ${EXCEL_PATH}`)
console.log(`🌐 Supabase URL: ${SUPABASE_URL}`)

// ── Supabase Client — authenticate as the admin user ──────────────────────────
const supabase = createClient(SUPABASE_URL, ANON_KEY)

// Sign in as the admin user to pass RLS
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'rgarcia350@gmail.com',
  password: 'FedSafe2026!',
})

if (authError) {
  console.error('❌ Auth failed:', authError.message)
  process.exit(1)
}

console.log(`✅ Authenticated as: ${authData.user.email}`)

// ── Column Mapping ────────────────────────────────────────────────────────────
function mapRow(row) {
  // Normalize keys — Excel columns may have extra spaces or inconsistent casing
  const r = {}

  for (const [k, v] of Object.entries(row)) {
    r[k.trim().toUpperCase()] = v
  }

  const firstName = (r['FIRST NAME'] || '').toString().trim()
  const lastName = (r['LAST NAME'] || '').toString().trim()
  const middleInitial = (r['MIDDLE INITIAL'] || r['MI'] || '').toString().trim()
  const occupationTitle = (r['OCCUPATION TITLE'] || '').toString().trim()
  const gradeLevel = (r['GRADE LEVEL'] || '').toString().trim()
  const annualSalary = parseFloat(r['ANNUAL SALARY'] || 0) || 0
  const hourlyRate = parseFloat(r['HOURLY RATE'] || 0) || 0
  const facilityName = (r['FACILITY NAME'] || '').toString().trim()
  const facilityAddress = (r['FACILITY ADDRESS'] || '').toString().trim()
  const facilityCity = (r['FACILITY CITY'] || '').toString().trim()
  const facilityState = (r['FACILITY STATE'] || '').toString().trim()
  const facilityZip = (r['FACILITY ZIP CODE'] || '').toString().trim()

  // Parse duty date — Excel might give us a number (serial date) or a string
  let enteredOnDutyDate = null
  const rawDate = r['ENTERED ON DUTY DATE'] || null

  if (rawDate) {
    if (typeof rawDate === 'number') {
      const excelEpoch = new Date(1899, 11, 30)

      enteredOnDutyDate = new Date(excelEpoch.getTime() + rawDate * 86400000).toISOString().split('T')[0]
    } else {
      const parsed = new Date(rawDate)

      if (!isNaN(parsed.getTime())) {
        enteredOnDutyDate = parsed.toISOString().split('T')[0]
      }
    }
  }

  // Compute years of service
  let yearsOfService = null

  if (enteredOnDutyDate) {
    const dutyDate = new Date(enteredOnDutyDate)
    const now = new Date()
    const diff = (now.getTime() - dutyDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)

    yearsOfService = Math.round(diff * 10) / 10
  }

  return {
    first_name: firstName,
    last_name: lastName,
    middle_initial: middleInitial,
    occupation_title: occupationTitle,
    grade_level: gradeLevel,
    annual_salary: Math.round(annualSalary),
    hourly_rate: hourlyRate,
    facility_name: facilityName,
    facility_address: facilityAddress,
    facility_city: facilityCity,
    facility_state: facilityState,
    facility_zip_code: facilityZip,
    entered_on_duty_date: enteredOnDutyDate,
    years_of_service: yearsOfService,
    source_file: '00 FOIA 2025 PO REVISED.xlsx',
    cre_by: 'admin',
    mod_by: 'admin',
  }
}

// ── Main Import ───────────────────────────────────────────────────────────────
async function main() {
  console.log('\n📖 Reading Excel file...')
  const workbook = readFile(EXCEL_PATH)
  const sheetName = workbook.SheetNames[0]

  console.log(`📄 Sheet: "${sheetName}"`)

  const sheet = workbook.Sheets[sheetName]
  const rows = utils.sheet_to_json(sheet)
  const totalRows = rows.length

  console.log(`📊 Total rows: ${totalRows.toLocaleString()}`)

  // Preview first row for column mapping validation
  if (rows.length > 0) {
    console.log('\n🔍 First row columns:', Object.keys(rows[0]))
    console.log('🔍 First row mapped:', JSON.stringify(mapRow(rows[0]), null, 2))
  }

  // Check current count
  const { count: existingCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })

  console.log(`\n📦 Existing leads in database: ${(existingCount || 0).toLocaleString()}`)

  if (SKIP_ROWS > 0) {
    console.log(`⏭️  Skipping first ${SKIP_ROWS.toLocaleString()} rows (already imported)`)
  }

  // Import in batches
  const remainingRows = rows.slice(SKIP_ROWS)
  const totalRemaining = remainingRows.length
  const totalBatches = Math.ceil(totalRemaining / BATCH_SIZE)
  let inserted = 0
  let errors = 0
  const startTime = Date.now()

  console.log(`\n🚀 Starting import: ${totalRemaining.toLocaleString()} remaining rows in ${totalBatches} batches of ${BATCH_SIZE}`)
  console.log('─'.repeat(60))

  for (let i = 0; i < totalRemaining; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const batch = remainingRows.slice(i, i + BATCH_SIZE).map(mapRow)

    let success = false

    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error } = await supabase
        .from('leads')
        .insert(batch)

      if (!error) {
        inserted += batch.length
        success = true
        break
      }

      if (attempt < 3) {
        // Wait before retry (exponential backoff)
        await new Promise(r => setTimeout(r, attempt * 2000))
      } else {
        errors += batch.length
        console.error(`\n❌ Batch ${batchNum}/${totalBatches} FAILED after 3 attempts: ${error.message}`)
      }
    }

    if (success) {
      const pct = ((batchNum / totalBatches) * 100).toFixed(1)
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
      const rate = (inserted / (elapsed || 1)).toFixed(0)

      process.stdout.write(
        `\r  ✅ Batch ${batchNum}/${totalBatches} | ${(inserted + SKIP_ROWS).toLocaleString()} total | ${pct}% | ${elapsed}s | ${rate} rows/s`
      )
    }
  }

  console.log('\n' + '─'.repeat(60))

  // Final count verification
  const { count: finalCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log(`\n📊 Import Summary:`)
  console.log(`   Total rows in Excel: ${totalRows.toLocaleString()}`)
  console.log(`   Successfully inserted: ${inserted.toLocaleString()}`)
  console.log(`   Errors: ${errors.toLocaleString()}`)
  console.log(`   Final DB count: ${(finalCount || 0).toLocaleString()}`)
  console.log(`   Time: ${elapsed}s`)
  console.log(`   Rate: ${(inserted / (elapsed || 1)).toFixed(0)} rows/s`)
  console.log('\n✅ Import complete!')
}

main().catch(err => {
  console.error('💥 Fatal error:', err)
  process.exit(1)
})
