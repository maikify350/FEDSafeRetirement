/**
 * GET /api/videos/render/status?job=<job_id>
 * Returns the current state of a render job.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { renderJobs } from '../route'

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('job')

  if (!jobId) {
    return NextResponse.json({ error: 'job query param is required' }, { status: 400 })
  }

  const job = renderJobs.get(jobId)
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({
    status: job.status,
    progress: job.progress,
    video_url: job.video_url ?? null,
    error: job.error ?? null,
    composition_id: job.composition_id,
    started_at: job.started_at,
  })
}
