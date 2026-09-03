/**
 * POST /api/videos/render — Render a Remotion composition and replace video_url in DB
 *
 * Body: { video_id: string, composition_id: string, output_filename: string }
 *
 * Returns: { job_id: string }
 *
 * Pipeline:
 *   1. Fetch video record from Supabase
 *   2. Generate narration audio via ElevenLabs TTS → save .mp3 to remotion/public/
 *   3. Download scene images from Next.js app → save to remotion/public/
 *   4. Build props JSON from video record
 *   5. Spawn `npx remotion render ... --props=<json>` 
 *   6. Upload rendered .mp4 to Supabase Storage
 *   7. Patch video_url in DB
 *   8. Clean up temp files
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
  '..', 'remotion'
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

// ── Helper: Upload rendered MP4 to Supabase Storage ──

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

// ── Helper: Patch video_url in Supabase DB ──

async function patchVideoUrl(videoId: string, videoUrl: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('videos')
    .update({ video_url: videoUrl, mod_dt: new Date().toISOString() })
    .eq('id', videoId)
  if (error) throw new Error(error.message)
}

// ── Helper: Fetch video record from Supabase ──

async function fetchVideoRecord(videoId: string): Promise<any> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single()
  if (error) throw new Error(`Video not found: ${error.message}`)
  return data
}

// ── Helper: Generate narration audio via ElevenLabs TTS ──

async function generateNarrationAudio(video: any, outputPath: string): Promise<boolean> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    console.warn('[Render] No ELEVENLABS_API_KEY — skipping narration audio')
    return false
  }

  const script = (video.script || '').trim()
  if (!script) return false

  const voiceId = video.voice_id || 'GGRMgbKfr7QscdcrvWga'
  const modelId = 'eleven_v3'
  const stability = 0.30

  // Same text normalization as voice-preview route
  let processedText = script
    .replace(/\/+/g, (match: string) => {
      const sec = match.length
      return sec === 1 ? ' [short pause] ... ' : ' [long pause] ... ... '
    })
    .replace(/\{\{pause:([\d.]+)\}\}/gi, (_: string, p1: string) => (parseFloat(p1) >= 2 ? ' [long pause] ' : ' [short pause] '))
    .replace(/\[pause:([\d.]+)s?\]/gi, (_: string, p1: string) => (parseFloat(p1) >= 2 ? ' [long pause] ' : ' [short pause] '))
    .replace(/\*\*([^*]+)\*\*/g, (_: string, p1: string) => ` ${p1.toUpperCase()} `)
    .replace(/<b>(.*?)<\/b>/gi, (_: string, p1: string) => ` ${p1.toUpperCase()} `)
    .replace(/\{\{emphasis\}\}([\s\S]*?)\{\{\/emphasis\}\}/gi, (_: string, p1: string) => ` ${p1.toUpperCase()} `)
    .replace(/<emphasis>([\s\S]*?)<\/emphasis>/gi, (_: string, p1: string) => ` ${p1.toUpperCase()} `)
    .replace(/\{\{whisper\}\}([\s\S]*?)\{\{\/whisper\}\}/gi, ' [whispers] $1 ')
    .replace(/\{\{excited\}\}([\s\S]*?)\{\{\/excited\}\}/gi, ' [excited] $1 ')
    .replace(/\{\{slow\}\}([\s\S]*?)\{\{\/slow\}\}/gi, ' $1 ')
    .replace(/<whisper>([\s\S]*?)<\/whisper>/gi, ' [whispers] $1 ')
    .replace(/<excited>([\s\S]*?)<\/excited>/gi, ' [excited] $1 ')
    .replace(/<dramatically>([\s\S]*?)<\/dramatically>/gi, ' [dramatically] $1 ')
    .replace(/<thoughtful>([\s\S]*?)<\/thoughtful>/gi, ' [thoughtful] $1 ')
    .replace(/<spell>(.*?)<\/spell>/gi, (_: string, p1: string) => p1.split('').join(' '))
    .replace(/<[^>]*>/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')

  // Financial / federal term normalization
  const normalizedText = processedText
    .replace(/\b401\(?k\)?\b/gi, 'four-oh-one-k')
    .replace(/\b403\(?b\)?\b/gi, 'four-oh-three-b')
    .replace(/\b457\(?b\)?\b/gi, 'four-five-seven-b')
    .replace(/\b529\b/g, 'five-twenty-nine')
    .replace(/\b1099-?R\b/gi, 'ten ninety-nine R')
    .replace(/\bW-?2\b/gi, 'W-two')
    .replace(/\b1040\b/g, 'ten-forty')
    .replace(/\bIRAs?\b/g, 'I-R-A')
    .replace(/\bRMDs?\b/g, 'R-M-D')
    .replace(/\bIRS\b/g, 'I-R-S')
    .replace(/\bSSA\b/g, 'S-S-A')
    .replace(/\bCOLA\b/g, 'CO-la')
    .replace(/\bFEGLI\b/g, 'FEG-lee')
    .replace(/\bFERS\b/g, 'FERS')
    .replace(/\bCSRS\b/g, 'C-S-R-S')
    .replace(/\bTSP\b/g, 'T-S-P')
    .replace(/\bPSHB\b/g, 'P-S-H-B')
    .replace(/\bFEHB\b/g, 'F-E-H-B')
    .replace(/\bOPM\b/g, 'O-P-M')
    .replace(/\bORA\b/g, 'O-R-A')
    .replace(/\bSF-?2818\b/gi, 'S-F twenty-eight eighteen')
    .replace(/\bSF-?3107\b/gi, 'S-F thirty-one oh-seven')
    .replace(/\bSF-?2801\b/gi, 'S-F twenty-eight oh-one')
    .replace(/\bDD-?214\b/gi, 'D-D two-fourteen')
    .replace(/\bVGLI\b/g, 'V-G-L-I')
    .replace(/\$([0-9,]+(\.[0-9]{2})?)\b/g, (_: string, p1: string) => {
      const clean = p1.replace(/,/g, '')
      const num = parseFloat(clean)
      if (num >= 1000000) return `${(num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1)} million dollars`
      if (num >= 1000) return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)} thousand dollars`
      return `${clean} dollars`
    })
    .replace(/(\d+)%/g, '$1 percent')
    .replace(/(\d{3})-(\d{3})-(\d{4})/g, '$1, $2, $3')

  try {
    console.log(`[Render] Generating narration audio (${normalizedText.split(/\s+/).length} words)...`)
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: normalizedText,
        model_id: modelId,
        voice_settings: { stability },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[Render] ElevenLabs TTS failed:', response.status, errText)
      return false
    }

    const audioBuffer = await response.arrayBuffer()
    fs.writeFileSync(outputPath, Buffer.from(audioBuffer))
    console.log(`[Render] Narration audio saved: ${outputPath} (${Math.round(audioBuffer.byteLength / 1024)}KB)`)
    return true
  } catch (err: any) {
    console.error('[Render] TTS generation error:', err.message)
    return false
  }
}

// ── Helper: Download a remote image to remotion/public/ for staticFile() access ──

async function downloadImageToPublic(imageUrl: string, publicDir: string, filename: string): Promise<string | null> {
  try {
    // If it's already a local remotion public file, just return the filename
    if (!imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
      return imageUrl
    }

    // For relative URLs from the Next.js app, make them absolute
    let absoluteUrl = imageUrl
    if (imageUrl.startsWith('/')) {
      absoluteUrl = `http://localhost:8001${imageUrl}`
    }

    const res = await fetch(absoluteUrl)
    if (!res.ok) {
      console.warn(`[Render] Failed to download image: ${absoluteUrl} (${res.status})`)
      return null
    }

    const buffer = await res.arrayBuffer()
    const outPath = path.join(publicDir, filename)
    fs.writeFileSync(outPath, Buffer.from(buffer))
    return filename
  } catch (err: any) {
    console.warn(`[Render] Image download error: ${err.message}`)
    return null
  }
}

