/**
 * POST /api/explainer/generate — Turn a topic brief into a full explainer production plan.
 *
 * Body: ExplainerBrief
 * Returns: ExplainerPlan (hook, chapters, narration script, hyperframe-style shot list with
 *          engine-specific prompts, continuity bible, publishing kit, cost estimate)
 *
 * Uses OpenAI (OPENAI_API_KEY) with JSON output. Without a key it falls back to a deterministic
 * template so the studio is still usable offline / in preview deployments.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import OpenAI from 'openai'

import { authorizeExplainerRequest } from '@/lib/explainer/auth'
import type { ExplainerBrief, ExplainerPlan, ExplainerShot } from '@/lib/explainer/types'
import {
  ANIMATION_MODES, ASSET_3D_LIBRARY, ENGINES, KREA_VIDEO_MODELS, PLAN_STYLES, WORDS_PER_SECOND,
  getEngine, getSocialTarget, targetWordCount,
} from '@/lib/explainer/presets'
import { runPlanChecks } from '@/lib/explainer/checks'
import { rulesAsPrompt } from '@/lib/explainer/rules'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const TRANSITIONS: ExplainerShot['transition'][] = ['fade', 'slide_left', 'zoom_in', 'dissolve', 'glitch']

function shotLengthFor(durationSec: number, isVertical: boolean): number {
  if (isVertical) return durationSec <= 60 ? 4 : 5
  if (durationSec <= 120) return 6
  if (durationSec <= 360) return 8
  
return 10
}

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)) }

/** Normalize whatever the LLM returned into a strict, time-coded shot list. */
function normalizeShots(raw: any[], brief: ExplainerBrief): ExplainerShot[] {
  const engine = getEngine(brief.engine)
  const shots = (Array.isArray(raw) ? raw : []).filter(s => s && (s.narration || s.visual_prompt))

  if (!shots.length) return []

  // Proportional timing by narration word count, so a long sentence gets a longer shot.
  const weights = shots.map(s => Math.max(3, String(s.narration || '').split(/\s+/).filter(Boolean).length))
  const total = weights.reduce((a, b) => a + b, 0)
  let cursor = 0

  return shots.map((s, idx) => {
    const span = Number(((weights[idx] / total) * brief.durationSec).toFixed(1))
    const start = Number(cursor.toFixed(1))
    const end = idx === shots.length - 1 ? brief.durationSec : Number((cursor + span).toFixed(1))

    cursor = end

    const camera = engine.cameraMotions.includes(s.camera_motion) ? s.camera_motion : engine.cameraMotions[idx % engine.cameraMotions.length]
    const transition = TRANSITIONS.includes(s.transition) ? s.transition : (idx === 0 ? 'fade' : TRANSITIONS[idx % 3 + 1])

    return {
      order: idx + 1,
      timestamp_start: start,
      timestamp_end: end,
      narration: String(s.narration || '').trim(),
      onscreen_text: String(s.onscreen_text || '').trim().slice(0, 60),
      visual_prompt: String(s.visual_prompt || '').trim(),
      camera_motion: camera,
      transition,
      era: s.era ? String(s.era) : undefined,
      sound_design: s.sound_design ? String(s.sound_design) : undefined,
      assets_3d: Array.isArray(s.assets_3d)
        ? s.assets_3d.filter((a: any) => a && (a.slot || a.name)).map((a: any) => ({
          slot: ASSET_3D_LIBRARY.some(x => x.id === a.slot) ? String(a.slot) : 'prop',
          name: String(a.name || a.slot || ''),
          source_url: a.source_url ? String(a.source_url) : undefined,
        }))
        : undefined,
      engine_prompt: '',
    }
  })
}

