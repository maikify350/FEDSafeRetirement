/**
 * FedSafe Render Service — Express API for Remotion video rendering
 * 
 * Deployed on Railway. Accepts render requests from the Vercel production app.
 * 
 * Endpoints:
 *   POST /render         — Start a render job
 *   GET  /status/:jobId  — Check render progress  
 *   GET  /health         — Health check
 */

import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(cors())
app.use(express.json())

// ── Config ──
const PORT = parseInt(process.env.PORT || '3100', 10)
const RENDER_SERVICE_KEY = process.env.RENDER_SERVICE_KEY || ''
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''

const REMOTION_PROJECT = path.resolve(__dirname, '..', 'remotion')

const ALLOWED_COMPOSITIONS = [
  'DynamicScriptReel', 'PostalRetirementReel', 'FegliShockReel',
  'PartnerSpotlightReel', 'WhyFedSafeReel', 'DidYouKnowReel',
  'WebinarReel', 'WhoWeAreVideo', 'FederalQuestionsVideo',
]

// ── Auth Middleware ──
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!RENDER_SERVICE_KEY) return next() // No key = no auth (dev mode)
  const auth = req.headers.authorization
  if (auth === `Bearer ${RENDER_SERVICE_KEY}`) return next()
  res.status(401).json({ error: 'Unauthorized' })
}

// ── In-Memory Job Store ──
interface RenderJob {
  status: 'queued' | 'running' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
  video_url?: string
  composition_id: string
  output_filename: string
  video_id: string
  started_at: string
}
const jobs = new Map<string, RenderJob>()

// ── Supabase Admin Client ──
function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ── Helpers ──

async function fetchVideoRecord(videoId: string): Promise<any> {
  const sb = getSupabase()
  const { data, error } = await sb.from('videos').select('*').eq('id', videoId).single()
  if (error || !data) throw new Error(`Video not found: ${videoId}`)
  return data
}

async function generateNarrationAudio(video: any, outputPath: string): Promise<boolean> {
  if (!ELEVENLABS_API_KEY) {
    console.log('[Render] No ElevenLabs API key — skipping TTS')
    return false
  }

  const script = (video.script || '').trim()
  if (!script) return false

  const voiceId = video.voice_id || 'GGRMgbKfr7QscdcrvWga'
  const modelId = 'eleven_multilingual_v2'
  const tempo = Number(video.tempo) || 1.0
  const stability = Math.max(0.2, Math.min(1.0, 1.0 - (tempo - 1.0) * 0.3))

  // Normalize federal acronyms for TTS
  const normalizedText = script
    .replace(/\bCOLA\b/g, 'CO-la')
    .replace(/\bFEGLI\b/g, 'FEG-lee')
    .replace(/\bFERS\b/g, 'FERS')
    .replace(/\bCSRS\b/g, 'C-S-R-S')
    .replace(/\bTSP\b/g, 'T-S-P')
    .replace(/\bPSHB\b/g, 'P-S-H-B')
    .replace(/\bFEHB\b/g, 'F-E-H-B')
    .replace(/\bOPM\b/g, 'O-P-M')
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
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: normalizedText,
        model_id: modelId,
        voice_settings: { stability },
      }),
    })

    if (!response.ok) {
      console.error('[Render] ElevenLabs TTS failed:', response.status)
      return false
    }

    const audioBuffer = await response.arrayBuffer()
    fs.writeFileSync(outputPath, Buffer.from(audioBuffer))
    console.log(`[Render] Narration saved: ${Math.round(audioBuffer.byteLength / 1024)}KB`)
    return true
  } catch (err: any) {
    console.error('[Render] TTS error:', err.message)
    return false
  }
}

