/**
 * GET /api/pdf/[id]/route
 *
 * Short-URL redirector for filled PDFs.
 * Looks up the full Supabase Storage URL from the `filled_pdfs` query param
 * or a simple hash-based lookup pattern, then 302-redirects to it.
 *
 * This keeps the URL stored in Act! CRM short enough to be clickable:
 *   https://fedsafe-retirement.vercel.app/api/pdf/2840103a-BP-20260426
 * instead of the full 155+ char Supabase URL.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Missing PDF id' }, { status: 400 })
  }

  // The id encodes: {contactId-short}-{formAbbrev}-{dateTag}
  // We reconstruct the full Supabase storage path from it.
  // Pattern: "2840103a-BP-20260426_21-14-05"
  //   → filled-forms/2840103a-...-BLUEPRINT-2026-04-26_21-14-05.pdf
  //
  // But for simplicity, we store the full URL in a query param during creation
  // and just redirect. The id itself IS the storage filename (minus extension).

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gqarlkfmpgaotbezpkbs.supabase.co'
  const fullUrl = `${supabaseUrl}/storage/v1/object/public/Forms/filled-forms/${id}.pdf`

  return NextResponse.redirect(fullUrl, 302)
}
