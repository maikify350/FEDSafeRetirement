/**
 * POST /api/explainer/validate — run the mistake-catching checks on a plan.
 * Body: { plan: ExplainerPlan }  →  { ok, errors, warnings, passed, checks[] }
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { authorizeExplainerRequest } from '@/lib/explainer/auth'
import { runPlanChecks, summarizeChecks } from '@/lib/explainer/checks'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeExplainerRequest(request)

    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const plan = body.plan || body

    if (!plan || !plan.brief || !Array.isArray(plan.shots)) return NextResponse.json({ error: 'Body must be { plan } with brief and shots' }, { status: 400 })

    const checks = runPlanChecks(plan)

    
return NextResponse.json({ ...summarizeChecks(checks), checks })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 500 })
  }
}