async function downloadImageToPublic(imageUrl: string, publicDir: string, filename: string): Promise<string | null> {
  try {
    if (!imageUrl.startsWith('/') && !imageUrl.startsWith('http')) return imageUrl

    let absoluteUrl = imageUrl
    if (imageUrl.startsWith('/')) {
      // Scene images served from the Vercel app
      const appUrl = process.env.APP_URL || 'https://fedsafe-retirement.vercel.app'
      absoluteUrl = `${appUrl}${imageUrl}`
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

async function buildCompositionProps(video: any, narrationFile: string | null): Promise<Record<string, any>> {
  const publicDir = path.join(REMOTION_PROJECT, 'public')

  const hyperframes = Array.isArray(video.hyperframes) ? video.hyperframes : []
  const scenes = []

  for (let idx = 0; idx < hyperframes.length; idx++) {
    const hf = hyperframes[idx]
    const sceneImageUrl = hf.scene_image || ''
    let imageFilename = ''

    if (sceneImageUrl) {
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

    const rawText = (hf.text_segment || '').replace(/\*\*/g, '').replace(/\/+/g, '').replace(/<[^>]*>/g, '').trim()
    const shortHeadline = idx === 0
      ? (video.title || 'Federal Retirement Brief')
      : rawText.split(/[.!?]/)[0]?.trim().substring(0, 55) || `Key Point #${idx + 1}`

    scenes.push({
      image: imageFilename,
      eyebrow: video.title || 'Federal Retirement Planning',
      headline: shortHeadline,
      body: rawText.length > 55 ? rawText : '',
      durationSec: Math.round(durationSec * 10) / 10,
    })
  }

  if (scenes.length === 0) {
    scenes.push({
      image: 'federal-advisor-consultation.jpg',
      eyebrow: 'Federal Retirement Planning',
      headline: video.title || 'Federal Retirement Brief',
      body: (video.script || '').trim().substring(0, 200),
      durationSec: video.duration_sec || 35,
    })
  }

  const ctaText = video.cta_text || 'Call (774) 273-8473 | FedSafeRetirement.com'
  const phoneMatch = ctaText.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)
  const ctaPhone = phoneMatch ? phoneMatch[0] : '(774) 273 8473'
  const websiteMatch = ctaText.match(/[A-Za-z]+\.[A-Za-z]{2,}/g)
  const ctaWebsite = websiteMatch ? websiteMatch[websiteMatch.length - 1] : 'FedSafeRetirement.com'

  const meta = video.metadata || {}

  return {
    title: video.title || 'Federal Retirement Brief',
    badgeText: 'FEDERAL RETIREMENT',
    narrationAudio: narrationFile,
    backgroundMusic: 'Sound_Script_01_vocalfocus-music05.mp3',
    spokenCta: video.spoken_cta || 'Before you pick a retirement date, review your numbers.',
    ctaPhone,
    ctaWebsite,
    scenes,
    durationSec: video.duration_sec || 35,
    showShieldLogo: meta.show_shield_logo !== false,
    showSamBadge: Boolean(meta.show_sam_badge),
    showDoubleLogo: Boolean(meta.show_double_logo),
    logoSize: meta.logo_size || 'medium',
    logoOpacity: typeof meta.logo_opacity === 'number' ? meta.logo_opacity : 0.9,
  }
}

// ── Render Pipeline ──

async function runRenderJob(jobId: string) {
  const job = jobs.get(jobId)!
  job.status = 'running'
  job.progress = 2

  const outDir = path.join(REMOTION_PROJECT, 'out')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, job.output_filename)
  const publicDir = path.join(REMOTION_PROJECT, 'public')
  const tempFiles: string[] = []

  try {
    // 0. Clean old temp files
    if (fs.existsSync(publicDir)) {
      const oldFiles = fs.readdirSync(publicDir).filter(f =>
        f.startsWith('render_narration_') || f.startsWith('render_scene_')
      )
      for (const f of oldFiles) {
        try { fs.unlinkSync(path.join(publicDir, f)) } catch { /* ignore */ }
      }
      if (oldFiles.length > 0) console.log(`[Render] Cleaned ${oldFiles.length} old temp files`)
    }

    // 1. Fetch video record
    console.log(`[Render] Fetching video: ${job.video_id}`)
    const video = await fetchVideoRecord(job.video_id)
    job.progress = 5

    // 2. Generate narration audio
    const narrationFilename = `render_narration_${job.video_id.substring(0, 8)}.mp3`
    const narrationPath = path.join(publicDir, narrationFilename)
    const hasAudio = await generateNarrationAudio(video, narrationPath)
    if (hasAudio) tempFiles.push(narrationPath)
    job.progress = 25

    // 3. Build composition props
    const props = await buildCompositionProps(video, hasAudio ? narrationFilename : null)
    job.progress = 30

    // Track scene images for cleanup
    for (let idx = 0; idx < (props.scenes?.length || 0); idx++) {
      for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
        const p = path.join(publicDir, `render_scene_${idx + 1}.${ext}`)
        if (fs.existsSync(p)) { tempFiles.push(p); break }
      }
    }

    // 4. Write props file
    const propsFile = path.join(outDir, `props_${jobId}.json`)
    fs.writeFileSync(propsFile, JSON.stringify(props))
    tempFiles.push(propsFile)

    // 5. Spawn Remotion render
    const args = [
      'remotion', 'render',
      'src/index.tsx',
      job.composition_id,
      outFile,
      '--codec=h264',
      '--pixel-format=yuv420p',
      `--props=${propsFile}`,
    ]

    console.log(`[Render] Starting: npx ${args.join(' ')}`)
    job.progress = 35

    await new Promise<void>((resolve, reject) => {
      const child = spawn('npx', args, {
        cwd: REMOTION_PROJECT,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      })

      let stderr = ''

      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString()
        // Parse Remotion progress from stdout
        const match = text.match(/(\d+)%/)
        if (match) {
          const pct = parseInt(match[1], 10)
          job.progress = 35 + Math.round(pct * 0.5) // 35-85%
        }
      })

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`Remotion exited with code ${code}: ${stderr.slice(-500)}`))
      })

      child.on('error', reject)
    })

    job.progress = 85

    // 6. Upload to Supabase Storage
    if (!fs.existsSync(outFile)) throw new Error('Rendered file not found')

    job.status = 'uploading'
    job.progress = 88

    const fileBuffer = fs.readFileSync(outFile)
    const storagePath = `renders/${job.output_filename}`
    const sb = getSupabase()

    const { error: uploadError } = await sb.storage
      .from('videos')
      .upload(storagePath, fileBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      })

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)
    job.progress = 95

    // 7. Get public URL and patch video record
    const { data: urlData } = sb.storage.from('videos').getPublicUrl(storagePath)
    const publicUrl = urlData?.publicUrl

    if (publicUrl) {
      const { error: patchError } = await sb
        .from('videos')
        .update({
          video_url: publicUrl,
          status: 'rendered',
          rendered_at: new Date().toISOString(),
        })
        .eq('id', job.video_id)

      if (patchError) console.error('[Render] DB patch error:', patchError.message)
      job.video_url = publicUrl
    }

    job.status = 'done'
    job.progress = 100
    console.log(`[Render] ✅ Done: ${publicUrl}`)

  } catch (err: any) {
    console.error(`[Render] ❌ Error:`, err.message)
    job.status = 'error'
    job.error = err.message
  } finally {
    // Cleanup temp files
    for (const f of tempFiles) {
      try { fs.unlinkSync(f) } catch { /* ignore */ }
    }
    try { if (fs.existsSync(outFile)) fs.unlinkSync(outFile) } catch { /* ignore */ }
  }
}

