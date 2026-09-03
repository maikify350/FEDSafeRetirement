/**
 * GET /api/videos/render/status?job=<job_id>
 * Returns the current state of a render job.
 * 
 * On Vercel: proxies to Railway render service
 * On localhost: reads from in-memory job store
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { renderJobs } from '../route'

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('job')

  if (!jobId) {
    return NextResponse.json({ error: 'job query param is required' }, { status: 400 })
  }

  // On Vercel, proxy to Railway render service
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV != null
  const serviceUrl = process.env.RENDER_SERVICE_URL

  if (isVercel && serviceUrl) {
    try {
      const proxyRes = await fetch(`${serviceUrl}/status/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.RENDER_SERVICE_KEY || ''}`,
        },
      })

      const data = await proxyRes.json()
      return NextResponse.json(data, { status: proxyRes.status })
    } catch (err: any) {
      return NextResponse.json(
        { error: `Render service unavailable: ${err.message}` },
        { status: 502 }
      )
    }
  }

  // Local: read from in-memory job store
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
