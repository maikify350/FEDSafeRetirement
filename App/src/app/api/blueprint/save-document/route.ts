/**
 * POST /api/blueprint/save-document
 *
 * Creates a "Library Document" history entry on the specified Act! CRM contact
 * with the PDF URL stored in the `details` field. The Act! UI will show it
 * under the contact's Documents tab as a clickable link.
 *
 * Request body:
 *   { contactId: string, pdfUrl: string, fileName: string }
 *
 * Act! Web API endpoint used:
 *   POST /api/documents  (application/json, History model with historyTypeID -1)
 *
 * CORS: open to all origins so the Chrome extension on Act.com can reach it.
 */

import { NextRequest, NextResponse } from 'next/server'

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ── ACT AUTH ──────────────────────────────────────────────────────────────────

async function getActToken(
  base: string,
  username: string,
  password: string,
  database: string,
): Promise<string> {
  const creds = Buffer.from(`${username}:${password}`).toString('base64')
  const resp = await fetch(`${base}/authorize`, {
    headers: {
      Authorization: `Basic ${creds}`,
      'Act-Database-Name': database,
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!resp.ok) throw new Error(`ACT auth failed: HTTP ${resp.status}`)
  const raw = await resp.text()
  return raw.replace(/^"|"$/g, '').replace(/[\r\n]/g, '').trim()
}

// ── ROUTE HANDLER ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400, headers: CORS },
    )
  }

  const contactId = (body.contactId as string | undefined)?.trim()
  const pdfUrl    = (body.pdfUrl    as string | undefined)?.trim()
  const fileName  = (body.fileName  as string | undefined)?.trim() || 'Blueprint Report'

  if (!contactId || !pdfUrl) {
    return NextResponse.json(
      { success: false, error: 'Missing required: contactId and pdfUrl' },
      { status: 400, headers: CORS },
    )
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(contactId)) {
    return NextResponse.json(
      { success: false, error: `Invalid contactId: "${contactId}"` },
      { status: 400, headers: CORS },
    )
  }

  // ── 1. Authenticate to Act! API ────────────────────────────────────────────
  const base     = process.env.ACT_API_BASE || 'https://apius.act.com/act.web.api'
  const username = process.env.ACT_USERNAME
  const password = process.env.ACT_PASSWORD
  const database = process.env.ACT_DATABASE

  if (!username || !password || !database) {
    return NextResponse.json(
      { success: false, error: 'ACT credentials not configured' },
      { status: 503, headers: CORS },
    )
  }

  let token: string
  try {
    token = await getActToken(base, username, password, database)
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: `ACT auth failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502, headers: CORS },
    )
  }

  // ── 2. Create a Library Document entry linked to the contact ───────────────
  //    POST /api/documents with a History JSON body.
  //    historyTypeID: -1 = "Library Document" (shows under contact's Documents tab)
  //    details: the PDF public URL (clickable link in Act!)
  //    regarding: display name shown in the Documents list
  try {
    const now = new Date().toISOString()

    const docBody = {
      regarding:     fileName,
      details:       pdfUrl,
      startTime:     now,
      endTime:       now,
      duration:      '0 minutes',
      isPrivate:     false,
      historyTypeID: -1,
      contacts:      [{ id: contactId }],
    }

    const uploadRes = await fetch(`${base}/api/documents`, {
      method:  'POST',
      headers: {
        'Authorization':    `Bearer ${token}`,
        'Act-Database-Name': database,
        'Content-Type':     'application/json',
      },
      body:   JSON.stringify(docBody),
      signal: AbortSignal.timeout(15_000),
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '')
      return NextResponse.json(
        {
          success: false,
          error:   `Act! document save failed: HTTP ${uploadRes.status}`,
          detail:  errText.slice(0, 500),
        },
        { status: uploadRes.status, headers: CORS },
      )
    }

    const result = await uploadRes.json().catch(() => ({}))

    return NextResponse.json(
      {
        success:    true,
        contactId,
        fileName,
        documentId: (result as Record<string, unknown>).id ?? null,
        actResponse: result,
      },
      { status: 200, headers: CORS },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: `Document save error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500, headers: CORS },
    )
  }
}
