/**
 * Supabase Edge Function: lead-webhook
 *
 * Receives lead data from MegaStar (or any provider) via POST webhook.
 * Flattens the payload and inserts into the `lead_funnel` table.
 *
 * URL: https://gqarlkfmpgaotbezpkbs.supabase.co/functions/v1/lead-webhook
 * Method: POST
 * Auth: Optional x-webhook-secret header
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-webhook-secret, x-overflow-webhook-secret, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Validate webhook secret (optional — only enforced if WEBHOOK_SECRET is set)
  const expectedSecret = Deno.env.get('WEBHOOK_SECRET')
  if (expectedSecret) {
    const providedSecret = req.headers.get('x-overflow-webhook-secret')
      || req.headers.get('x-webhook-secret')
    if (providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Invalid webhook secret' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  // Parse payload
  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Extract fields from MegaStar-style nested payload
  const entry = body.entry || body
  const lead = entry.lead || {}
  const agent = entry.agent || {}

  // Extract TSP and Other account values from accounts[]
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

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Dedup: check if ext_appointment_id already exists
  let existingId: string | null = null
  if (row.ext_appointment_id) {
    const { data: existing } = await supabase
      .from('lead_funnel')
      .select('id')
      .eq('ext_appointment_id', row.ext_appointment_id)
      .maybeSingle()
    existingId = existing?.id ?? null
  }

  let data: any, error: any

  if (existingId) {
    // Update existing (idempotent re-delivery)
    ;({ data, error } = await supabase
      .from('lead_funnel')
      .update(row)
      .eq('id', existingId)
      .select('id')
      .single())
  } else {
    // Insert new
    ;({ data, error } = await supabase
      .from('lead_funnel')
      .insert(row)
      .select('id')
      .single())
  }

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({ ok: true, id: data?.id, action: existingId ? 'updated' : 'created' }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
})
