/**
 * Explainer Studio — "checks that catch every mistake".
 * Pure functions, safe on client and server. Each check returns pass / warn / error.
 */

import type { ExplainerPlan, PlanCheck } from './types'
import { ENGINES, KREA_VIDEO_MODELS, WORDS_PER_SECOND, getEngine, getSocialTarget, targetWordCount } from './presets'

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

const TEXT_IN_FRAME = /\b(caption|subtitle|watermark|logo|headline text|typography|lettering|written text|sign reading|text overlay)\b/i

export function runPlanChecks(plan: ExplainerPlan): PlanCheck[] {
  const out: PlanCheck[] = []
  const { brief, shots, script, chapters } = plan
  const target = getSocialTarget(brief.target)
  const engine = getEngine(brief.engine)
  const push = (id: string, level: PlanCheck['level'], message: string, shotNos?: number[]) => out.push({ id, level, message, shots: shotNos })

  // 1. Runtime within platform limits
  if (brief.durationSec > target.maxSeconds) push('runtime_cap', 'error', `${brief.durationSec}s exceeds ${target.label} limit of ${target.maxSeconds}s.`)
  else push('runtime_cap', 'pass', `Runtime ${brief.durationSec}s fits ${target.label} (≤ ${target.maxSeconds}s).`)

  // 2. Narration word budget (±15%)
  const words = wordCount(script)
  const budget = targetWordCount(brief.durationSec)
  const spoken = Math.round(words / WORDS_PER_SECOND)
  const drift = (words - budget) / Math.max(1, budget)

  if (Math.abs(drift) > 0.3) push('word_budget', 'error', `Script is ${words} words (~${spoken}s spoken) vs budget ${budget}. Narration will ${drift > 0 ? 'overrun' : 'leave dead air'}.`)
  else if (Math.abs(drift) > 0.15) push('word_budget', 'warn', `Script is ${words} words (~${spoken}s) vs budget ${budget}; trim or pad ${Math.abs(words - budget)} words.`)
  else push('word_budget', 'pass', `Script ${words} words ≈ ${spoken}s spoken, within budget (${budget}).`)

  // 3. Shots exist and cover the runtime contiguously
  if (!shots.length) { push('shots_exist', 'error', 'No shots in the storyboard.'); 

return out }

  const gaps: number[] = []

  for (let i = 1; i < shots.length; i++) if (Math.abs(shots[i].timestamp_start - shots[i - 1].timestamp_end) > 0.15) gaps.push(shots[i].order)
  const last = shots[shots.length - 1]

  if (gaps.length) push('coverage', 'error', 'Timeline has gaps or overlaps between shots.', gaps)
  else if (Math.abs(last.timestamp_end - brief.durationSec) > 0.5 || shots[0].timestamp_start > 0.5) push('coverage', 'error', `Shots cover ${shots[0].timestamp_start}s–${last.timestamp_end}s, not 0–${brief.durationSec}s.`)
  else push('coverage', 'pass', `${shots.length} shots cover the full ${brief.durationSec}s contiguously.`)

  // 4. Shot lengths sane for the format
  const isVertical = target.aspect !== '16:9'
  const minLen = 2, maxLen = isVertical ? 8 : 15
  const tooShort = shots.filter(s => s.timestamp_end - s.timestamp_start < minLen).map(s => s.order)
  const tooLong = shots.filter(s => s.timestamp_end - s.timestamp_start > maxLen).map(s => s.order)

  if (tooShort.length) push('shot_len_short', 'warn', `Shots under ${minLen}s read as flicker.`, tooShort)
  if (tooLong.length) push('shot_len_long', 'warn', `Shots over ${maxLen}s stall a ${isVertical ? 'vertical' : 'long-form'} video; split or add a camera move.`, tooLong)
  if (!tooShort.length && !tooLong.length) push('shot_len', 'pass', `All shots between ${minLen}s and ${maxLen}s.`)

  // 5. Every shot has narration and a visual
  const silent = shots.filter(s => !s.narration.trim()).map(s => s.order)
  const blind = shots.filter(s => wordCount(s.visual_prompt) < 8).map(s => s.order)

  if (silent.length) push('narration_missing', 'error', 'Shots without narration.', silent)
  if (blind.length) push('visual_thin', 'warn', 'Visual prompts under 8 words will generate generic footage.', blind)
  if (!silent.length && !blind.length) push('shot_content', 'pass', 'Every shot has narration and a concrete visual prompt.')

  // 6. Narration per shot matches shot length
  const mismatch = shots.filter(s => {
    const need = wordCount(s.narration) / WORDS_PER_SECOND
    const have = s.timestamp_end - s.timestamp_start

    
return need > have * 1.35
  }).map(s => s.order)

  if (mismatch.length) push('shot_pacing', 'warn', 'Narration is too long for the shot duration; the voice will spill into the next shot.', mismatch)
  else push('shot_pacing', 'pass', 'Per-shot narration fits each shot duration.')

  // 7. On-screen text short enough to read
  const wordy = shots.filter(s => wordCount(s.onscreen_text) > 6).map(s => s.order)

  if (wordy.length) push('onscreen_len', 'warn', 'On-screen text over 6 words is unreadable at mobile size.', wordy)
  else push('onscreen_len', 'pass', 'On-screen text is ≤ 6 words everywhere.')

  // 8. No baked-in text requested from the video model
  const baked = shots.filter(s => TEXT_IN_FRAME.test(s.visual_prompt)).map(s => s.order)

  if (baked.length) push('text_in_frame', 'warn', 'Visual prompt asks the model for text/logos in frame; models misspell. Keep text in the 2D overlay.', baked)
  else push('text_in_frame', 'pass', 'No visual prompt requests baked-in text.')

  // 9. Camera motion vocabulary valid for engine
  const badCam = shots.filter(s => !engine.cameraMotions.includes(s.camera_motion)).map(s => s.order)

  if (badCam.length) push('camera_vocab', 'error', `Camera motion not supported by ${engine.label}.`, badCam)
  else push('camera_vocab', 'pass', `Camera moves all valid for ${engine.label}.`)

  // 10. Krea model clip-length cap
  if (brief.engine === 'krea') {
    const model = KREA_VIDEO_MODELS.find(m => m.id === brief.kreaModel) || KREA_VIDEO_MODELS[0]
    const over = shots.filter(s => s.timestamp_end - s.timestamp_start > model.maxSeconds).map(s => s.order)

    if (over.length) push('krea_clip_cap', 'error', `${model.name} caps clips at ${model.maxSeconds}s; split these shots.`, over)
    else push('krea_clip_cap', 'pass', `All shots ≤ ${model.maxSeconds}s (${model.name} cap).`)
  }

  // 11. Hook lands fast
  const hookWords = wordCount(plan.hook)

  if (hookWords / WORDS_PER_SECOND > (isVertical ? 3 : 6)) push('hook_speed', 'warn', `Hook is ~${Math.round(hookWords / WORDS_PER_SECOND)}s spoken; aim for ≤ ${isVertical ? 3 : 6}s on ${target.label}.`)
  else push('hook_speed', 'pass', 'Hook lands inside the platform attention window.')

  // 12. Chapters cover runtime
  if (chapters.length) {
    const lastCh = chapters[chapters.length - 1]

    if (Math.abs(lastCh.end_sec - brief.durationSec) > brief.durationSec * 0.1) push('chapters', 'warn', `Chapters end at ${lastCh.end_sec}s, runtime is ${brief.durationSec}s.`)
    else push('chapters', 'pass', `${chapters.length} chapters span the runtime.`)
  }

  // 13. CTA present on the last shot when one was given
  if (brief.ctaText) {
    const lastText = `${last.narration} ${last.onscreen_text}`.toLowerCase()
    const key = brief.ctaText.toLowerCase().split(/\s+/).slice(0, 2).join(' ')

    if (!lastText.includes(key) && !/follow|subscribe|watch|next|link/.test(lastText)) push('cta_last', 'warn', 'Closing CTA is not reflected in the final shot.', [last.order])
    else push('cta_last', 'pass', 'Final shot carries the CTA.')
  }

  // 14. 3D mode needs asset slots
  if (brief.animationMode === '3d_threejs') {
    const noAssets = shots.filter(s => !s.assets_3d || !s.assets_3d.length).map(s => s.order)

    if (noAssets.length > shots.length / 2) push('assets_3d', 'warn', 'Most shots have no 3D asset slot; they will fall back to 2D kinetic rendering.', noAssets)
    else push('assets_3d', 'pass', 'Shots declare their 3D asset slots.')
  }

  // 15. Engine sanity
  if (!ENGINES.some(e => e.id === brief.engine)) push('engine', 'error', `Unknown engine ${brief.engine}.`)

  return out
}

export function summarizeChecks(checks: PlanCheck[]) {
  return {
    errors: checks.filter(c => c.level === 'error').length,
    warnings: checks.filter(c => c.level === 'warn').length,
    passed: checks.filter(c => c.level === 'pass').length,
    ok: !checks.some(c => c.level === 'error'),
  }
}
