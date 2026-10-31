/**
 * POST /api/explainer/handoff — create the Video Studio record for a plan (used by the MCP server;
 * the browser UI builds the same payload client-side and posts to /api/videos directly).
 * Body: { plan: ExplainerPlan, title?: string, clipUrls?: Record<number,string> }
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createAdminClient } from '@/utils/supabase/server'
import { authorizeExplainerRequest } from '@/lib/explainer/auth'
import { buildVideoPayload } from '@/lib/explainer/handoff'
import { runPlanChecks, summarizeChecks } from '@/lib/explainer/checks'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeExplainerRequest(request)

    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const plan = body.plan

    if (!plan?.brief || !Array.isArray(plan.shots) || !plan.shots.length) return NextResponse.json({ error: 'plan with brief and shots is required' }, { status: 400 })

    const checks = runPlanChecks(plan)
    const summary = summarizeChecks(checks)

    if (!summary.ok && !body.force) {
      return NextResponse.json({ error: 'Plan has blocking check errors; fix them or pass force: true', ...summary, checks: checks.filter(c => c.level === 'error') }, { status: 422 })
    }

    const payload = buildVideoPayload(plan, { title: body.title, clipUrls: body.clipUrls })
    const now = new Date().toISOString()
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('videos')
      .insert({ ...payload, status: 'draft', is_deleted: false, cre_by: auth.actor, cre_dt: now, mod_by: auth.actor, mod_dt: now, version_no: 1 })
      .select('id, title, duration_sec, format')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      ...data,
      composition_id: 'ExplainerReel',
      render: { method: 'POST', path: '/api/videos/render', body: { video_id: data.id, composition_id: 'ExplainerReel', output_filename: `${data.id}.mp4` } },
      qa: summary,
    }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Hand-off error' }, { status: 500 })
  }
}
