/**
 * Krea public API bridge for Explainer Studio.
 *
 * POST /api/explainer/krea   — submit one clip job
 *   Body: { model: string, prompt: string, aspect_ratio: string, duration: number,
 *           resolution?: '480p'|'720p'|'1080p', draft?: boolean, start_image?: string,
 *           reference_images?: string[], preflight?: boolean }
 *   Returns the Krea job object ({ job_id, status, ... }) or a cost quote when preflight=true.
 *
 * GET  /api/explainer/krea?job=<job_id> — poll a job
 *
 * Env: KREA_API_KEY (required), KREA_API_BASE (optional, defaults to https://api.krea.ai/v1).
 * Model ids and input fields mirror Krea's `list_models` / `get_model_schema` (see Docs/EXPLAINER_STUDIO.md).
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createClient } from '@/utils/supabase/server'
import { KREA_VIDEO_MODELS } from '@/lib/explainer/presets'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BASE = (process.env.KREA_API_BASE || 'https://api.krea.ai/v1').replace(/\/+$/, '')

function headers(key: string) {
  return { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }
}

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  
return user
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const key = process.env.KREA_API_KEY

    if (!key) {
      return NextResponse.json({
        error: 'KREA_API_KEY is not configured. Copy the engine prompt and run it in Krea manually, or add the key to App/.env and Vercel.',
        configured: false,
      }, { status: 503 })
    }

    const body = await request.json()
    const model = KREA_VIDEO_MODELS.find(m => m.id === body.model) || KREA_VIDEO_MODELS[0]
    const prompt = String(body.prompt || '').trim()

    if (!prompt) return NextResponse.json({ error: 'prompt is required' }, { status: 400 })

    const input: Record<string, any> = {
      prompt,
      aspect_ratio: body.aspect_ratio || '16:9',
      duration: Math.min(model.maxSeconds, Math.max(4, Math.round(Number(body.duration) || 5))),
      resolution: body.resolution || '720p',
    }

    if (body.draft) input.draft = true
    if (body.start_image) input.start_image = body.start_image
    if (Array.isArray(body.reference_images) && body.reference_images.length) input.reference_images = body.reference_images.slice(0, 30)
    if (typeof body.seed === 'number') input.seed = body.seed

    const url = `${BASE}/video/${model.id}${body.preflight ? '?preflight=true' : ''}`
    const res = await fetch(url, { method: 'POST', headers: headers(key), body: JSON.stringify(input), cache: 'no-store' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json({ error: json.error || `Krea ${res.status}`, krea: json }, { status: res.status === 402 || res.status === 429 ? res.status : 502 })
    }

    
return NextResponse.json({ ...json, model: model.id, input })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Krea error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!(await requireUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const key = process.env.KREA_API_KEY

    if (!key) return NextResponse.json({ error: 'KREA_API_KEY is not configured', configured: false }, { status: 503 })

    const job = request.nextUrl.searchParams.get('job')

    if (!job) return NextResponse.json({ configured: true, base: BASE, models: KREA_VIDEO_MODELS })

    const res = await fetch(`${BASE}/jobs/${encodeURIComponent(job)}`, { headers: headers(key), cache: 'no-store' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) return NextResponse.json({ error: json.error || `Krea ${res.status}` }, { status: 502 })
    
return NextResponse.json(json)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Krea error' }, { status: 500 })
  }
}
