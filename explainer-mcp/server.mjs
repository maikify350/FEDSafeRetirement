#!/usr/bin/env node
/**
 * FEDSafe Explainer Studio — MCP server (stdio)
 *
 * Lets Claude Code (or any MCP client) drive the explainer pipeline end-to-end:
 *   explainer_list_presets     → platforms, lengths, engines, Krea models, animation modes, 3D slots
 *   explainer_fetch_transcript → reference video transcript (SerpApi → SearchApi → YouTube)
 *   explainer_generate_plan    → topic brief → script + storyboard + prompts + QA
 *   explainer_validate_plan    → re-run the mistake-catching checks on an edited plan
 *   explainer_krea_clip        → generate/poll a Krea clip for one shot
 *   explainer_create_video     → hand a plan to the Video Studio (videos row + ExplainerReel)
 *
 * Env:
 *   EXPLAINER_APP_URL      e.g. https://fedsafe-retirement.vercel.app  (default http://localhost:3000)
 *   EXPLAINER_SERVICE_KEY  must match the app's EXPLAINER_SERVICE_KEY
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REMOTION = path.join(REPO, 'remotion')

/** Run a local command in remotion/, keep the tail of its output, report pass/fail by exit code. */
function local(cmd, args, timeoutMs = 30 * 60_000) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd: REMOTION, env: process.env, shell: process.platform === 'win32' })
    let out = ''
    const keep = (d) => { out = (out + d).slice(-12_000) }
    p.stdout.on('data', keep)
    p.stderr.on('data', keep)
    const timer = setTimeout(() => { p.kill('SIGTERM'); out += '\n(timed out)' }, timeoutMs)
    p.on('close', (code) => { clearTimeout(timer); resolve({ pass: code === 0, out: out.trim() }) })
    p.on('error', (e) => { clearTimeout(timer); resolve({ pass: false, out: String(e) }) })
  })
}

function planToFile(plan) {
  const f = path.join(os.tmpdir(), `explainer-plan-${Date.now()}.json`)
  fs.writeFileSync(f, JSON.stringify(plan))
  return f
}

