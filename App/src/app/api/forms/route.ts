/**
 * GET  /api/forms               — List all forms (authenticated)
 * GET  /api/forms?tags=FEGLI    — Filter by tag
 * POST /api/forms               — Create (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'

const DATA_COLS = 'id, form_id, aka, title, description, tags, source_url, instruct_pages, fill_pages, form_url, summary, explainer_url, mapping'
const AUDIT_COLS = 'cre_by, cre_dt, mod_by, mod_dt, version_no'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const params = request.nextUrl.searchParams
  const includeAudit = params.get('includeAudit') === 'true'
  const selectCols = includeAudit ? `${DATA_COLS}, ${AUDIT_COLS}` : DATA_COLS

  let query = supabase.from('forms').select(selectCols)

  const tags = params.get('tags')
  if (tags) query = query.ilike('tags', `%${tags}%`)

  const formId = params.get('form_id')
  if (formId) query = query.eq('form_id', formId)

  const { data, error } = await query.order('form_id', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: userRow } = await admin.from('users').select('role').eq('id', authUser.id).single()
  if (userRow?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const body = await request.json()
  if (!body.form_id?.trim()) return NextResponse.json({ error: 'form_id is required' }, { status: 400 })
  if (!body.title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const { data, error } = await admin
    .from('forms')
    .insert({
      form_id:       body.form_id.trim(),
      aka:           body.aka?.trim() ?? null,
      title:         body.title.trim(),
      description:   body.description ?? null,
      tags:          body.tags?.trim() ?? null,
      source_url:    body.source_url?.trim() ?? null,
      instruct_pages: body.instruct_pages?.trim() ?? null,
      fill_pages:    body.fill_pages?.trim() ?? null,
      form_url:      body.form_url?.trim() ?? null,
      summary:       body.summary ?? null,
      explainer_url: body.explainer_url?.trim() ?? null,
      mapping:       body.mapping ?? [],
      cre_by:        authUser.email ?? 'system',
      mod_by:        authUser.email ?? 'system',
    })
    .select(`${DATA_COLS}, ${AUDIT_COLS}`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
