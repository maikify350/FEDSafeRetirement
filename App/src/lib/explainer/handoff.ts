/**
 * Build the `videos` insert payload from an ExplainerPlan.
 * Shared by the studio UI and POST /api/explainer/handoff (MCP) so both hand-offs stay identical.
 */
import type { ExplainerPlan } from './types'
import { PLAN_STYLES, getSocialTarget } from './presets'

const HYPERFRAME_CAMERAS = ['static', 'pan_slow_right', 'push_forward', 'orbit', 'tilt_up']

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)

  
return m ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`
}

export function buildVideoPayload(plan: ExplainerPlan, opts: { title?: string; clipUrls?: Record<number, string> } = {}) {
  const { brief } = plan
  const target = getSocialTarget(brief.target)
  const clipUrls = opts.clipUrls || {}
  const videoModel = brief.engine === 'higgsfield' ? 'higgsfield' : brief.engine === 'krea' ? 'seeddance' : 'remotion-kinetic'
  const stamp = Date.now()

  return {
    title: (opts.title || brief.title || plan.publishing.title_options[0] || 'Explainer').trim(),
    format: brief.durationSec > 180 ? 'long' : 'short',
    generation_mode: brief.engine === 'hyperframes' ? 'static' : 'motion',
    video_model: videoModel,
    duration_sec: brief.durationSec,
    script: plan.script,
    ai_directive: `${plan.logline}\n\nStyle: ${PLAN_STYLES.find(s => s.id === brief.style)?.label}. Animation: ${brief.animationMode}. Continuity: ${plan.continuity_bible.subject}; ${plan.continuity_bible.palette}; ${plan.continuity_bible.lighting}; ${plan.continuity_bible.lens}. Avoid: ${plan.continuity_bible.negative_prompt}`,
    cta_text: brief.ctaText,
    tts_engine: 'elevenlabs',
    voice_id: brief.voiceId,
    voice_name: brief.voiceName,
    hyperframes: plan.shots.map(s => ({
      id: `hf_${s.order}_${stamp}`,
      order: s.order,
      timestamp_start: s.timestamp_start,
      timestamp_end: s.timestamp_end,
      text_segment: s.narration,
      visual_prompt: s.visual_prompt,
      transition: s.transition,
      camera_motion: HYPERFRAME_CAMERAS.includes(s.camera_motion) ? s.camera_motion : 'push_forward',
      asset_url: clipUrls[s.order] || undefined,

      // Explainer-only fields (ignored by the legacy compositions, read by ExplainerReel)
      onscreen_text: s.onscreen_text,
      era: s.era,
      engine_camera_motion: s.camera_motion,
      animation_mode: brief.animationMode,
      assets_3d: s.assets_3d || [],
    })),
    platforms: [brief.target],
    video_source: 'custom',
    end_screen_text: brief.ctaText,
    onscreen_structure: plan.chapters.map(c => `${fmtTime(c.start_sec)} ${c.title}`).join(' · '),
    broll_notes: plan.shots.map(s => `#${s.order} ${s.engine_prompt}`).join('\n\n'),
    metadata: {
      remotion_composition: 'ExplainerReel',
      explainer: {
        brief,
        engine: brief.engine,
        animation_mode: brief.animationMode,
        krea_model: brief.engine === 'krea' ? brief.kreaModel : null,
        social_target: brief.target,
        aspect: target.aspect,
        width: target.width,
        height: target.height,
        chapters: plan.chapters,
        publishing: plan.publishing,
        continuity_bible: plan.continuity_bible,
        cost_estimate: plan.cost_estimate,
        qa: plan.qa || [],
        generated_by: plan.generated_by,
        reference_url: brief.referenceUrl || null,
      },
    },
  }
}
