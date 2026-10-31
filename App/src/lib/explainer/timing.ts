/**
 * Explainer Studio — voice-first timing.
 *
 * The voice is recorded first (ElevenLabs "with timestamps" returns the start/end of every character).
 * From that we derive word timings, the silences between sentences, caption blocks, and then re-time every
 * shot so each one starts on a spoken word and hands over inside real silence. Pure functions; no I/O.
 */

import type { ExplainerPlan, ExplainerShot } from './types'

export interface WordTiming {

  /** The word as written in the script. */
  w: string

  /** Start / end in seconds. */
  t: number
  e: number
}

export interface CaptionBlock {
  shot: number

  /** Indices into the words array. */
  words: number[]

  /** Index of the key word (bold + marker) within `words`, or -1. */
  key: number
}

export interface VoiceTiming {
  duration: number
  words: WordTiming[]
  silences: [number, number][]
  caption_blocks: CaptionBlock[]

  /** Words per second over the spoken span. */
  pace: number
}

export interface ElevenAlignment {
  characters: string[]
  character_start_times_seconds: number[]
  character_end_times_seconds: number[]
}

export const MAX_CAPTION_WORDS = 8
export const MIN_HANDOVER_SILENCE = 0.15
export const PACE_RANGE: [number, number] = [2.6, 3.8]

const isSpace = (c: string) => /\s/.test(c)

/** Collapse character timings into word timings. Words are split on whitespace, matching the script text. */
export function wordsFromAlignment(a: ElevenAlignment): WordTiming[] {
  const out: WordTiming[] = []
  let cur = ''
  let start = -1
  let end = 0

  for (let i = 0; i < a.characters.length; i++) {
    const c = a.characters[i]

    if (isSpace(c)) {
      if (cur) out.push({ w: cur, t: start, e: end })
      cur = ''
      start = -1
      continue
    }

    if (start < 0) start = a.character_start_times_seconds[i]
    end = a.character_end_times_seconds[i]
    cur += c
  }

  if (cur) out.push({ w: cur, t: start, e: end })

  return out.map(w => ({ w: w.w, t: round(w.t), e: round(w.e) }))
}

const round = (n: number) => Math.round(n * 1000) / 1000

/** Gaps between consecutive words longer than `minGap` seconds. */
export function detectSilences(words: WordTiming[], minGap = 0.12): [number, number][] {
  const out: [number, number][] = []

  for (let i = 1; i < words.length; i++) {
    const gap = words[i].t - words[i - 1].e

    if (gap >= minGap) out.push([words[i - 1].e, words[i].t])
  }

  
return out
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9$€%]/g, '')

/**
 * Map each shot's narration onto the word list by walking the words in order.
 * Returns, per shot, the index range [first, last] of its words (inclusive), or null when nothing matched.
 */
export function mapShotsToWords(shots: ExplainerShot[], words: WordTiming[]): (null | [number, number])[] {
  const ranges: (null | [number, number])[] = []
  let cursor = 0

  for (const shot of shots) {
    const target = shot.narration.split(/\s+/).map(norm).filter(Boolean)

    if (!target.length) { ranges.push(null); continue }

    // Find the first word of the narration from the cursor onwards (tolerate small misalignments).
    let first = -1

    for (let i = cursor; i < Math.min(words.length, cursor + 40); i++) {
      if (norm(words[i].w) === target[0] && (target.length < 2 || i + 1 >= words.length || norm(words[i + 1].w) === target[1] || norm(words[i + 1].w) === '')) { first = i; break }
    }

    if (first < 0) {
      // Fallback: first word matching anywhere ahead
      first = words.findIndex((w, i) => i >= cursor && norm(w.w) === target[0])
    }

    if (first < 0) { ranges.push(null); continue }

    const last = Math.min(words.length - 1, first + target.length - 1)

    ranges.push([first, last])
    cursor = last + 1
  }

  
return ranges
}

/** Split a shot's words into caption blocks of at most MAX_CAPTION_WORDS, breaking at punctuation when possible. */
export function buildCaptionBlocks(shots: ExplainerShot[], words: WordTiming[], ranges: (null | [number, number])[]): CaptionBlock[] {
  const blocks: CaptionBlock[] = []

  shots.forEach((shot, si) => {
    const r = ranges[si]

    if (!r) return
    const idx = Array.from({ length: r[1] - r[0] + 1 }, (_, k) => r[0] + k)
    let cur: number[] = []

    const flush = () => {
      if (!cur.length) return

      // Key word: the longest word with a digit or capital, else the longest word.
      let key = -1
      let best = 0

      cur.forEach((wi, k) => {
        const w = words[wi].w
        const score = (/\d/.test(w) ? 100 : 0) + (/^[A-Z]/.test(w) && k > 0 ? 20 : 0) + w.replace(/[^a-z0-9]/gi, '').length

        if (score > best) { best = score; key = k }
      })
      blocks.push({ shot: shot.order, words: cur, key })
      cur = []
    }

    for (const wi of idx) {
      cur.push(wi)
      const w = words[wi].w
      const punct = /[,.;:!?]$/.test(w)

      if (cur.length >= MAX_CAPTION_WORDS || (punct && cur.length >= 3)) flush()
    }

    flush()
  })
  
return blocks
}

