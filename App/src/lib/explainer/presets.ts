/**
 * Explainer Studio — shared presets (client + server safe, no secrets).
 *
 * The studio reproduces the "immersive explainer" production flow:
 *   topic brief → research beats → narration script → hyperframe storyboard
 *   → engine-specific shot prompts → clip generation → assembly/export per platform.
 */

export type SocialTarget =
  | 'youtube_long'
  | 'youtube_shorts'
  | 'instagram_reel'
  | 'instagram_feed'
  | 'tiktok'

export type EngineId = 'hyperframes' | 'higgsfield' | 'krea'

export type PlanStyle = 'documentary' | 'cinematic' | 'educational' | 'retro_futurism' | 'minimal_motion_graphics'

export interface SocialTargetPreset {
  id: SocialTarget
  label: string
  platform: 'YouTube' | 'Instagram' | 'TikTok'
  aspect: '16:9' | '9:16' | '1:1' | '4:5'
  width: number
  height: number
  maxSeconds: number
  recommendedSeconds: number[]
  captionStyle: string
  notes: string
}

export const SOCIAL_TARGETS: SocialTargetPreset[] = [
  {
    id: 'youtube_long',
    label: 'YouTube (long form)',
    platform: 'YouTube',
    aspect: '16:9',
    width: 1920,
    height: 1080,
    maxSeconds: 1800,
    recommendedSeconds: [180, 300, 480, 600],
    captionStyle: 'Lower-third chapter titles, sparse kinetic stat callouts',
    notes: 'Hook in first 15s, chapter markers every 60–90s, end screen with next video.',
  },
  {
    id: 'youtube_shorts',
    label: 'YouTube Shorts',
    platform: 'YouTube',
    aspect: '9:16',
    width: 1080,
    height: 1920,
    maxSeconds: 180,
    recommendedSeconds: [30, 45, 60],
    captionStyle: 'Large centered word-by-word captions, safe zone top 12% / bottom 20%',
    notes: 'Loopable ending, no end screen, hook in first 2s.',
  },
  {
    id: 'instagram_reel',
    label: 'Instagram Reel',
    platform: 'Instagram',
    aspect: '9:16',
    width: 1080,
    height: 1920,
    maxSeconds: 180,
    recommendedSeconds: [30, 45, 60, 90],
    captionStyle: 'Bold two-line captions mid-frame, avoid bottom 25% (UI overlap)',
    notes: 'Cover frame matters for grid; trending audio optional; 3–5 hashtags.',
  },
  {
    id: 'instagram_feed',
    label: 'Instagram Feed (4:5)',
    platform: 'Instagram',
    aspect: '4:5',
    width: 1080,
    height: 1350,
    maxSeconds: 60,
    recommendedSeconds: [30, 45, 60],
    captionStyle: 'Headline banner top, caption strip bottom',
    notes: 'Designed to be watched muted — on-screen text carries the story.',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    platform: 'TikTok',
    aspect: '9:16',
    width: 1080,
    height: 1920,
    maxSeconds: 600,
    recommendedSeconds: [30, 60, 90, 120],
    captionStyle: 'Punchy word-by-word captions, high-contrast pill backgrounds',
    notes: 'Open with a pattern-interrupt visual, fast cuts every 2–3s.',
  },
]

export const LENGTH_PRESETS = [
  { seconds: 30, label: '30s' },
  { seconds: 45, label: '45s' },
  { seconds: 60, label: '1 min' },
  { seconds: 90, label: '90s' },
  { seconds: 180, label: '3 min' },
  { seconds: 300, label: '5 min' },
  { seconds: 480, label: '8 min' },
  { seconds: 600, label: '10 min' },
]

export const PLAN_STYLES: { id: PlanStyle; label: string; desc: string }[] = [
  { id: 'documentary', label: 'Documentary', desc: 'Archival realism, muted palette, slow dolly moves, authoritative narration' },
  { id: 'cinematic', label: 'Cinematic', desc: 'Anamorphic look, dramatic lighting, sweeping fly-bys, orchestral pacing' },
  { id: 'educational', label: 'Educational', desc: 'Clear diagrams, labeled callouts, steady camera, friendly narrator' },
  { id: 'retro_futurism', label: 'Retro-futurism', desc: 'Period posters meet neon, bold typography, era-shift transitions' },
  { id: 'minimal_motion_graphics', label: 'Minimal motion graphics', desc: 'Flat shapes, kinetic type, isometric scenes, no photoreal footage' },
]

export interface EnginePreset {
  id: EngineId
  label: string
  tagline: string
  bestFor: string

  /** USD per generated second (rough planning numbers, surfaced in the cost estimate). */
  costPerSecond: number

  /** How the engine is driven from this app. */
  integration: 'remotion' | 'prompt_export' | 'krea_api'
  cameraMotions: string[]
}

