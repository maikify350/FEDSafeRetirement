/**
 * debug_pdf_fill.mjs  –  node debug_pdf_fill.mjs
 *
 * Mirrors production route logic EXACTLY including:
 *   - Fetch mapping from Supabase (as production now does)
 *   - Override loadDocumentFieldMap with Supabase data
 *   - fieldIndex for leading-space AcroForm names
 */

import { writeFileSync } from 'fs'
import { createRequire } from 'module'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const require = createRequire(import.meta.url)

const HAL_UUID      = '2840103a-4d74-44c5-a5f3-01f708d34d30'
const VERCEL_BASE   = 'https://fedsafe-retirement.vercel.app'
const FORM_KEY      = 'sf2809'
const SUPABASE_FORM = 'SF-2809'

// ── Load Chris's API ──────────────────────────────────────────────────────────
const PDF_Preparer_API = require('./src/lib/pdfgen/cowboy_pdf_preparer_api.js')

// ── STEP 1: Fetch Hal's act-full data ────────────────────────────────────────
console.log('\n══ STEP 1: act-full for Hal ══')
const actRes = await fetch(`${VERCEL_BASE}/api/blueprint/act-full?contactId=${HAL_UUID}`)
const actFullData = await actRes.json()
if (!actFullData.success) { console.error('act-full failed:', actFullData.error); process.exit(1) }
console.log(`  fields: ${Object.keys(actFullData.fields).length}  |  lastname: ${actFullData.fields.lastname}`)

// ── STEP 2: Fetch mapping from Supabase (exactly like production) ─────────────
console.log('\n══ STEP 2: Fetch mapping from Supabase ══')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const dbRes  = await fetch(
  `${supabaseUrl}/rest/v1/forms?form_id=eq.${encodeURIComponent(SUPABASE_FORM)}&select=form_id,form_url,mapping&limit=1`,
  { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Accept: 'application/json' } }
)
const dbRows    = await dbRes.json()
const formRecord = dbRows?.[0]
console.log(`  form_id:  ${formRecord?.form_id}`)
console.log(`  form_url: ${formRecord?.form_url}`)
console.log(`  mapping type:  ${typeof formRecord?.mapping}`)
console.log(`  mapping isArr: ${Array.isArray(formRecord?.mapping)}`)
console.log(`  mapping length: ${Array.isArray(formRecord?.mapping) ? formRecord.mapping.length : 'N/A'}`)
if (Array.isArray(formRecord?.mapping)) {
  console.log('  First 3 mapping rows:', formRecord.mapping.slice(0, 3))
}

// ── STEP 3: Inject mapping into Chris's API (like production) ─────────────────
console.log('\n══ STEP 3: Inject mapping + run prefill ══')
const mappingRows = Array.isArray(formRecord?.mapping) ? formRecord.mapping : []
if (mappingRows.length === 0) {
  console.error('  ❌ EMPTY MAPPING — Supabase mapping column is null or empty!')
  process.exit(1)
}
PDF_Preparer_API.loadDocumentFieldMap = function (_mapFileName) {
  console.log(`  [loadDocumentFieldMap called with: ${_mapFileName}] → returning ${mappingRows.length} Supabase rows`)
  return mappingRows
}

const prefill = PDF_Preparer_API.buildSf2809Prefill(actFullData)
console.log(`  totalFields: ${prefill.totalFields}  mapped: ${prefill.mappedFieldCount}  populated: ${prefill.populatedFieldCount}`)
console.log('  Populated:')
for (const [k, v] of Object.entries(prefill.mappedFields)) {
  console.log(`    "${k}"  →  "${v}"`)
}

// ── STEP 4: Download template ─────────────────────────────────────────────────
console.log('\n══ STEP 4: Download PDF ══')
const pdfRes  = await fetch(formRecord.form_url)
const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer())
console.log(`  ✓ ${pdfBytes.length.toLocaleString()} bytes`)

// ── STEP 5: Fill with fieldIndex ──────────────────────────────────────────────
console.log('\n══ STEP 5: Fill ══')
const pdfDoc  = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
const pdfForm = pdfDoc.getForm()

const fieldIndex = new Map()
for (const f of pdfForm.getFields()) {
  const actual  = f.getName()
  const trimmed = actual.trim()
  if (!fieldIndex.has(trimmed)) fieldIndex.set(trimmed, actual)
  if (!fieldIndex.has(actual))  fieldIndex.set(actual,  actual)
}

let filled = 0, skipped = 0
for (const [csvKey, value] of Object.entries(prefill.mappedFields)) {
  const actualName = fieldIndex.get(csvKey) ?? fieldIndex.get(csvKey.trim())
  if (!actualName) { console.log(`  SKIP  "${csvKey}"`); skipped++; continue }
  try {
    const type = pdfForm.getField(actualName).constructor.name
    if (type === 'PDFTextField') { pdfForm.getTextField(actualName).setText(String(value)); filled++ }
    else if (type === 'PDFRadioGroup') { try { pdfForm.getRadioGroup(actualName).select(value); filled++ } catch {} }
    else if (type === 'PDFCheckBox') {
      if (['Yes','true','On','X'].includes(String(value))) pdfForm.getCheckBox(actualName).check()
      else pdfForm.getCheckBox(actualName).uncheck()
      filled++
    }
    console.log(`  FILL  "${actualName}"  ←  "${value}"`)
  } catch (e) { console.log(`  ERR   "${csvKey}": ${e.message}`) }
}
console.log(`\n  Filled: ${filled}  |  Skipped: ${skipped}`)

// Step 1: build appearances with embedded font
// Step 2: flatten bakes them into static page content
try {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  pdfForm.updateFieldAppearances(font)
  pdfForm.flatten()
} catch {
  try { pdfForm.flatten() } catch { console.log('  [flatten skipped]') }
}

// ── STEP 6: Save & open ──────────────────────────────────────────────────────
const outPath = path.join(__dirname, `debug_sf2809_${Date.now()}.pdf`)
writeFileSync(outPath, await pdfDoc.save())
console.log(`\n  Saved → ${outPath}`)
exec(`start "" "${outPath}"`)
console.log('  Opening PDF...\n')
