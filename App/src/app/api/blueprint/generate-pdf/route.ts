/**
 * POST /api/blueprint/generate-pdf
 *
 * Accepts: { contactId, form, options? }
 * Fetches client data from act-full, runs Chris's PDF_Preparer_API prefill
 * function, fills the PDF template via pdf-lib, and returns base64 PDF.
 */

import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { PDFDocument, StandardFonts } from 'pdf-lib'

// ── Chris's PDF Preparer API ────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDF_Preparer_API = require('@/lib/pdfgen/cowboy_pdf_preparer_api.js')

// Override loadDocumentFieldMap to read from public/pdfmaps/ at runtime.
// Vercel serves process.cwd() as the project root; public/ is always included.
// Inline CSV line parser — handles quoted fields with embedded commas.
// We cannot use PDF_Preparer_API.parseCsvLine because it doesn't exist on the object.
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = '', inQuote = false
  for (const ch of line) {
    if (ch === '"')                  inQuote = !inQuote
    else if (ch === ',' && !inQuote) { result.push(cur); cur = '' }
    else                             cur += ch
  }
  result.push(cur)
  return result
}

PDF_Preparer_API.loadDocumentFieldMap = function (mapFileName: string) {
  const mapPath = path.join(process.cwd(), 'public', 'pdfmaps', mapFileName)
  const csvText = fs.readFileSync(mapPath, 'utf8')
  const lines   = csvText.split(/\r?\n/).filter((l: string) => l.trim() !== '')

  return lines.slice(1).map((line: string) => {
    const parts    = parseCsvLine(line)
    const pdfField = (parts[0] ?? '').trim()
    const crmField = (parts[1] ?? '').trim()
    return { pdfField, crmField }
  })
}

// ── CORS headers ────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const

// ── Form key normalization ───────────────────────────────────────────────────
const FORM_KEY_MAP: Record<string, string> = {
  'W4P':      'fw4p',
  'FW4P':     'fw4p',
  'FW-4P':    'fw4p',
  'SF-2809':  'sf2809',
  'SF2809':   'sf2809',
  'SF-2818':  'sf2818',
  'SF2818':   'sf2818',
  'SF-2823':  'sf2823',
  'SF2823':   'sf2823',
  'SF-3102':  'sf3102',
  'SF3102':   'sf3102',
  'SF-3107':  'sf3107',
  'SF3107':   'sf3107',
  'SF-3107-2':'sf3107',
  'SF-3108':  'sf3108',
  'SF3108':   'sf3108',
}