export const ENGINES: EnginePreset[] = [
  {
    id: 'hyperframes',
    label: 'Hyperframes (Remotion)',
    tagline: 'Sentence-synced kinetic scenes rendered in-house',
    bestFor: 'Fast, cheap, brand-consistent explainers; stills + Ken Burns + kinetic text',
    costPerSecond: 0.0,
    integration: 'remotion',
    cameraMotions: ['static', 'pan_slow_right', 'push_forward', 'orbit', 'tilt_up'],
  },
  {
    id: 'higgsfield',
    label: 'Higgsfield DoP',
    tagline: 'Camera-motion presets with multi-reference continuity',
    bestFor: 'Hero shots that need a consistent subject (one locomotive design across eras)',
    costPerSecond: 0.028,
    integration: 'prompt_export',
    cameraMotions: ['drone_fly_by', 'dynamic_orbit', 'push_forward', 'pan_slow_right', 'fly_by_left', 'fly_by_right', 'crash_zoom', 'dolly_out'],
  },
  {
    id: 'krea',
    label: 'Krea video models',
    tagline: 'Pick any frontier model through one API',
    bestFor: 'Photoreal clips with native audio; long 20–30s continuous shots',
    costPerSecond: 0.03,
    integration: 'krea_api',
    cameraMotions: ['static', 'slow_dolly_in', 'tracking_shot', 'aerial_reveal', 'orbit', 'handheld'],
  },
]

/** Curated subset of Krea public API video models (ids from Krea `list_models`). */
export const KREA_VIDEO_MODELS = [
  { id: 'bytedance/seedance-2-5', name: 'Seedance 2.5', desc: 'Default. Up to 30s, 1080p, native audio, up to 50 references', maxSeconds: 30, costPerSecond: 0.035 },
  { id: 'bytedance/seedance-2', name: 'Seedance 2.0', desc: 'Flagship with native audio, references, frame animation', maxSeconds: 15, costPerSecond: 0.03 },
  { id: 'bytedance/seedance-2-fast', name: 'Seedance 2.0 Fast', desc: 'Faster/cheaper Seedance 2', maxSeconds: 15, costPerSecond: 0.018 },
  { id: 'google/veo-3.1', name: 'Veo 3.1', desc: 'Highest quality with audio', maxSeconds: 8, costPerSecond: 0.06 },
  { id: 'google/veo-3.1-fast', name: 'Veo 3.1 Fast', desc: 'Faster, affordable Veo 3.1 with audio', maxSeconds: 8, costPerSecond: 0.03 },
  { id: 'kling/kling-4', name: 'Kling 4.0', desc: 'Up to 30s at 1080p', maxSeconds: 30, costPerSecond: 0.035 },
  { id: 'kling/kling-3.0', name: 'Kling 3.0', desc: 'Audio, up to 15s', maxSeconds: 15, costPerSecond: 0.028 },
  { id: 'minimax/hailuo-2.3', name: 'Hailuo 2.3', desc: 'Dynamic motion, camera control', maxSeconds: 10, costPerSecond: 0.02 },
  { id: 'runway/gen-4.5', name: 'Runway Gen-4.5', desc: 'Native text-to-video, cinematic', maxSeconds: 10, costPerSecond: 0.04 },
  { id: 'alibaba/wan-3.0', name: 'Wan 3.0', desc: '30s clips, native audio, references', maxSeconds: 30, costPerSecond: 0.02 },
  { id: 'lightricks/ltx-video-2.5-pro', name: 'LTX-2.5 Pro', desc: 'Quality audio-video, 20s clips up to 4K', maxSeconds: 20, costPerSecond: 0.025 },
]

export const DEFAULT_KREA_MODEL = 'bytedance/seedance-2-5'

/** Narration pacing used across the app (words per second at tempo 1.0). */
export const WORDS_PER_SECOND = 2.58

export function targetWordCount(seconds: number, tempo = 1): number {
  // Leave ~12% of runtime for breathing room, transitions, and the hook card.
  return Math.round(seconds * WORDS_PER_SECOND * tempo * 0.88)
}

export function getSocialTarget(id: SocialTarget): SocialTargetPreset {
  return SOCIAL_TARGETS.find(t => t.id === id) || SOCIAL_TARGETS[0]
}

export function getEngine(id: EngineId): EnginePreset {
  return ENGINES.find(e => e.id === id) || ENGINES[0]
}

export function extractYouTubeId(input: string): string | null {
  const s = (input || '').trim()

  if (!s) return null
  if (/^[\w-]{11}$/.test(s)) return s

  try {
    const u = new URL(s)

    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0] || null
    if (u.searchParams.get('v')) return u.searchParams.get('v')
    const m = u.pathname.match(/\/(shorts|embed|live)\/([\w-]{11})/)

    if (m) return m[2]
  } catch {
    /* not a URL */
  }

  
return null
}
