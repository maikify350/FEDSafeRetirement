/** GET /api/explainer/presets — every preset the studio exposes (used by the MCP server). */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { authorizeExplainerRequest } from '@/lib/explainer/auth'
import {
  ANIMATION_MODES, ASSET_3D_LIBRARY, ENGINES, KREA_VIDEO_MODELS, LENGTH_PRESETS,
  PIPELINE_STEPS, PLAN_STYLES, SOCIAL_TARGETS, WORDS_PER_SECOND,
} from '@/lib/explainer/presets'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await authorizeExplainerRequest(request)

  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    social_targets: SOCIAL_TARGETS,
    length_presets: LENGTH_PRESETS,
    styles: PLAN_STYLES,
    engines: ENGINES,
    krea_video_models: KREA_VIDEO_MODELS,
    animation_modes: ANIMATION_MODES,
    asset_3d_slots: ASSET_3D_LIBRARY,
    pipeline_steps: PIPELINE_STEPS,
    words_per_second: WORDS_PER_SECOND,
    krea_configured: Boolean(process.env.KREA_API_KEY),
    llm_configured: Boolean(process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY),
  })
}