const APP_URL = (process.env.EXPLAINER_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')
const SERVICE_KEY = process.env.EXPLAINER_SERVICE_KEY || ''

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${APP_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(SERVICE_KEY ? { Authorization: `Bearer ${SERVICE_KEY}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text } }
  if (!res.ok) {
    const err = new Error(json?.error || `${method} ${path} → ${res.status}`)
    err.payload = json
    throw err
  }
  return json
}

const asText = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] })
const asError = (e) => ({ isError: true, content: [{ type: 'text', text: `${e.message}${e.payload ? `\n${JSON.stringify(e.payload, null, 2)}` : ''}` }] })

const server = new McpServer({ name: 'fedsafe-explainer-studio', version: '1.0.0' })

server.tool(
  'explainer_list_presets',
  'List Explainer Studio presets: social targets (aspect, max runtime, safe zones), length presets, engines (Hyperframes/Higgsfield/Krea) with camera vocabularies, Krea video models, animation modes and 3D asset slots.',
  {},
  async () => {
    try { return asText(await api('/api/explainer/presets')) } catch (e) { return asError(e) }
  },
)

server.tool(
  'explainer_fetch_transcript',
  'Fetch the transcript and metadata of a reference YouTube video so its structure/pacing can be emulated. Returns segments + full text, or the provider attempt log if none succeeded.',
  { url: z.string().describe('YouTube URL or 11-char video id') },
  async ({ url }) => {
    try { return asText(await api('/api/explainer/transcript', { method: 'POST', body: { url } })) } catch (e) { return asError(e) }
  },
)

server.tool(
  'explainer_generate_plan',
  'Generate a complete explainer production plan from a topic brief: hook, research beats, chapters, word-budgeted narration, time-coded shot list with engine-specific prompts, continuity bible, publishing kit, cost estimate and QA checks.',
  {
    topic: z.string().describe('What the video is about, including the arc (origin → breakthroughs → today → next)'),
    title: z.string().optional(),
    audience: z.string().optional(),
    tone: z.string().optional(),
    style: z.enum(['documentary', 'cinematic', 'educational', 'retro_futurism', 'minimal_motion_graphics']).optional(),
    durationSec: z.number().int().min(15).max(1800).optional().describe('Runtime in seconds (default 60)'),
    target: z.enum(['youtube_long', 'youtube_shorts', 'instagram_reel', 'instagram_feed', 'tiktok']).optional(),
    engine: z.enum(['hyperframes', 'higgsfield', 'krea']).optional(),
    animationMode: z.enum(['2d_kinetic', '3d_threejs']).optional(),
    kreaModel: z.string().optional().describe('Krea model id, e.g. bytedance/seedance-2-5'),
    voiceId: z.string().optional(),
    voiceName: z.string().optional(),
    ctaText: z.string().optional(),
    referenceTranscript: z.string().optional().describe('Transcript text to emulate structure from (never copied)'),
    referenceUrl: z.string().optional(),
  },
  async (brief) => {
    try { return asText(await api('/api/explainer/generate', { method: 'POST', body: brief })) } catch (e) { return asError(e) }
  },
)

server.tool(
  'explainer_validate_plan',
  'Run the mistake-catching checks (runtime cap, word budget, timeline coverage, shot pacing, on-screen text length, text-in-frame prompts, camera vocabulary, Krea clip caps, hook speed, CTA, 3D asset slots) on a plan JSON.',
  { plan: z.record(z.any()).describe('An ExplainerPlan object, e.g. the output of explainer_generate_plan after edits') },
  async ({ plan }) => {
    try { return asText(await api('/api/explainer/validate', { method: 'POST', body: { plan } })) } catch (e) { return asError(e) }
  },
)

server.tool(
  'explainer_krea_clip',
  'Submit a Krea video generation for one shot (or poll an existing job with job_id). Use draft=true for a cheap 480p structure check first.',
  {
    job_id: z.string().optional().describe('Poll this job instead of submitting'),
    model: z.string().optional(),
    prompt: z.string().optional(),
    aspect_ratio: z.enum(['16:9', '9:16', '1:1', '3:4', '4:3', '21:9']).optional(),
    duration: z.number().optional(),
    resolution: z.enum(['480p', '720p', '1080p']).optional(),
    draft: z.boolean().optional(),
    start_image: z.string().optional(),
    reference_images: z.array(z.string()).optional(),
    preflight: z.boolean().optional().describe('Return a cost quote instead of generating'),
  },
  async (args) => {
    try {
      if (args.job_id) return asText(await api(`/api/explainer/krea?job=${encodeURIComponent(args.job_id)}`))
      return asText(await api('/api/explainer/krea', { method: 'POST', body: args }))
    } catch (e) { return asError(e) }
  },
)

server.tool(
  'explainer_create_video',
  'Hand a plan to the Video Studio: creates a videos row with script, hyperframes and metadata.explainer, targeting the ExplainerReel Remotion composition. Returns the video id; render via POST /api/videos/render.',
  { plan: z.record(z.any()), title: z.string().optional() },
  async ({ plan, title }) => {
    try { return asText(await api('/api/explainer/handoff', { method: 'POST', body: { plan, title } })) } catch (e) { return asError(e) }
  },
)

server.tool(
  'explainer_voice',
  'Record the narration with ElevenLabs (word timestamps), store the MP3, and re-time every shot so it starts on a spoken word with handovers inside real silence. Returns the updated plan with plan.voice and fresh QA.',
  {
    plan: z.record(z.any()),
    speed: z.number().min(0.7).max(1.2).optional(),
    stability: z.number().min(0).max(1).optional(),
    similarity: z.number().min(0).max(1).optional(),
    style: z.number().min(0).max(1).optional(),
  },
  async (args) => {
    try { return asText(await api('/api/explainer/voice', { method: 'POST', body: args })) } catch (e) { return asError(e) }
  },
)

server.tool(
  'explainer_render',
  'Render a plan locally with the ExplainerReel Remotion composition (remotion/). draft=true gives a half-size DRAFT-stamped preview; otherwise the final render runs check_render.py and loudness.py --fix. Returns the output path and check output. Needs Node, ffmpeg, python3+numpy on this machine; set CHROME to a Chrome binary and REMOTION_GL=swangle when no GPU.',
  { plan: z.record(z.any()), draft: z.boolean().optional(), guides: z.boolean().optional(), gl: z.enum(['angle', 'swangle', 'egl', 'swiftshader']).optional() },
  async ({ plan, draft, guides, gl }) => {
    const f = planToFile(plan)
    const a = ['scripts/render_explainer.mjs', f]
    if (draft) a.push('--draft')
    if (guides) a.push('--guides')
    if (gl) a.push('--gl', gl)
    const r = await local('node', a, 90 * 60_000)
    const file = r.out.split('\n').filter((l) => l.trim().endsWith('.mp4')).pop() || null
    return asText({ pass: r.pass, file, out: r.out })
  },
)

server.tool(
  'explainer_stills',
  'Render single frames of a plan at the given seconds (half size) to look at before any video. Returns PNG paths.',
  { plan: z.record(z.any()), seconds: z.array(z.number()).min(1), guides: z.boolean().optional() },
  async ({ plan, seconds, guides }) => {
    const f = planToFile(plan)
    const a = ['scripts/render_explainer.mjs', f, '--stills', seconds.join(','), '--draft']
    if (guides) a.push('--guides')
    const r = await local('node', a)
    return asText({ pass: r.pass, files: r.out.split('\n').filter((l) => l.trim().endsWith('.png')), out: r.out })
  },
)

server.tool(
  'explainer_check_render',
  'Run the render checks on an MP4: freeze (>1.2s still), hard cuts/snaps, camera too fast, freeze-then-jump, short shots, and loudness (-14 LUFS / -1.5 dBTP). PASS/WARN/FAIL per check.',
  { mp4: z.string(), shots: z.array(z.record(z.any())).optional(), fix_loudness: z.boolean().optional() },
  async ({ mp4, shots, fix_loudness }) => {
    const py = process.env.PYTHON || 'python3'
    const a = ['scripts/check_render.py', mp4, '--json']
    if (shots) { const f = path.join(os.tmpdir(), `explainer-shots-${Date.now()}.json`); fs.writeFileSync(f, JSON.stringify(shots)); a.push('--shots', f) }
    const r1 = await local(py, a)
    const r2 = await local(py, ['scripts/loudness.py', mp4, ...(fix_loudness ? ['--fix'] : [])])
    return asText({ pass: r1.pass && r2.pass, render_checks: r1.out, loudness: r2.out })
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
