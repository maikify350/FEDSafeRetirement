/**
 * Admin API route for individual newsletter subscriber — GET / PUT / DELETE.
 *
 * GET    /api/newsletter/:id  → fetch single subscriber
 * PUT    /api/newsletter/:id  → update subscriber fields
 * DELETE /api/newsletter/:id  → delete subscriber
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('newsletter')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createAdminClient()
  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const update: Record<string, unknown> = {
    mod_by: 'admin:portal',
  }

  // Only update fields that were sent
  if (body.first_name !== undefined)     update.first_name     = body.first_name
  if (body.last_name !== undefined)      update.last_name      = body.last_name
  if (body.cell_phone !== undefined)     update.cell_phone     = body.cell_phone
  if (body.personal_email !== undefined) update.personal_email = body.personal_email
  if (body.status !== undefined)         update.status         = body.status
  if (body.sms_consent !== undefined)    update.sms_consent    = body.sms_consent
  if (body.source_page !== undefined)    update.source_page    = body.source_page

  const { data, error } = await admin
    .from('newsletter')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createAdminClient()

  const { error } = await admin
    .from('newsletter')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