// ── Routes ──

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'fedsafe-render',
    remotion_project: fs.existsSync(REMOTION_PROJECT),
    timestamp: new Date().toISOString(),
  })
})

app.post('/render', authenticate, async (req, res) => {
  try {
    const { video_id, composition_id, output_filename } = req.body

    if (!video_id || !composition_id || !output_filename) {
      return res.status(400).json({ error: 'video_id, composition_id, and output_filename are required' })
    }

    if (!ALLOWED_COMPOSITIONS.includes(composition_id)) {
      return res.status(400).json({ error: `Unknown composition "${composition_id}"` })
    }

    if (!fs.existsSync(REMOTION_PROJECT)) {
      return res.status(500).json({ error: 'Remotion project not found in container' })
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
    jobs.set(jobId, job)

    // Fire and forget
    setImmediate(() => runRenderJob(jobId))

    res.status(202).json({ job_id: jobId })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/status/:jobId', authenticate, (req, res) => {
  const job = jobs.get(req.params.jobId)
  if (!job) return res.status(404).json({ error: 'Job not found' })
  res.json(job)
})

// ── Start Server ──
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎬 FedSafe Render Service running on port ${PORT}`)
  console.log(`   Remotion project: ${REMOTION_PROJECT}`)
  console.log(`   Auth: ${RENDER_SERVICE_KEY ? 'enabled' : 'disabled (dev mode)'}`)
})