/**
 * Re-time shots to the voice. Each shot starts halfway through the silence before its first word
 * (showhow-style handover), the first shot at 0 and the last shot runs to the end of the audio.
 */
export function retimeShots(shots: ExplainerShot[], words: WordTiming[], duration: number): { shots: ExplainerShot[]; unmatched: number[] } {
  const ranges = mapShotsToWords(shots, words)
  const unmatched: number[] = []
  const starts: number[] = []

  shots.forEach((s, i) => {
    const r = ranges[i]

    if (!r) { unmatched.push(s.order); starts.push(NaN); 

return }

    if (i === 0) { starts.push(0); 

return }

    const prevEnd = r[0] > 0 ? words[r[0] - 1].e : 0

    starts.push(round((prevEnd + words[r[0]].t) / 2))
  })

  // Fill unmatched starts by interpolation so the timeline stays contiguous.
  for (let i = 0; i < starts.length; i++) {
    if (!Number.isNaN(starts[i])) continue
    const prev = i > 0 ? starts[i - 1] : 0
    let j = i + 1

    while (j < starts.length && Number.isNaN(starts[j])) j++
    const next = j < starts.length ? starts[j] : duration
    const span = (next - prev) / (j - i + 1)

    for (let k = i; k < j; k++) starts[k] = round(prev + span * (k - i + 1))
  }

  const retimed = shots.map((s, i) => ({
    ...s,
    timestamp_start: i === 0 ? 0 : starts[i],
    timestamp_end: i === shots.length - 1 ? round(duration) : starts[i + 1],
  }))

  
return { shots: retimed, unmatched }
}

export function buildVoiceTiming(alignment: ElevenAlignment, shots: ExplainerShot[], audioDuration?: number): VoiceTiming & { shots: ExplainerShot[]; unmatched: number[] } {
  const words = wordsFromAlignment(alignment)
  const spokenEnd = words.length ? words[words.length - 1].e : 0
  const duration = round(Math.max(audioDuration || 0, spokenEnd + 0.7))
  const silences = detectSilences(words)
  const ranges = mapShotsToWords(shots, words)
  const caption_blocks = buildCaptionBlocks(shots, words, ranges)
  const { shots: retimed, unmatched } = retimeShots(shots, words, duration)
  const spoken = words.length ? words[words.length - 1].e - words[0].t : 0
  const pace = spoken > 0 ? round(words.length / spoken) : 0

  
return { duration, words, silences, caption_blocks, pace, shots: retimed, unmatched }
}

/** Timing-aware checks, only meaningful once a plan carries voice timing. */
export function timingChecks(plan: ExplainerPlan) {
  const v = plan.voice
  const out: { id: string; level: 'pass' | 'warn' | 'error'; message: string; shots?: number[] }[] = []

  if (!v || !v.words?.length) {
    out.push({ id: 'voice_timing', level: 'warn', message: 'No voice timing yet; shot times are estimates. Run "Voice & time" so every shot starts on a spoken word.' })
    
return out
  }

  out.push({ id: 'voice_timing', level: 'pass', message: `Voice recorded: ${v.words.length} words over ${v.duration}s; shots are timed to spoken words.` })

  if (v.pace < PACE_RANGE[0] || v.pace > PACE_RANGE[1]) out.push({ id: 'pace', level: 'warn', message: `Pace ${v.pace} words/s is outside ${PACE_RANGE[0]}–${PACE_RANGE[1]}; adjust voice speed and re-record.` })
  else out.push({ id: 'pace', level: 'pass', message: `Pace ${v.pace} words/s sits in the ${PACE_RANGE[0]}–${PACE_RANGE[1]} window.` })

  // Handovers inside real silence
  const bad: number[] = []

  for (let i = 1; i < plan.shots.length; i++) {
    const t = plan.shots[i].timestamp_start
    const gap = Math.max(0, ...v.silences.filter(([a, b]) => a <= t && t <= b).map(([a, b]) => b - a))

    if (gap < MIN_HANDOVER_SILENCE) bad.push(plan.shots[i].order)
  }

  if (bad.length) out.push({ id: 'handover_silence', level: 'error', message: `Scene change falls on speech, not inside ≥${MIN_HANDOVER_SILENCE}s of silence; start the shot at a sentence boundary.`, shots: bad })
  else out.push({ id: 'handover_silence', level: 'pass', message: 'Every scene change sits inside real silence.' })

  const longBlocks = v.caption_blocks.filter(b => b.words.length > MAX_CAPTION_WORDS).map(b => b.shot)

  if (longBlocks.length) out.push({ id: 'caption_block', level: 'error', message: `Caption block over ${MAX_CAPTION_WORDS} words.`, shots: Array.from(new Set(longBlocks)) })
  else out.push({ id: 'caption_block', level: 'pass', message: `All caption blocks ≤ ${MAX_CAPTION_WORDS} words.` })

  const unmatched = plan.voice?.unmatched_shots || []

  if (unmatched.length) out.push({ id: 'voice_match', level: 'warn', message: 'Narration for these shots could not be matched to the recording; their times were interpolated.', shots: unmatched })

  return out
}