/** Render the shot into the exact prompt dialect each engine likes. */
function buildEnginePrompt(shot: ExplainerShot, brief: ExplainerBrief, bible: ExplainerPlan['continuity_bible']): string {
  const target = getSocialTarget(brief.target)
  const dur = Math.max(2, Math.round(shot.timestamp_end - shot.timestamp_start))
  const base = `${shot.visual_prompt}. ${bible.subject}. ${bible.lighting}, ${bible.palette}, ${bible.lens}.`

  switch (brief.engine) {
    case 'higgsfield':
      return [
        `[Higgsfield DoP · motion: ${shot.camera_motion} · ${target.aspect} · ${dur}s]`,
        base,
        `Reference continuity: lock subject identity across shots; motifs: ${bible.recurring_motifs.join(', ')}.`,
        `Avoid: ${bible.negative_prompt}.`,
      ].join('\n')

    case 'krea': {
      const model = KREA_VIDEO_MODELS.find(m => m.id === brief.kreaModel) || KREA_VIDEO_MODELS[0]

      
return [
        `[Krea · ${model.name} · aspect ${target.aspect} · duration ${clamp(dur, 4, model.maxSeconds)}s]`,
        `${base} Camera: ${shot.camera_motion.replace(/_/g, ' ')}.`,
        shot.sound_design ? `Sound: ${shot.sound_design}.` : '',
        `No on-screen text, no captions, no watermarks (text is added in post). Avoid: ${bible.negative_prompt}.`,
      ].filter(Boolean).join('\n')
    }

    default:
      return [
        `[Hyperframe ${shot.order} · ${shot.timestamp_start}s–${shot.timestamp_end}s · ${shot.transition} · ${shot.camera_motion}]`,
        `Scene image: ${base}`,
        shot.onscreen_text ? `Kinetic text: "${shot.onscreen_text}"` : '',
      ].filter(Boolean).join('\n')
  }
}

function estimateCost(brief: ExplainerBrief, script: string, generatedBy: 'openai' | 'fallback') {
  const engine = getEngine(brief.engine)
  let perSec = engine.costPerSecond

  if (brief.engine === 'krea') perSec = (KREA_VIDEO_MODELS.find(m => m.id === brief.kreaModel) || KREA_VIDEO_MODELS[0]).costPerSecond
  const voice = (script.length * 0.03) / 1000
  const video = brief.durationSec * perSec
  const llm = generatedBy === 'openai' ? 0.02 : 0

  
return {
    voice_usd: Number(voice.toFixed(3)),
    video_usd: Number(video.toFixed(2)),
    llm_usd: llm,
    total_usd: Number((voice + video + llm).toFixed(2)),
    engine_label: brief.engine === 'krea'
      ? `Krea · ${(KREA_VIDEO_MODELS.find(m => m.id === brief.kreaModel) || KREA_VIDEO_MODELS[0]).name}`
      : engine.label,
  }
}

// ── Deterministic fallback (no LLM key) ──
function fallbackPlan(brief: ExplainerBrief): Omit<ExplainerPlan, 'cost_estimate' | 'generated_by' | 'generated_at' | 'brief'> {
  const target = getSocialTarget(brief.target)
  const shotLen = shotLengthFor(brief.durationSec, target.aspect !== '16:9')
  const count = clamp(Math.round(brief.durationSec / shotLen), 4, 40)
  const topic = brief.topic.trim() || brief.title || 'the topic'

  const beats = [
    `Why ${topic} matters today`,
    'The origin moment and the problem it solved',
    'The first breakthrough and its limits',
    'The turning point that changed the trajectory',
    'The modern state of the art',
    'What comes next',
  ]

  const shotsRaw = Array.from({ length: count }, (_, i) => {
    const beat = beats[Math.floor((i / count) * beats.length)]

    
return {
      narration: i === 0
        ? `Here is the story of ${topic}, and why it changed everything.`
        : `${beat}. Each step built on the one before it.`,
      onscreen_text: i === 0 ? brief.title || topic : beat.split(' ').slice(0, 4).join(' '),
      visual_prompt: `${brief.style.replace(/_/g, ' ')} shot illustrating "${beat}" for a video about ${topic}`,
      camera_motion: getEngine(brief.engine).cameraMotions[i % getEngine(brief.engine).cameraMotions.length],
      transition: i === 0 ? 'fade' : TRANSITIONS[i % 3 + 1],
      assets_3d: brief.animationMode === '3d_threejs' ? [{ slot: 'hero_vehicle', name: `Hero subject for ${topic}` }, { slot: 'environment', name: beat }] : [],
    }
  })

  const script = shotsRaw.map(s => s.narration).join(' ')

  
return {
    hook: shotsRaw[0].narration,
    logline: `An immersive ${brief.style.replace(/_/g, ' ')} explainer on ${topic}.`,
    research_beats: beats,
    chapters: beats.map((b, i) => ({
      title: b,
      start_sec: Number(((i / beats.length) * brief.durationSec).toFixed(1)),
      end_sec: Number((((i + 1) / beats.length) * brief.durationSec).toFixed(1)),
      beat: b,
    })),
    script,
    shots: normalizeShots(shotsRaw, brief),
    continuity_bible: {
      subject: `Consistent hero subject for ${topic}`,
      palette: 'desaturated teal and amber',
      lighting: 'soft volumetric daylight',
      lens: '35mm, shallow depth of field',
      recurring_motifs: ['timeline ribbon', 'era date badge', 'scale comparison'],
      negative_prompt: 'text, watermark, logo, blurry, extra limbs, distorted geometry',
    },
    publishing: {
      title_options: [brief.title || `The Evolution of ${topic}`, `${topic}: The Full Story in ${Math.round(brief.durationSec / 60) || 1} Minute(s)`, `How ${topic} Changed the World`],
      description: `${brief.title || topic} — an immersive explainer. ${brief.ctaText}`.trim(),
      hashtags: ['#explainer', '#history', '#documentary'],
      thumbnail_concepts: ['Split frame: oldest vs newest version of the subject', 'Hero subject mid-motion with a bold year badge'],
    },
  }
}

