/**
 * POST /api/videos/render — Render a Remotion composition and replace video_url in DB
 *
 * Body: { video_id: string, composition_id: string, output_filename: string }
 *
 * Returns: { job_id: string }
 *
 * NOTE: This route uses child_process.spawn and local filesystem access.
 * It works in local `npm run dev` mode. On Vercel serverless it returns a
 * graceful "not supported in production" error so the UI shows a clear message.
 *
 * Poll progress via: GET /api/videos/render/status?job=<job_id>
 */

import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'

export interface RenderJob {
  status: 'queued' | 'running' | 'uploading' | 'done' | 'error'
  progress: number          // 0–100
  error?: string
  video_url?: string
  composition_id: string
  output_filename: string
  video_id: string
  started_at: string
}

// In-memory job store — survives across requests in the same Node.js process
declare global {
  // eslint-disable-next-line no-var
  var __renderJobs: Map<string, RenderJob> | undefined
}
if (!global.__renderJobs) global.__renderJobs = new Map()
export const renderJobs = global.__renderJobs

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gqarlkfmpgaotbezpkbs.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const REMOTION_PROJECT = path.resolve(
  process.cwd(),
  '..', 'SocialMedia', 'June28WebinarReel'
)

const ALLOWED_COMPOSITIONS = [
  'DynamicScriptReel',
  'PostalRetirementReel',
  'FegliShockReel',
  'FersSupplementReel',
  'TspMistakesReel',
  'SurvivorBenefitReel',
  'FehbFiveYearRuleReel',
  'HighThreePensionReel',
  'MilitaryBuybackReel',
  'PartnerSpotlightReel',
  'WhyFedSafeReel',
  'DidYouKnowReel',
  'WebinarReel',
  'WhoWeAreVideo',
  'FederalQuestionsVideo',
]

async function uploadToSupabase(filePath: string, remoteName: string): Promise<string> {
  const buf = fs.readFileSync(filePath)
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/videos/${remoteName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
      'Content-Type': 'video/mp4',
      'x-upsert': 'true',
    },
    body: buf as any,
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Supabase upload failed (${res.status}): ${txt}`)
  }
  return `${SUPABASE_URL}/storage/v1/object/public/videos/${remoteName}`
}

async function patchVideoUrl(videoId: string, videoUrl: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('videos')
    .update({ video_url: videoUrl, mod_dt: new Date().toISOString() })
    .eq('id', videoId)
  if (error) throw new Error(error.message)
}

function runRenderJob(jobId: string) {
  const job = renderJobs.get(jobId)!
  job.status = 'running'

  const outDir = path.join(REMOTION_PROJECT, 'out')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, job.output_filename)

  const args = [
    'remotion', 'render',
    'src/index.tsx',
    job.composition_id,
    outFile,
    '--codec=h264',
    '--pixel-format=yuv420p',
  ]

  const child = spawn('npx', args, {
    cwd: REMOTION_PROJECT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  })

  child.stdout?.on('data', (data: Buffer) => {
    const line = data.toString()
    // Parse "Rendered 123/456" style progress
    const m = line.match(/Rendered\s+(\d+)\/(\d+)/)
    if (m) {
      const done = parseInt(m[1])
      const total = parseInt(m[2])
      job.progress = Math.round((done / total) * 85) // 0–85% for render phase
    }
  })

  child.stderr?.on('data', (data: Buffer) => {
    const line = data.toString()
    const m = line.match(/Rendered\s+(\d+)\/(\d+)/)
    if (m) {
      const done = parseInt(m[1])
      const total = parseInt(m[2])
      job.progress = Math.round((done / total) * 85)
    }
  })

  child.on('close', async (code: number | null) => {
    if (code !== 0) {
      job.status = 'error'
      job.error = `Remotion render exited with code ${code}`
      return
    }

    if (!fs.existsSync(outFile)) {
      job.status = 'error'
      job.error = `Rendered file not found at ${outFile}`
      return
    }

    // Upload phase: 85–98%
    job.status = 'uploading'
    job.progress = 88
    try {
      const publicUrl = await uploadToSupabase(outFile, job.output_filename)
      job.progress = 95
      await patchVideoUrl(job.video_id, publicUrl)
      job.video_url = publicUrl
      job.progress = 100
      job.status = 'done'
    } catch (err: any) {
      job.status = 'error'
      job.error = err.message || 'Upload/patch failed'
    }
  })
}

export async function POST(request: NextRequest) {
  // Check if we have access to child_process (not available on Vercel edge)
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV != null

  if (isVercel) {
    return NextResponse.json(
      {
        error: 'Video rendering requires the local development server.\n\nRun `npm run dev` locally and use the Video Edit dialog from http://localhost:3000/videos to trigger a render.',
        local_only: true,
      },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { video_id, composition_id, output_filename } = body

    if (!video_id || !composition_id || !output_filename) {
      return NextResponse.json({ error: 'video_id, composition_id, and output_filename are required' }, { status: 400 })
    }

    if (!ALLOWED_COMPOSITIONS.includes(composition_id)) {
      return NextResponse.json({ error: `Unknown composition "${composition_id}"` }, { status: 400 })
    }

    if (!fs.existsSync(REMOTION_PROJECT)) {
      return NextResponse.json({ error: `Remotion project not found at ${REMOTION_PROJECT}` }, { status: 500 })
    }

    const jobId = randomUUID()
    const job: RenderJob = {
      status: 'queued',
      progress: 0,
      composition_id,
      output_filename,
      video_id,
      started_at: new Date().toISOString(),
    }
    renderJobs.set(jobId, job)

    // Kick off render asynchronously — don't await!
    setImmediate(() => runRenderJob(jobId))

    return NextResponse.json({ job_id: jobId }, { status: 202 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
