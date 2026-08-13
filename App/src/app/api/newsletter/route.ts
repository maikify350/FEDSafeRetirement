/**
 * Admin API route for newsletter subscribers — GET all / POST new.
 *
 * Uses the admin Supabase client (service-role key) to bypass RLS.
 */
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { createAdminClient } from '@/utils/supabase/server'

export async function GET() {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('newsletter')
    .select('*')
    .order('cre_dt', { ascending: false })
    .limit(1000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const admin = createAdminClient()
  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const row = {
    first_name:     body.first_name || '',
    last_name:      body.last_name || '',
    cell_phone:     body.cell_phone || '',
    personal_email: body.personal_email || '',
    source_page:    body.source_page || null,
    sms_consent:    body.sms_consent ?? true,
    status:         body.status || 'active',
    cre_by:         'admin:portal',
    mod_by:         'admin:portal',
  }

  const { data, error } = await admin
    .from('newsletter')
    .insert(row)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
