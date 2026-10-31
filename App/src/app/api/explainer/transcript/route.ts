/**
 * POST /api/explainer/transcript — Pull a reference video's transcript + metadata.
 *
 * Body: { url: string }
 * Returns: { video_id, title, channel, description, provider, segments: [{start, text}], text }
 *
 * Provider chain (first that succeeds wins):
 *   1. SerpApi        (SERPAPI_API_KEY)   — engine=youtube_video for metadata (+ transcript when present)
 *   2. SearchApi.io   (SEARCHAPI_API_KEY) — engine=youtube_transcripts
 *   3. Direct YouTube caption track (json3) — no key, may be blocked by YouTube
 *
 * If every provider fails the route returns 422 and the UI lets the user paste a transcript.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createClient } from '@/utils/supabase/server'
import { extractYouTubeId } from '@/lib/explainer/presets'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface Segment { start: number; text: string }

interface TranscriptResult {
  video_id: string
  title: string
  channel: string
  description: string
  provider: 'serpapi' | 'searchapi' | 'youtube'
  segments: Segment[]
  text: string
  metadata_only?: boolean
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n+/g, ' ')
    .trim()
}

function joinText(segments: Segment[]): string {
  return segments.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim()
}

// ── 1. SerpApi ──
async function viaSerpApi(videoId: string): Promise<Partial<TranscriptResult> | null> {
  const key = process.env.SERPAPI_API_KEY

  if (!key) return null

  const url = `https://serpapi.com/search.json?engine=youtube_video&v=${encodeURIComponent(videoId)}&api_key=${encodeURIComponent(key)}`
  const res = await fetch(url, { cache: 'no-store' })

  if (!res.ok) throw new Error(`SerpApi ${res.status}`)
  const json: any = await res.json()

  const segments: Segment[] = []

  // SerpApi surfaces transcript-like data under a few shapes depending on the video; accept any of them.
  const rawTranscript = json.transcript || json.captions || json.key_moments || []

  for (const row of rawTranscript) {
    const text = decodeEntities(String(row.text || row.snippet || row.title || ''))

    if (!text) continue
    const start = Number(row.start ?? row.start_seconds ?? row.time_seconds ?? 0)

    segments.push({ start, text })
  }

  return {
    title: json.title || '',
    channel: json.channel?.name || '',
    description: json.description?.content || json.description || '',
    provider: 'serpapi',
    segments,
    metadata_only: segments.length === 0,
  }
}

// ── 2. SearchApi.io ──
async function viaSearchApi(videoId: string): Promise<Partial<TranscriptResult> | null> {
  const key = process.env.SEARCHAPI_API_KEY

  if (!key) return null

  const url = `https://www.searchapi.io/api/v1/search?engine=youtube_transcripts&video_id=${encodeURIComponent(videoId)}&api_key=${encodeURIComponent(key)}`
  const res = await fetch(url, { cache: 'no-store' })

  if (!res.ok) throw new Error(`SearchApi ${res.status}`)
  const json: any = await res.json()

  const segments: Segment[] = (json.transcripts || []).map((t: any) => ({
    start: Number(t.start) || 0,
    text: decodeEntities(String(t.text || '')),
  })).filter((s: Segment) => s.text)

  if (!segments.length) return null
  
return { provider: 'searchapi', segments }
}

// ── 3. Direct YouTube caption track ──
async function viaYouTube(videoId: string): Promise<Partial<TranscriptResult> | null> {
  const page = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
    cache: 'no-store',
  })

  if (!page.ok) throw new Error(`YouTube ${page.status}`)
  const html = await page.text()

  const title = decodeEntities(html.match(/<meta name="title" content="([^"]*)"/)?.[1] || '')
  const channel = decodeEntities(html.match(/"ownerChannelName":"([^"]*)"/)?.[1] || '')
  const description = decodeEntities(html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/)?.[1]?.replace(/\\n/g, '\n').replace(/\\"/g, '"') || '')

  const tracksMatch = html.match(/"captionTracks":(\[.*?\])/)

  if (!tracksMatch) return { title, channel, description, provider: 'youtube', segments: [], metadata_only: true }

  const tracks: any[] = JSON.parse(tracksMatch[1])

  const track = tracks.find(t => (t.languageCode || '').startsWith('en') && t.kind !== 'asr')
    || tracks.find(t => (t.languageCode || '').startsWith('en'))
    || tracks[0]

  if (!track?.baseUrl) return { title, channel, description, provider: 'youtube', segments: [], metadata_only: true }

  const capRes = await fetch(`${track.baseUrl.replace(/\\u0026/g, '&')}&fmt=json3`, { headers: { 'User-Agent': UA }, cache: 'no-store' })

  if (!capRes.ok) throw new Error(`Caption track ${capRes.status}`)
  const cap: any = await capRes.json()

  const segments: Segment[] = (cap.events || [])
    .filter((e: any) => Array.isArray(e.segs))
    .map((e: any) => ({
      start: Math.round((Number(e.tStartMs) || 0) / 100) / 10,
      text: decodeEntities(e.segs.map((s: any) => s.utf8 || '').join('')),
    }))
    .filter((s: Segment) => s.text && s.text !== '\n')

  return { title, channel, description, provider: 'youtube', segments, metadata_only: segments.length === 0 }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const videoId = extractYouTubeId(body.url || '')

    if (!videoId) return NextResponse.json({ error: 'Could not parse a YouTube video id from that URL.' }, { status: 400 })

    const attempts: string[] = []
    let meta: Partial<TranscriptResult> = {}
    let best: Partial<TranscriptResult> | null = null

    for (const [name, fn] of [['serpapi', viaSerpApi], ['searchapi', viaSearchApi], ['youtube', viaYouTube]] as const) {
      try {
        const r = await fn(videoId)

        if (!r) { attempts.push(`${name}: not configured`); continue }
        meta = { ...r, ...meta, title: meta.title || r.title, channel: meta.channel || r.channel, description: meta.description || r.description }
        if (r.segments && r.segments.length) { best = r; attempts.push(`${name}: ok (${r.segments.length} segments)`); break }
        attempts.push(`${name}: metadata only`)
      } catch (e: any) {
        attempts.push(`${name}: ${e.message}`)
      }
    }

    if (!best) {
      return NextResponse.json({
        error: 'No transcript provider could read this video. Paste the transcript manually or configure SERPAPI_API_KEY / SEARCHAPI_API_KEY.',
        attempts,
        video_id: videoId,
        title: meta.title || '',
        channel: meta.channel || '',
        description: meta.description || '',
      }, { status: 422 })
    }

    const result: TranscriptResult = {
      video_id: videoId,
      title: meta.title || '',
      channel: meta.channel || '',
      description: meta.description || '',
      provider: best.provider!,
      segments: best.segments!,
      text: joinText(best.segments!),
    }

    
return NextResponse.json({ ...result, attempts })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Transcript error' }, { status: 500 })
  }
}
