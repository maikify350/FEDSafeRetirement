import type { EngineId, PlanStyle, SocialTarget } from './presets'

export interface ExplainerBrief {
  title: string
  topic: string
  audience: string
  style: PlanStyle
  tone: string
  durationSec: number
  target: SocialTarget
  engine: EngineId
  kreaModel: string
  voiceId: string
  voiceName: string
  ctaText: string

  /** Optional transcript of a reference video whose structure we want to emulate. */
  referenceTranscript?: string
  referenceUrl?: string
}

export interface ExplainerShot {
  order: number
  timestamp_start: number
  timestamp_end: number

  /** Exact narration spoken over the shot. */
  narration: string

  /** Short on-screen text (headline, stat pill, year badge). */
  onscreen_text: string

  /** Full visual description used as the generation prompt. */
  visual_prompt: string
  camera_motion: string
  transition: 'fade' | 'slide_left' | 'zoom_in' | 'dissolve' | 'glitch'

  /** Engine-specific rendering of the shot prompt. */
  engine_prompt: string
  era?: string
  sound_design?: string
}

export interface ExplainerChapter {
  title: string
  start_sec: number
  end_sec: number
  beat: string
}

export interface ExplainerPublishing {
  title_options: string[]
  description: string
  hashtags: string[]
  thumbnail_concepts: string[]
  pinned_comment?: string
}

export interface ExplainerPlan {
  brief: ExplainerBrief
  hook: string
  logline: string
  research_beats: string[]
  chapters: ExplainerChapter[]
  script: string
  shots: ExplainerShot[]
  continuity_bible: {
    subject: string
    palette: string
    lighting: string
    lens: string
    recurring_motifs: string[]
    negative_prompt: string
  }
  publishing: ExplainerPublishing
  cost_estimate: {
    voice_usd: number
    video_usd: number
    llm_usd: number
    total_usd: number
    engine_label: string
  }
  generated_by: 'openai' | 'fallback'
  generated_at: string
}