// Prefill function dispatch
function callPrefill(formKey: string, actData: unknown) {
  switch (formKey) {
    case 'fw4p':   return PDF_Preparer_API.buildFw4pPrefill(actData)
    case 'sf2809': return PDF_Preparer_API.buildSf2809Prefill(actData)
    case 'sf2818': return PDF_Preparer_API.buildSf2818Prefill(actData)
    case 'sf2823': return PDF_Preparer_API.buildSf2823Prefill(actData)
    case 'sf3102': return PDF_Preparer_API.buildSf3102Prefill(actData)
    case 'sf3107': return PDF_Preparer_API.buildSf3107Prefill(actData)
    case 'sf3108': return PDF_Preparer_API.buildSf3108Prefill(actData)
    default: throw new Error(`Unknown formKey: ${formKey}`)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  // ── Parse request ──────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body', code: 'INVALID_JSON' },
      { status: 400, headers: CORS },
    )
  }

  const contactId = (body.contactId as string | undefined)?.trim()
  const formRaw   = (body.form      as string | undefined)?.trim().toUpperCase()

  if (!contactId || !formRaw) {
    return NextResponse.json(
      { success: false, error: 'Missing required: contactId and form', code: 'MISSING_PARAMS' },
      { status: 400, headers: CORS },
    )
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(contactId)) {
    return NextResponse.json(
      { success: false, error: `Invalid contactId: "${contactId}"`, code: 'INVALID_CONTACT_ID' },
      { status: 400, headers: CORS },
    )
  }

  const formKey = FORM_KEY_MAP[formRaw]
  if (!formKey) {
    return NextResponse.json(
      {
        success: false,
        error:   `Unknown form "${formRaw}". Valid: ${Object.keys(FORM_KEY_MAP).join(', ')}`,
        code:    'UNKNOWN_FORM',
      },
      { status: 400, headers: CORS },
    )
  }

  // ── 1. Fetch client data from act-full ─────────────────────────────────────
  const origin = req.nextUrl.origin
  let actFullData: Record<string, unknown>

  try {
    const res = await fetch(
      `${origin}/api/blueprint/act-full?contactId=${encodeURIComponent(contactId)}`,
      { signal: AbortSignal.timeout(30_000) },
    )
    actFullData = await res.json() as Record<string, unknown>

    if (!actFullData.success) {
      return NextResponse.json(
        { success: false, error: `ACT lookup failed: ${actFullData.error ?? 'unknown'}`, code: 'CONTACT_NOT_FOUND' },
        { status: 404, headers: CORS },
      )
    }
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: `Failed to fetch client: ${e instanceof Error ? e.message : String(e)}`, code: 'ACT_FETCH_ERROR' },
      { status: 502, headers: CORS },
    )
  }

  // ── 2. Fetch form record from Supabase (mapping + form_url in one query) ───
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!

  // Maps internal formKey → actual form_id stored in Supabase
  const FORM_ID_MAP: Record<string, string> = {
    fw4p:   'W4P',        // Supabase uses W4P
    sf2809: 'SF-2809',
    sf2818: 'SF-2818',
    sf2823: 'SF-2823',
    sf3102: 'SF-3102',
    sf3107: 'SF-3107-2',  // Supabase uses SF-3107-2
    sf3108: 'SF-3108',
  }
  const supabaseFormId = FORM_ID_MAP[formKey]

  type FormRow = { form_id: string; form_url: string | null; mapping: { pdfField: string; crmField: string }[] | null }
  let formRecord: FormRow

  try {
    const formsRes = await fetch(
      `${supabaseUrl}/rest/v1/forms?form_id=eq.${encodeURIComponent(supabaseFormId)}&select=form_id,form_url,mapping&limit=1`,
      {
        headers: {
          apikey:        supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept:        'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      },
    )
    const rows = await formsRes.json() as FormRow[]
    formRecord = rows?.[0]
    if (!formRecord) throw new Error(`No Supabase record for form_id "${supabaseFormId}"`)
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: `Supabase lookup failed: ${e instanceof Error ? e.message : String(e)}`, code: 'SUPABASE_FETCH_ERROR' },
      { status: 502, headers: CORS },
    )
  }

  // ── 3. Inject mapping into Chris's API (no filesystem) ─────────────────────
  // Override loadDocumentFieldMap with the mapping rows from Supabase.
  // This is synchronous — Chris's prefill functions call it internally.
  const mappingRows = Array.isArray(formRecord.mapping) ? formRecord.mapping : []
  PDF_Preparer_API.loadDocumentFieldMap = function (_mapFileName: string) {
    return mappingRows
  }

  // ── 4. Run Chris's prefill function ────────────────────────────────────────
  let prefillResult: {
    mappedFields:      Record<string, string>
    unmappedFields:    string[]
    mappedFieldCount:  number
    populatedFieldCount: number
    totalFields:       number
  }

  try {
    prefillResult = callPrefill(formKey, actFullData)
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: `Prefill failed: ${e instanceof Error ? e.message : String(e)}`, code: 'PREFILL_ERROR' },
      { status: 500, headers: CORS },
    )
  }

  // ── 5. Download PDF template from Supabase storage ─────────────────────────
  if (!formRecord.form_url) {
    return NextResponse.json(
      {
        success:      false,
        error:        `No PDF template registered in Supabase for "${supabaseFormId}"`,
        code:         'TEMPLATE_NOT_FOUND',
        mappedFields: prefillResult.mappedFields,
        meta: {
          totalFields:      prefillResult.totalFields,
          mappedFieldCount: prefillResult.mappedFieldCount,
          populatedCount:   prefillResult.populatedFieldCount,
          unmappedFields:   prefillResult.unmappedFields,
        },
      },
      { status: 404, headers: CORS },
    )
  }

  let pdfBytes: Uint8Array
  try {
    const pdfRes = await fetch(formRecord.form_url, { signal: AbortSignal.timeout(30_000) })
    if (!pdfRes.ok) throw new Error(`Template download HTTP ${pdfRes.status}`)
    pdfBytes = new Uint8Array(await pdfRes.arrayBuffer())
  } catch (e: unknown) {
    return NextResponse.json(
      {
        success:      false,
        error:        `Template fetch error: ${e instanceof Error ? e.message : String(e)}`,
        code:         'TEMPLATE_FETCH_ERROR',
        mappedFields: prefillResult.mappedFields,
      },
      { status: 502, headers: CORS },
    )
  }

  // ── 4. Detect XFA vs AcroForm and fill accordingly ─────────────────────────
  const fields     = actFullData.fields as Record<string, unknown>
  const lastName   = String(fields?.lastname  ?? '').replace(/[^a-zA-Z0-9 ]/g, '')
  const firstName  = String(fields?.firstname ?? '').replace(/[^a-zA-Z0-9 ]/g, '')
  const formLabel  = formRaw
  const dateTag    = new Date().toISOString().slice(0,16).replace('T','_').replace(':','-')
  const fileName   = `${lastName}, ${firstName} ${formLabel} ${dateTag}.pdf`
  const storagePath = `filled-forms/${contactId}-${formLabel}-${dateTag}.pdf`

  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
    const form   = pdfDoc.getForm()
    const allFields = form.getFields()

    // Detect XFA: if fields exist but ALL have non-printable names, it's XFA-encrypted
    const printableRe = /^[\x20-\x7E]+$/
    const printableCount = allFields.filter(f => printableRe.test(f.getName())).length
    const isXfa = allFields.length > 0 && printableCount === 0
    const isNoFields = allFields.length === 0

    let filledBytes: Uint8Array
    let actualFilled = 0
    let fillEngine = 'pdf-lib'

    if (isXfa || isNoFields) {
      // ── XFA Path: delegate to Python /api/fill-xfa ──────────────────────────
      fillEngine = 'pypdf'
      // Use the stable production domain — VERCEL_URL may point to preview deployments
      const selfOrigin = 'https://fedsafe-retirement.vercel.app'

      const xfaRes = await fetch(`${selfOrigin}/api/fill-xfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateUrl: formRecord.form_url,
          mappedFields: prefillResult.mappedFields,
        }),
        signal: AbortSignal.timeout(55_000),
      })

      const xfaData = await xfaRes.json() as {
        success: boolean; filledBytes?: string; actualFilled?: number; error?: string
      }

      if (!xfaData.success || !xfaData.filledBytes) {
        return NextResponse.json(
          { success: false, error: `XFA fill failed: ${xfaData.error ?? 'unknown'}`, code: 'XFA_FILL_ERROR' },
          { status: 500, headers: CORS },
        )
      }

      filledBytes = new Uint8Array(Buffer.from(xfaData.filledBytes, 'base64'))
      actualFilled = xfaData.actualFilled ?? 0

    } else {
      // ── AcroForm Path: use pdf-lib (existing logic) ─────────────────────────
      const fieldIndex = new Map<string, string>()
      for (const f of allFields) {
        const actual  = f.getName()
        const trimmed = actual.trim()
        if (!fieldIndex.has(trimmed)) fieldIndex.set(trimmed, actual)
        if (!fieldIndex.has(actual))  fieldIndex.set(actual, actual)
      }

      for (const [key, val] of Object.entries(prefillResult.mappedFields)) {
        const actualName = fieldIndex.get(key) ?? fieldIndex.get(key.trim())
        if (!actualName) continue
        const strVal = String(val)
        let filled = false
        if (!filled) try { form.getTextField(actualName).setText(strVal);  filled = true } catch { /* not text */ }
        if (!filled) try {
          const cb = form.getCheckBox(actualName)
          ;['Yes','true','On','X'].includes(strVal) ? cb.check() : cb.uncheck()
          filled = true
        } catch { /* not checkbox */ }
        if (!filled) try { form.getRadioGroup(actualName).select(strVal); filled = true } catch { /* not radio */ }
        if (!filled) try { form.getDropdown(actualName).select(strVal);   filled = true } catch { /* not dropdown */ }
        if (filled) actualFilled++
      }

      // Fill → save → reload → flatten (ensures appearance streams are encoded)
      const intermediate = await pdfDoc.save()
      const pdfDoc2 = await PDFDocument.load(intermediate, { ignoreEncryption: true })
      try { pdfDoc2.getForm().flatten() } catch { /* non-fatal */ }
      filledBytes = await pdfDoc2.save()
    }

    // ── 5. Upload filled PDF to Supabase Storage → return public URL ──────────
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/Forms/${storagePath}`,
      {
        method:  'POST',
        headers: {
          apikey:          supabaseKey,
          Authorization:   `Bearer ${supabaseKey}`,
          'Content-Type':  'application/pdf',
          'Cache-Control': 'no-cache',
        },
        body: Buffer.from(filledBytes),
        signal: AbortSignal.timeout(30_000),
      }
    )

    const publicUrl = uploadRes.ok
      ? `${supabaseUrl}/storage/v1/object/public/Forms/${storagePath}`
      : null

    return NextResponse.json(
      {
        success:    true,
        form:       formRaw,
        contactId,
        clientName: `${lastName}, ${firstName}`,
        fileName,
        url:  publicUrl,
        meta: {
          totalFields:       prefillResult.totalFields,
          mappedFieldCount:  prefillResult.mappedFieldCount,
          populatedCount:    prefillResult.populatedFieldCount,
          actualFilled,
          fillEngine,
          uploaded:          uploadRes.ok,
          uploadStatus:      uploadRes.status,
        },
      },
      { status: 200, headers: CORS },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: `PDF fill error: ${e instanceof Error ? e.message : String(e)}`, code: 'PDF_FILL_ERROR' },
      { status: 500, headers: CORS },
    )
  }
}