// ── Helper: Build DynamicScriptReel props from video record ──

async function buildCompositionProps(video: any, narrationFile: string | null): Promise<Record<string, any>> {
  const publicDir = path.join(REMOTION_PROJECT, 'public')

  // Build scenes from hyperframes
  const hyperframes = Array.isArray(video.hyperframes) ? video.hyperframes : []
  const scenes = []

  for (let idx = 0; idx < hyperframes.length; idx++) {
    const hf = hyperframes[idx]
    const sceneImageUrl = hf.scene_image || ''
    let imageFilename = ''

    if (sceneImageUrl) {
      // Download scene image to remotion/public/ for staticFile() access
      const ext = sceneImageUrl.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i)?.[1] || 'jpg'
      const downloadName = `render_scene_${idx + 1}.${ext}`
      const result = await downloadImageToPublic(sceneImageUrl, publicDir, downloadName)
      imageFilename = result || 'federal-advisor-consultation.jpg'
    } else {
      const fallbacks = ['federal-advisor-consultation.jpg', 'federal-couple-happy.jpg', 'who-retired-vet.webp']
      imageFilename = fallbacks[idx % fallbacks.length]
    }

    const durationSec = hf.timestamp_end && hf.timestamp_start
      ? hf.timestamp_end - hf.timestamp_start
      : (video.duration_sec || 35) / Math.max(1, hyperframes.length)

    // Extract a short headline from the text segment (first clause or ~50 chars)
    const rawText = (hf.text_segment || '').replace(/\*\*/g, '').replace(/\/+/g, '').replace(/<[^>]*>/g, '').trim()
    const shortHeadline = idx === 0
      ? (video.title || 'Federal Retirement Brief')
      : rawText.split(/[.!?]/)[0]?.trim().substring(0, 55) || `Key Point #${idx + 1}`

    scenes.push({
      image: imageFilename,
      eyebrow: video.title || 'Federal Retirement Planning',
      headline: shortHeadline,
      body: rawText.length > 55 ? rawText : '',  // Only show body if headline didn't capture everything
      durationSec: Math.round(durationSec * 10) / 10,
    })
  }

  // If no hyperframes, create a single scene from the script
  if (scenes.length === 0) {
    const script = (video.script || '').trim()
    scenes.push({
      image: 'federal-advisor-consultation.jpg',
      eyebrow: 'Federal Retirement Planning',
      headline: video.title || 'Federal Retirement Brief',
      body: script.substring(0, 200),
      durationSec: video.duration_sec || 35,
    })
  }

  // Parse CTA phone & website from cta_text
  const ctaText = video.cta_text || 'Call (774) 273-8473 | FedSafeRetirement.com'
  const phoneMatch = ctaText.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)
  const ctaPhone = phoneMatch ? phoneMatch[0] : '(774) 273 8473'
  const websiteMatch = ctaText.match(/[A-Za-z]+\.[A-Za-z]{2,}/g)
  const ctaWebsite = websiteMatch ? websiteMatch[websiteMatch.length - 1] : 'FedSafeRetirement.com'

  // Logo settings from metadata
  const meta = video.metadata || {}

  return {
    title: video.title || 'Federal Retirement Brief',
    badgeText: 'FEDERAL RETIREMENT',  // Always short — batch_name is too long for a badge
    narrationAudio: narrationFile,
    backgroundMusic: 'Sound_Script_01_vocalfocus-music05.mp3',
    spokenCta: video.spoken_cta || 'Before you pick a retirement date, review your numbers.',
    ctaPhone,
    ctaWebsite,
    scenes,
    durationSec: video.duration_sec || 35,
    // Logo toggles — only show what the user explicitly enabled
    showShieldLogo: meta.show_shield_logo !== false,
    showSamBadge: Boolean(meta.show_sam_badge),
    showDoubleLogo: Boolean(meta.show_double_logo),
    logoSize: meta.logo_size || 'medium',
    logoOpacity: typeof meta.logo_opacity === 'number' ? meta.logo_opacity : 0.9,
  }
}

