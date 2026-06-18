/**
 * debug_pdf_fill.mjs  –  run with:  node debug_pdf_fill.mjs
 *
 * Uses Hal's live data from act-full, runs SF-2809 prefill,
 * downloads the Supabase template, and reports every field match/miss.
 */

import { readFileSync, writeFileSync } from 'fs'
import { createRequire } from 'module'
import { PDFDocument } from 'pdf-lib'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, 'App', '.env') })

const require = createRequire(import.meta.url)

const HAL_UUID      = '2840103a-4d74-44c5-a5f3-01f708d34d30'
const VERCEL_BASE   = 'https://fedsafe-retirement.vercel.app'
const FORM          = 'sf2809'

// ── Load Chris's API ─────────────────────────────────────────────────────────
const PDF_Preparer_API = require('./App/src/lib/pdfgen/cowboy_pdf_preparer_api.js')

PDF_Preparer_API.loadDocumentFieldMap = function (mapFileName) {
  const mapPath = path.join(__dirname, 'App', 'public', 'pdfmaps', mapFileName)
  const csvText = readFileSync(mapPath, 'utf8')
  const lines   = csvText.split(/\r?\n/).filter(l => l.trim() !== '')
  return lines.slice(1).map(line => {
    const [pdfField, crmField] = PDF_Preparer_API.parseCsvLine(line)
    return { pdfField, crmField: crmField || '' }
  })
}

// ── STEP 1: Fetch Hal's live act-full data ────────────────────────────────────
console.log('\n══ STEP 1: Fetching act-full for Hal ══')
const actRes = await fetch(`${VERCEL_BASE}/api/blueprint/act-full?contactId=${HAL_UUID}`)
const actFullData = await actRes.json()
if (!actFullData.success) {
  console.error('act-full failed:', actFullData.error)
  process.exit(1)
}
console.log(`  ✓ fields returned: ${Object.keys(actFullData.fields).length}`)
console.log(`  rep: ${actFullData.rep?.name}`)
console.log(`  birthday: ${actFullData.fields.birthday}`)
console.log(`  lastname:  ${actFullData.fields.lastname}`)
console.log(`  firstname: ${actFullData.fields.firstname}`)

// ── STEP 2: Run Chris's prefill ───────────────────────────────────────────────
console.log(`\n══ STEP 2: buildSf2809Prefill ══`)
let prefill
try {
  prefill = PDF_Preparer_API.buildSf2809Prefill(actFullData)
} catch (e) {
  console.error('  PREFILL ERROR:', e.message)
  process.exit(1)
}
console.log(`  totalFields:      ${prefill.totalFields}`)
console.log(`  mappedFieldCount: ${prefill.mappedFieldCount}`)
console.log(`  populatedCount:   ${prefill.populatedFieldCount}`)
console.log(`  unmappedFields:   ${prefill.unmappedFields.length}`)

console.log('\n  --- Populated mappedFields (key → value) ---')
for (const [k, v] of Object.entries(prefill.mappedFields)) {
  console.log(`    "${k}"  →  "${v}"`)
}
console.log('\n  --- CSV rows with empty CRM field (unmapped) ---')
for (const f of prefill.unmappedFields) {
  console.log(`    "${f}"`)
}

// ── STEP 3: Download SF-2809 PDF from Supabase ────────────────────────────────
console.log('\n══ STEP 3: Download SF-2809 template from Supabase ══')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseKey) { console.error('Missing Supabase env vars'); process.exit(1) }

const dbRes  = await fetch(
  `${supabaseUrl}/rest/v1/forms?form_id=eq.SF-2809&select=form_id,form_url&limit=1`,
  { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Accept: 'application/json' } }
)
const dbData     = await dbRes.json()
const formRecord = dbData?.[0]
if (!formRecord?.form_url) { console.error('No form_url for SF-2809 in Supabase'); process.exit(1) }
console.log(`  form_url: ${formRecord.form_url}`)

const pdfRes  = await fetch(formRecord.form_url)
if (!pdfRes.ok) { console.error(`Template download HTTP ${pdfRes.status}`); process.exit(1) }
const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer())
console.log(`  ✓ Downloaded ${pdfBytes.length.toLocaleString()} bytes`)

// ── STEP 4: Read actual AcroForm field names from the PDF ─────────────────────
console.log('\n══ STEP 4: AcroForm fields in the PDF ══')
const pdfDoc   = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
const pdfForm  = pdfDoc.getForm()
const pdfFields = pdfForm.getFields()
console.log(`  PDF has ${pdfFields.length} AcroForm fields:`)
for (const f of pdfFields) {
  console.log(`    [${f.constructor.name.replace('PDF','')}] "${f.getName()}"`)
}

// ── STEP 5: Match analysis ────────────────────────────────────────────────────
console.log('\n══ STEP 5: Match analysis ══')
const pdfNames = new Set(pdfFields.map(f => f.getName()))
const hits   = []
const misses = []
for (const [k, v] of Object.entries(prefill.mappedFields)) {
  if (pdfNames.has(k)) hits.push({ k, v })
  else misses.push({ k, v })
}
console.log(`  ✓ Will fill (CSV key matches PDF field): ${hits.length}`)
for (const { k, v } of hits) console.log(`      "${k}"  →  "${v}"`)
console.log(`  ✗ No match (CSV key not in PDF AcroForm): ${misses.length}`)
for (const { k, v } of misses) console.log(`      "${k}"  →  "${v}"`)

// ── STEP 6: Fill and save ─────────────────────────────────────────────────────
if (hits.length > 0) {
  console.log('\n══ STEP 6: Filling and saving PDF ══')
  for (const [fieldName, value] of Object.entries(prefill.mappedFields)) {
    try {
      const field = pdfForm.getField(fieldName)
      const type  = field.constructor.name
      if (type === 'PDFTextField') {
        field.setText(String(value))
      } else if (type === 'PDFCheckBox') {
        if (['Yes','true','On'].includes(String(value))) field.check(); else field.uncheck()
      } else if (type === 'PDFRadioGroup') {
        try { field.select(value) } catch {}
      } else if (type === 'PDFDropdown') {
        try { field.select(value) } catch {}
      }
    } catch {}
  }
  const filled  = await pdfDoc.save()
  const outPath = path.join(__dirname, 'debug_sf2809_filled.pdf')
  writeFileSync(outPath, filled)
  console.log(`  ✓ Saved → ${outPath}`)
} else {
  console.log('\n  ⚠ Zero fields matched — field names in CSV ≠ AcroForm names in PDF')
}

console.log('\n══ Done ══\n')
