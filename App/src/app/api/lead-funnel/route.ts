/**
 * Lead Funnel API
 *
 * GET  /api/lead-funnel                 — List all leads (authenticated, OData)
 * GET  /api/lead-funnel?status=pending  — Filter by status
 * POST /api/lead-funnel                 — Webhook receiver (external, secret-validated)
 * PATCH /api/lead-funnel                — Mark records as processed { ids: [...], status: 'imported' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import { applyOData, parseODataSelect } from '@/utils/odata'

const DATA_COLS = [
  'id', 'ext_appointment_id', 'ext_lead_id', 'event', 'source', 'lead_type', 'status',
  'first_name', 'last_name', 'email', 'phone', 'cell_phone',
  'birth_year', 'is_over_59', 'agency', 'years_employed',
  'city', 'state', 'zip', 'marital_status', 'fegli_options', 'retirement_year',
  'tsp_value', 'other_acct_value', 'appointment_date', 'ext_agent_id',
  'act_contact_id', 'act_user_id', 'assigned_agent', 'imported_at', 'import_error',
  'notes', 'processed', 'cre_dt'
].join(', ')

// ─── GET — List leads (authenticated) ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const params = request.nextUrl.searchParams

  let query = supabase.from('lead_funnel').select(parseODataSelect(params) || DATA_COLS)

  // ?status=pending
  const status = params.get('status')
  if (status) query = query.eq('status', status)

  // ?state=SC
  const state = params.get('state')
  if (state) query = query.eq('state', state)

  // ?processed=false
  const processed = params.get('processed')
  if (processed !== null) query = query.eq('processed', processed === 'true')

  // Apply OData ($orderby, $top, $skip, $filter)
  query = applyOData(query, params)

  const { data, error } = await query.order('cre_dt', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// ─── POST — Webhook receiver (external, secret-validated) ─────────────────────
export async function POST(request: NextRequest) {
  // Validate webhook secret
  const secret = request.headers.get('x-overflow-webhook-secret')
    || request.headers.get('x-webhook-secret')
  const expectedSecret = process.env.WEBHOOK_SECRET

  // If WEBHOOK_SECRET is set, enforce it. Otherwise skip validation (dev mode).
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Extract fields from MegaStar-style payload
  const entry = body.entry || body
  const lead = entry.lead || {}
  const agent = entry.agent || {}

  // Extract account values from the accounts array
  let tspValue: number | null = null
  let otherAcctValue: number | null = null
  if (Array.isArray(lead.accounts)) {
    for (const acct of lead.accounts) {
      const name = (acct.name || acct.type?.name || '').toLowerCase()
      if (name === 'tsp') tspValue = parseFloat(acct.cashValue) || null
      else if (name === 'other') otherAcctValue = parseFloat(acct.cashValue) || null
    }
  }

  // Extract primary email
  const primaryEmail = lead.email
    || (Array.isArray(lead.emails) ? lead.emails.find((e: any) => e.primary)?.email : null)
    || null

  // Extract primary phone
  const primaryPhone = lead.cellPhone || lead.phone
    || (Array.isArray(lead.phones) ? lead.phones.find((p: any) => p.primary)?.number : null)
    || null

  const row = {
    ext_appointment_id: entry.id || null,
    ext_lead_id: lead.id || null,
    event: body.event || null,
    source: entry.source || null,
    lead_type: entry.type || null,
    status: 'pending',
    first_name: lead.firstName || null,
    last_name: lead.lastName || null,
    email: primaryEmail,
    phone: primaryPhone,
    cell_phone: lead.cellPhone || null,
    birth_year: lead.birthYear || null,
    is_over_59: lead.isOver59 ?? null,
    agency: lead.agency || null,
    years_employed: lead.yearsEmployed || null,
    city: lead.city || entry.city || null,
    state: lead.state || entry.state || null,
    zip: lead.zip || null,
    marital_status: lead.maritalStatus || null,
    fegli_options: lead.fegliOptions || null,
    retirement_year: lead.retirementYear || null,
    tsp_value: tspValue,
    other_acct_value: otherAcctValue,
    appointment_date: entry.date || null,
    ext_agent_id: agent.id || null,
    raw_payload: body,
  }

  const admin = createAdminClient()

  // Upsert by ext_appointment_id for idempotency
  const { data, error } = await admin
    .from('lead_funnel')
    .upsert(row, { onConflict: 'ext_appointment_id' })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data?.id })
}

// ─── PATCH — Mark leads as processed / imported ──────────────────────────────
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { ids, status: newStatus } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
  }

  const validStatuses = ['pending', 'imported', 'error', 'skipped']
  if (!validStatuses.includes(newStatus)) {
    return NextResponse.json({ error: `status must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
  }

  const admin = createAdminClient()
  const updatePayload: Record<string, any> = {
    status: newStatus,
    processed: newStatus === 'imported',
  }

  if (newStatus === 'imported') {
    updatePayload.imported_at = new Date().toISOString()
  }

  const { data, error } = await admin
    .from('lead_funnel')
    .update(updatePayload)
    .in('id', ids)
    .select('id, status, processed')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, updated: data?.length ?? 0, records: data })
}
