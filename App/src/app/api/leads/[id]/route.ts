/**
 * PUT /api/leads/[id] – Update a single lead record
 * GET /api/leads/[id] – Fetch a single lead record
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  // Only allow updating specific fields (whitelist)
  const allowed = [
    'first_name', 'last_name', 'middle_initial',
    'gender', 'date_of_birth',
    'occupation_title', 'grade_level', 'annual_salary', 'hourly_rate',
    'facility_name', 'facility_address', 'facility_city',
    'facility_state', 'facility_zip_code',
    'entered_on_duty_date', 'years_of_service',
    'personal_address', 'personal_city', 'personal_state', 'personal_zip',
    'personal_email', 'personal_phone',
  ]

  const updates: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Get current user for audit
  const { data: { user } } = await supabase.auth.getUser()
  updates.mod_by = user?.email ?? 'system'

  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[API /leads/:id] Update error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