// ── Main render job runner ──

async function runRenderJob(jobId: string) {
  const job = renderJobs.get(jobId)!
  job.status = 'running'
  job.progress = 2

  const outDir = path.join(REMOTION_PROJECT, 'out')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, job.output_filename)

  // Temp files to clean up after render
  const tempFiles: string[] = []

  try {
    // 0. CLEAN UP all previous render temp files first
    const publicDir = path.join(REMOTION_PROJECT, 'public')
    if (fs.existsSync(publicDir)) {
      const oldFiles = fs.readdirSync(publicDir).filter(f =>
        f.startsWith('render_narration_') || f.startsWith('render_scene_')
      )
      for (const f of oldFiles) {
        try { fs.unlinkSync(path.join(publicDir, f)) } catch { /* ignore */ }
      }
      if (oldFiles.length > 0) console.log(`[Render] Cleaned ${oldFiles.length} old render temp files`)
    }
    // Also clean old props files
    if (fs.existsSync(outDir)) {
      const oldProps = fs.readdirSync(outDir).filter(f => f.startsWith('props_') && f.endsWith('.json'))
      for (const f of oldProps) {
        try { fs.unlinkSync(path.join(outDir, f)) } catch { /* ignore */ }
      }
    }
    // 1. Fetch video record from Supabase
    console.log(`[Render] Fetching video record: ${job.video_id}`)
    const video = await fetchVideoRecord(job.video_id)
    job.progress = 5

    // 2. Generate narration audio
    const narrationFilename = `render_narration_${job.video_id.substring(0, 8)}.mp3`
    const narrationPath = path.join(REMOTION_PROJECT, 'public', narrationFilename)
    const hasAudio = await generateNarrationAudio(video, narrationPath)
    if (hasAudio) tempFiles.push(narrationPath)
    job.progress = 25

    // 3. Build composition props
    const props = await buildCompositionProps(video, hasAudio ? narrationFilename : null)
    job.progress = 30

    // Track downloaded scene images for cleanup
    const sceneFiles = props.scenes.map((_: any, idx: number) => {
      const p = path.join(REMOTION_PROJECT, 'public', `render_scene_${idx + 1}.jpg`)
      if (fs.existsSync(p)) return p
      for (const ext of ['png', 'webp', 'jpeg']) {
        const alt = path.join(REMOTION_PROJECT, 'public', `render_scene_${idx + 1}.${ext}`)
        if (fs.existsSync(alt)) return alt
      }
      return null
    }).filter(Boolean)
    tempFiles.push(...sceneFiles as string[])

    // 4. Write props to a temp file (Remotion CLI reads from file to avoid shell escaping issues)
    const propsFile = path.join(outDir, `props_${jobId}.json`)
    fs.writeFileSync(propsFile, JSON.stringify(props))
    tempFiles.push(propsFile)
    console.log(`[Render] Props written: ${propsFile}`)

    // 5. Spawn Remotion render with --props
    const args = [
      'remotion', 'render',
      'src/index.tsx',
      job.composition_id,
      outFile,
      '--codec=h264',
      '--pixel-format=yuv420p',
      `--props=${propsFile}`,
    ]

    const child = spawn('npx', args, {
      cwd: REMOTION_PROJECT,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })

    let stderrOutput = ''

    child.stdout?.on('data', (data: Buffer) => {
      const line = data.toString()
      const m = line.match(/Rendered\s+(\d+)\/(\d+)/)
      if (m) {
        const done = parseInt(m[1])
        const total = parseInt(m[2])
        job.progress = 30 + Math.round((done / total) * 55) // 30–85% for render phase
      }
    })

    child.stderr?.on('data', (data: Buffer) => {
      const line = data.toString()
      stderrOutput += line
      const m = line.match(/Rendered\s+(\d+)\/(\d+)/)
      if (m) {
        const done = parseInt(m[1])
        const total = parseInt(m[2])
        job.progress = 30 + Math.round((done / total) * 55)
      }
    })

    child.on('close', async (code: number | null) => {
      if (code !== 0) {
        job.status = 'error'
        const tail = stderrOutput.trim().slice(-500)
        job.error = `Remotion render exited with code ${code}${tail ? `: ${tail}` : ''}`
        cleanupTempFiles(tempFiles)
        return
      }

      if (!fs.existsSync(outFile)) {
        job.status = 'error'
        job.error = `Rendered file not found at ${outFile}`
        cleanupTempFiles(tempFiles)
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
      } finally {
        cleanupTempFiles(tempFiles)
      }
    })
  } catch (err: any) {
    job.status = 'error'
    job.error = `Render setup failed: ${err.message}`
    cleanupTempFiles(tempFiles)
  }
}

function cleanupTempFiles(files: string[]) {
  for (const f of files) {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f)
    } catch { /* ignore cleanup errors */ }
  }
}

export async function POST(request: NextRequest) {
  // Check if we have access to child_process (not available on Vercel edge)
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV != null

  if (isVercel) {
    // Proxy render request to Railway render service
    const serviceUrl = process.env.RENDER_SERVICE_URL
    if (!serviceUrl) {
      return NextResponse.json(
        {
          error: 'Video rendering is not configured for production.\n\nSet RENDER_SERVICE_URL environment variable in Vercel to point to the Railway render service.',
          local_only: true,
        },
        { status: 503 }
      )
    }

    try {
      const body = await request.json()
      const proxyRes = await fetch(`${serviceUrl}/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RENDER_SERVICE_KEY || ''}`,
        },
        body: JSON.stringify(body),
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
