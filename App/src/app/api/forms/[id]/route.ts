/**
 * GET    /api/forms/[id]  — Get single form
 * PUT    /api/forms/[id]  — Update (admin only)
 * DELETE /api/forms/[id]  — Delete (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'

const DATA_COLS = 'id, form_id, aka, title, description, tags, source_url, instruct_pages, fill_pages, form_url, summary, explainer_url, mapping'
const AUDIT_COLS = 'cre_by, cre_dt, mod_by, mod_dt, version_no'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401, user: null }
  const admin = createAdminClient()
  const { data: userRow } = await admin.from('users').select('role').eq('id', user.id).single()
  if (userRow?.role !== 'admin') return { error: 'Forbidden — admin only', status: 403, user: null }
  return { error: null, status: 200, user }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('forms').select(`${DATA_COLS}, ${AUDIT_COLS}`).eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error: authErr, status, user } = await requireAdmin(supabase)
  if (authErr) return NextResponse.json({ error: authErr }, { status })

  const body = await request.json()
  if (!body.form_id?.trim()) return NextResponse.json({ error: 'form_id is required' }, { status: 400 })
  if (!body.title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('forms')
    .update({
      form_id:        body.form_id.trim(),
      aka:            body.aka?.trim() ?? null,
      title:          body.title.trim(),
      description:    body.description ?? null,
      tags:           body.tags?.trim() ?? null,
      source_url:     body.source_url?.trim() ?? null,
      instruct_pages: body.instruct_pages?.trim() ?? null,
      fill_pages:     body.fill_pages?.trim() ?? null,
      form_url:       body.form_url?.trim() ?? null,
      summary:        body.summary ?? null,
      explainer_url:  body.explainer_url?.trim() ?? null,
      mapping:        body.mapping ?? [],
      mod_by:         user!.email ?? 'system',
      mod_dt:         new Date().toISOString(),
      version_no:     (body.version_no ?? 1) + 1,
    })
    .eq('id', id)
    .select(`${DATA_COLS}, ${AUDIT_COLS}`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error: authErr, status } = await requireAdmin(supabase)
  if (authErr) return NextResponse.json({ error: authErr }, { status })

  const admin = createAdminClient()
  const { error } = await admin.from('forms').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