// ── OpenAI generation ──
async function openAiPlan(brief: ExplainerBrief, apiKey: string) {
  const openai = new OpenAI({ apiKey })
  const target = getSocialTarget(brief.target)
  const engine = getEngine(brief.engine)
  const style = PLAN_STYLES.find(s => s.id === brief.style)
  const isVertical = target.aspect !== '16:9'
  const shotLen = shotLengthFor(brief.durationSec, isVertical)
  const shotCount = clamp(Math.round(brief.durationSec / shotLen), 4, 60)
  const words = targetWordCount(brief.durationSec)

  const system = `You are a showrunner for immersive, cinematic explainer videos (think: "the evolution of trains, from steam locomotives to Japan's bullet trains").
You write tight, factual, vivid narration and a shot-by-shot storyboard that an AI video pipeline can render.
Obey these house rules (DO / DON'T) in every shot:

${rulesAsPrompt()}

Respond with a single JSON object only.`

  const referenceBlock = brief.referenceTranscript?.trim()
    ? `\n\nREFERENCE VIDEO TRANSCRIPT (emulate its STRUCTURE and PACING — the hook pattern, how it escalates, how it lands — never copy its sentences):\n"""${brief.referenceTranscript.trim().slice(0, 12000)}"""`
    : ''

  const user = `TOPIC: ${brief.topic}
WORKING TITLE: ${brief.title || '(choose one)'}
AUDIENCE: ${brief.audience || 'curious general audience'}
STYLE: ${style?.label} — ${style?.desc}
TONE: ${brief.tone || 'confident, warm, awe-inspiring'}
PLATFORM: ${target.label} (${target.aspect}, ${target.width}x${target.height}). ${target.notes} Caption style: ${target.captionStyle}
RUNTIME: exactly ~${brief.durationSec} seconds → narration of about ${words} words (${WORDS_PER_SECOND} words/sec).
ENGINE: ${engine.label} — ${engine.tagline}. Allowed camera_motion values: ${engine.cameraMotions.join(', ')}.
ANIMATION MODE: ${ANIMATION_MODES.find(m => m.id === brief.animationMode)?.label} — ${ANIMATION_MODES.find(m => m.id === brief.animationMode)?.desc}
${brief.animationMode === '3d_threejs' ? `3D ASSET SLOTS (give each shot 1–3 "assets_3d" entries using these slot ids): ${ASSET_3D_LIBRARY.map(a => `${a.id} = ${a.label}`).join('; ')}. Name assets concretely and era-accurately (e.g. "1829 Rocket-class 0-2-2 steam locomotive").` : 'No 3D assets; visuals are stills + kinetic text + CSS camera moves, so make each visual_prompt a strong single still image.'}
CTA (last shot only): ${brief.ctaText || 'none'}${referenceBlock}

Return JSON with this exact shape:
{
  "hook": "first 1–2 sentences, pattern-interrupt",
  "logline": "one sentence",
  "research_beats": ["5–8 verified factual beats with years/numbers where relevant"],
  "chapters": [{"title": "", "start_sec": 0, "end_sec": 0, "beat": ""}],
  "shots": [  // exactly ${shotCount} items, chronological, together covering the full narration
    {
      "narration": "the exact words spoken over this shot (1–2 sentences)",
      "onscreen_text": "≤6 words: headline, year badge, or stat (may be empty)",
      "visual_prompt": "rich, concrete visual description: subject, setting, era-accurate details, motion, atmosphere. No text in frame.",
      "camera_motion": "one of the allowed values",
      "transition": "fade | slide_left | zoom_in | dissolve | glitch",
      "era": "e.g. 1829",
      "sound_design": "ambient/sfx cue",
      "assets_3d": [{"slot": "hero_vehicle", "name": "concrete era-accurate model name"}]  // only in 3D mode, else []
    }
  ],
  "continuity_bible": {"subject": "", "palette": "", "lighting": "", "lens": "", "recurring_motifs": [""], "negative_prompt": ""},
  "publishing": {"title_options": ["", "", ""], "description": "", "hashtags": [""], "thumbnail_concepts": ["", ""], "pinned_comment": ""}
}`

  const res = await openai.chat.completions.create({
    model: process.env.EXPLAINER_LLM_MODEL || 'gpt-4o',
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  })

  const content = res.choices[0]?.message?.content || '{}'

  
return JSON.parse(content)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeExplainerRequest(request)

    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    const brief: ExplainerBrief = {
      title: String(body.title || '').trim(),
      topic: String(body.topic || '').trim(),
      audience: String(body.audience || '').trim(),
      style: PLAN_STYLES.some(s => s.id === body.style) ? body.style : 'documentary',
      tone: String(body.tone || '').trim(),
      durationSec: clamp(Number(body.durationSec) || 60, 15, 1800),
      target: body.target || 'youtube_long',
      engine: ENGINES.some(e => e.id === body.engine) ? body.engine : 'hyperframes',
      animationMode: ANIMATION_MODES.some(m => m.id === body.animationMode) ? body.animationMode : '2d_kinetic',
      kreaModel: String(body.kreaModel || KREA_VIDEO_MODELS[0].id),
      voiceId: String(body.voiceId || 'GGRMgbKfr7QscdcrvWga'),
      voiceName: String(body.voiceName || 'Kai'),
      ctaText: String(body.ctaText || '').trim(),
      referenceTranscript: body.referenceTranscript ? String(body.referenceTranscript) : undefined,
      referenceUrl: body.referenceUrl ? String(body.referenceUrl) : undefined,
    }

    if (!brief.topic) return NextResponse.json({ error: 'Describe the topic first.' }, { status: 400 })

    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY
    let generatedBy: 'openai' | 'fallback' = 'fallback'
    let raw: any = null

    if (apiKey) {
      try {
        raw = await openAiPlan(brief, apiKey)
        generatedBy = 'openai'
      } catch (e: any) {
        console.warn('[Explainer] OpenAI failed, using fallback:', e.message)
      }
    }

    const fb = fallbackPlan(brief)
    const shots = raw ? normalizeShots(raw.shots, brief) : fb.shots

    const bible = raw?.continuity_bible && raw.continuity_bible.subject ? {
      subject: String(raw.continuity_bible.subject || ''),
      palette: String(raw.continuity_bible.palette || ''),
      lighting: String(raw.continuity_bible.lighting || ''),
      lens: String(raw.continuity_bible.lens || ''),
      recurring_motifs: Array.isArray(raw.continuity_bible.recurring_motifs) ? raw.continuity_bible.recurring_motifs.map(String) : [],
      negative_prompt: String(raw.continuity_bible.negative_prompt || fb.continuity_bible.negative_prompt),
    } : fb.continuity_bible

    const finalShots = (shots.length ? shots : fb.shots).map(s => ({ ...s, engine_prompt: buildEnginePrompt(s, brief, bible) }))
    const script = finalShots.map(s => s.narration).filter(Boolean).join(' ')

    const plan: ExplainerPlan = {
      brief,
      hook: String(raw?.hook || fb.hook),
      logline: String(raw?.logline || fb.logline),
      research_beats: Array.isArray(raw?.research_beats) && raw.research_beats.length ? raw.research_beats.map(String) : fb.research_beats,
      chapters: Array.isArray(raw?.chapters) && raw.chapters.length
        ? raw.chapters.map((c: any) => ({ title: String(c.title || ''), start_sec: Number(c.start_sec) || 0, end_sec: Number(c.end_sec) || 0, beat: String(c.beat || '') }))
        : fb.chapters,
      script,
      shots: finalShots,
      continuity_bible: bible,
      publishing: {
        title_options: Array.isArray(raw?.publishing?.title_options) && raw.publishing.title_options.length ? raw.publishing.title_options.map(String) : fb.publishing.title_options,
        description: String(raw?.publishing?.description || fb.publishing.description),
        hashtags: Array.isArray(raw?.publishing?.hashtags) ? raw.publishing.hashtags.map(String) : fb.publishing.hashtags,
        thumbnail_concepts: Array.isArray(raw?.publishing?.thumbnail_concepts) ? raw.publishing.thumbnail_concepts.map(String) : fb.publishing.thumbnail_concepts,
        pinned_comment: raw?.publishing?.pinned_comment ? String(raw.publishing.pinned_comment) : undefined,
      },
      cost_estimate: estimateCost(brief, script, generatedBy),
      generated_by: generatedBy,
      generated_at: new Date().toISOString(),
    }

    plan.qa = runPlanChecks(plan)

    return NextResponse.json(plan)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Generation error' }, { status: 500 })
  }
}
