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

const transport = new StdioServerTransport()
await server.connect(transport)
