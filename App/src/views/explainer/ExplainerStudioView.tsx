'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import ConfirmDialog from '@/components/ConfirmDialog'
import { downloadBlob, downloadJson } from '@/utils/exportDownload'
import { ELEVENLABS_VOICES } from '@/views/videos/VideoEditDialog'
import type { ExplainerBrief, ExplainerPlan, ExplainerShot, PlanCheck } from '@/lib/explainer/types'
import { runPlanChecks, summarizeChecks } from '@/lib/explainer/checks'
import { buildVideoPayload } from '@/lib/explainer/handoff'
import {
  ANIMATION_MODES, ASSET_3D_LIBRARY, DEFAULT_KREA_MODEL, ENGINES, KREA_VIDEO_MODELS, LENGTH_PRESETS, PIPELINE_STEPS, PLAN_STYLES, SOCIAL_TARGETS,
  getEngine, getSocialTarget, targetWordCount,
  type AnimationMode, type EngineId, type PlanStyle, type SocialTarget,
} from '@/lib/explainer/presets'

// ───────────────────────────── helpers ─────────────────────────────

const EXAMPLE_TOPIC = `The evolution of trains — from Stephenson's Rocket and the age of steam, through diesel and electrification, to Japan's Shinkansen bullet trains and today's maglev records. Show how each leap was driven by a bottleneck (speed, reliability, capacity) and end on what 600 km/h travel means for cities.`

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)

  
return m ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`
}

const copyText = async (text: string) => {
  try { await navigator.clipboard.writeText(text) } catch { /* ignore */ }
}

function planToMarkdown(plan: ExplainerPlan): string {
  const t = getSocialTarget(plan.brief.target)
  const lines: string[] = []

  lines.push(`# ${plan.brief.title || plan.publishing.title_options[0]}`)
  lines.push('', `**Platform:** ${t.label} (${t.aspect}) · **Runtime:** ${plan.brief.durationSec}s · **Engine:** ${plan.cost_estimate.engine_label} · **Voice:** ${plan.brief.voiceName}`)
  lines.push('', `**Logline:** ${plan.logline}`, '', `## Hook`, plan.hook)
  lines.push('', '## Research beats', ...plan.research_beats.map(b => `- ${b}`))
  lines.push('', '## Chapters', ...plan.chapters.map(c => `- ${fmtTime(c.start_sec)}–${fmtTime(c.end_sec)} **${c.title}** — ${c.beat}`))
  lines.push('', '## Narration script', plan.script)
  lines.push('', '## Continuity bible', `- Subject: ${plan.continuity_bible.subject}`, `- Palette: ${plan.continuity_bible.palette}`, `- Lighting: ${plan.continuity_bible.lighting}`, `- Lens: ${plan.continuity_bible.lens}`, `- Motifs: ${plan.continuity_bible.recurring_motifs.join(', ')}`, `- Negative prompt: ${plan.continuity_bible.negative_prompt}`)
  lines.push('', '## Shot list')

  for (const s of plan.shots) {
    lines.push('', `### Shot ${s.order} · ${fmtTime(s.timestamp_start)}–${fmtTime(s.timestamp_end)}${s.era ? ` · ${s.era}` : ''}`)
    lines.push(`**Narration:** ${s.narration}`)
    if (s.onscreen_text) lines.push(`**On-screen:** ${s.onscreen_text}`)
    lines.push(`**Camera:** ${s.camera_motion} · **Transition:** ${s.transition}`)
    if (s.sound_design) lines.push(`**Sound:** ${s.sound_design}`)
    lines.push('', '```', s.engine_prompt, '```')
  }

  lines.push('', '## Publishing kit', ...plan.publishing.title_options.map(x => `- ${x}`), '', plan.publishing.description, '', plan.publishing.hashtags.join(' '))
  lines.push('', '## Cost estimate', `Voice $${plan.cost_estimate.voice_usd} · Video $${plan.cost_estimate.video_usd} · LLM $${plan.cost_estimate.llm_usd} · **Total ≈ $${plan.cost_estimate.total_usd}**`)
  
return lines.join('\n')
}

interface KreaJobState { status: string; progress?: number | null; url?: string; error?: string; job_id?: string }

// ───────────────────────────── component ─────────────────────────────

export default function ExplainerStudioView() {
  // Brief
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('Curious general audience, 18–45')
  const [style, setStyle] = useState<PlanStyle>('documentary')
  const [tone, setTone] = useState('Confident, warm, awe-inspiring')
  const [durationSec, setDurationSec] = useState(60)
  const [customDuration, setCustomDuration] = useState('')
  const [target, setTarget] = useState<SocialTarget>('youtube_shorts')
  const [engine, setEngine] = useState<EngineId>('hyperframes')
  const [animationMode, setAnimationMode] = useState<AnimationMode>('2d_kinetic')
  const [kreaModel, setKreaModel] = useState(DEFAULT_KREA_MODEL)
  const [voiceId, setVoiceId] = useState(ELEVENLABS_VOICES[7].id)
  const [ctaText, setCtaText] = useState('Follow for the next chapter.')

  // Reference video
  const [refUrl, setRefUrl] = useState('')
  const [refTranscript, setRefTranscript] = useState('')
  const [refMeta, setRefMeta] = useState<{ title?: string; channel?: string; provider?: string; attempts?: string[] } | null>(null)
  const [refLoading, setRefLoading] = useState(false)
  const [refError, setRefError] = useState('')
  const [refOpen, setRefOpen] = useState(false)

  // Plan
  const [plan, setPlan] = useState<ExplainerPlan | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'script' | 'storyboard' | 'checks' | 'publishing'>('storyboard')
  const [copiedKey, setCopiedKey] = useState('')

  // Studio hand-off
  const [sending, setSending] = useState(false)
  const [voicing, setVoicing] = useState(false)
  const [voiceSpeed, setVoiceSpeed] = useState(1.05)
  const [sentVideoId, setSentVideoId] = useState<string | null>(null)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)

  // Krea
  const [kreaConfigured, setKreaConfigured] = useState<boolean | null>(null)
  const [kreaJobs, setKreaJobs] = useState<Record<number, KreaJobState>>({})
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const socialPreset = useMemo(() => getSocialTarget(target), [target])
  const enginePreset = useMemo(() => getEngine(engine), [engine])
  const words = useMemo(() => targetWordCount(durationSec), [durationSec])
  const selectedVoice = ELEVENLABS_VOICES.find(v => v.id === voiceId) || ELEVENLABS_VOICES[0]

  // Checks re-run live against the current plan (server also stores plan.qa)
  const checks: PlanCheck[] = useMemo(() => (plan ? runPlanChecks(plan) : []), [plan])
  const checkSummary = useMemo(() => summarizeChecks(checks), [checks])

  const pipelineStep = useMemo(() => {
    if (sentVideoId) return 7
    if (plan?.voice && Object.values(kreaJobs).some(j => j.status === 'completed')) return 6
    if (plan?.voice && checkSummary.ok) return 5
    if (plan?.voice) return 4
    if (plan) return 3
    if (refTranscript.trim()) return 2
    if (topic.trim()) return 1

    return 0
  }, [plan, sentVideoId, kreaJobs, checkSummary.ok, refTranscript, topic])

  useEffect(() => {
    fetch('/api/explainer/krea').then(r => r.json()).then(j => setKreaConfigured(Boolean(j.configured))).catch(() => setKreaConfigured(false))
  }, [])

  // Clamp duration to platform max when platform changes
  useEffect(() => {
    if (durationSec > socialPreset.maxSeconds) setDurationSec(socialPreset.recommendedSeconds[socialPreset.recommendedSeconds.length - 1])
  }, [socialPreset, durationSec])

  const flashCopied = (key: string) => {
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 1400)
  }

  // ── Reference transcript ──
  const handleFetchTranscript = async () => {
    if (!refUrl.trim()) return
    setRefLoading(true)
    setRefError('')
    setRefMeta(null)

    try {
      const res = await fetch('/api/explainer/transcript', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: refUrl }) })
      const json = await res.json()

      if (!res.ok) {
        setRefMeta({ title: json.title, channel: json.channel, attempts: json.attempts })
        setRefError(json.error || 'Transcript unavailable')
        
return
      }

      setRefTranscript(json.text || '')
      setRefMeta({ title: json.title, channel: json.channel, provider: json.provider, attempts: json.attempts })
    } catch (e: any) {
      setRefError(e.message || 'Transcript fetch failed')
    } finally {
      setRefLoading(false)
    }
  }

  // ── Generate plan ──
  const buildBrief = (): ExplainerBrief => ({
    title: title.trim(),
    topic: topic.trim(),
    audience: audience.trim(),
    style,
    tone: tone.trim(),
    durationSec,
    target,
    engine,
    animationMode,
    kreaModel,
    voiceId,
    voiceName: selectedVoice.name,
    ctaText: ctaText.trim(),
    referenceTranscript: refTranscript.trim() || undefined,
    referenceUrl: refUrl.trim() || undefined,
  })

  const handleGenerate = async () => {
    if (!topic.trim()) { setError('Describe the topic first.'); 

return }

    setGenerating(true)
    setError('')
    setSentVideoId(null)
    setKreaJobs({})

    try {
      const res = await fetch('/api/explainer/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildBrief()) })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Generation failed')
      setPlan(json)
      if (!title.trim() && json.publishing?.title_options?.[0]) setTitle(json.publishing.title_options[0])
      setTab('storyboard')
    } catch (e: any) {
      setError(e.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  // ── Voice first: record the take, then time every shot to the spoken words ──
  const handleVoice = async () => {
    if (!plan) return
    setVoicing(true)
    setError('')

    try {
      const res = await fetch('/api/explainer/voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, speed: voiceSpeed }) })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Voice recording failed')
      setPlan(json.plan)
      setDurationSec(Math.round(json.plan.brief.durationSec))
      setTab('checks')
    } catch (e: any) {
      setError(e.message || 'Voice recording failed')
    } finally {
      setVoicing(false)
    }
  }

  // ── Hand off to /videos (reuses the existing render pipeline) ──
  const handleSendToStudio = async () => {
    if (!plan) return
    setSending(true)
    setError('')

    try {
      const clipUrls: Record<number, string> = {}

      for (const [order, job] of Object.entries(kreaJobs)) if (job.url) clipUrls[Number(order)] = job.url
      const payload = buildVideoPayload(plan, { title: title.trim() || undefined, clipUrls })

      const res = await fetch('/api/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Could not create video record')
      setSentVideoId(json.id)
    } catch (e: any) {
      setError(e.message || 'Hand-off failed')
    } finally {
      setSending(false)
    }
  }

  // ── Krea clip generation ──
  const pollKrea = useCallback(() => {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      const pending = Object.entries(kreaJobsRef.current).filter(([, j]) => j.job_id && !['completed', 'failed', 'cancelled'].includes(j.status))

      if (!pending.length) { if (pollRef.current) clearInterval(pollRef.current); pollRef.current = null; 

return }

      for (const [order, job] of pending) {
        try {
          const res = await fetch(`/api/explainer/krea?job=${encodeURIComponent(job.job_id!)}`)
          const j = await res.json()
          const url = j.result?.video?.url || j.result?.url || j.result?.videos?.[0]?.url || j.result?.output?.[0]?.url

          setKreaJobs(prev => ({ ...prev, [Number(order)]: { ...prev[Number(order)], status: j.status || 'processing', progress: j.progress, url: url || prev[Number(order)].url, error: j.error?.message } }))
        } catch { /* keep polling */ }
      }
    }, 4000)
  }, [])

  const kreaJobsRef = useRef(kreaJobs)

  useEffect(() => { kreaJobsRef.current = kreaJobs }, [kreaJobs])
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const handleKreaClip = async (shot: ExplainerShot, draft: boolean) => {
    const model = KREA_VIDEO_MODELS.find(m => m.id === kreaModel) || KREA_VIDEO_MODELS[0]

    setKreaJobs(prev => ({ ...prev, [shot.order]: { status: 'submitting' } }))

    try {
      const res = await fetch('/api/explainer/krea', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.id,
          prompt: shot.engine_prompt.split('\n').slice(1).join(' '),
          aspect_ratio: socialPreset.aspect === '4:5' ? '3:4' : socialPreset.aspect,
          duration: Math.round(shot.timestamp_end - shot.timestamp_start),
          resolution: '720p',
          draft,
        }),
      })

      const j = await res.json()

      if (!res.ok) throw new Error(j.error || 'Krea request failed')
      setKreaJobs(prev => ({ ...prev, [shot.order]: { status: j.status || 'queued', job_id: j.job_id, progress: j.progress } }))
      pollKrea()
    } catch (e: any) {
      setKreaJobs(prev => ({ ...prev, [shot.order]: { status: 'failed', error: e.message } }))
    }
  }

  const handleReset = () => {
    setPlan(null); setSentVideoId(null); setKreaJobs({}); setError('')
    setTitle(''); setTopic(''); setRefUrl(''); setRefTranscript(''); setRefMeta(null)
  }

  // ───────────────────────────── render ─────────────────────────────

  const SectionTitle = ({ icon, step, children, hint }: { icon: string; step: number; children: React.ReactNode; hint?: string }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
      <Box sx={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: '#fff', fontWeight: 800, fontSize: 13 }}>{step}</Box>
      <i className={`${icon} text-[20px] text-primary`} />
      <Box>
        <Typography variant='subtitle1' fontWeight={800}>{children}</Typography>
        {hint && <Typography variant='caption' color='text.secondary'>{hint}</Typography>}
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h4' fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <i className='tabler-movie text-[32px] text-primary' /> Explainer Studio
          </Typography>
          <Typography color='text.secondary'>
            Topic → research beats → narration → hyperframe storyboard → engine prompts → clips → hand-off to the Video Studio for voice, captions and render.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {plan && (
            <>
              <Button variant='outlined' size='small' startIcon={<i className='tabler-file-type-md' />} onClick={() => downloadBlob(planToMarkdown(plan), `${(title || 'explainer').replace(/[^\w]+/g, '-').toLowerCase()}-plan.md`, 'text/markdown')}>Export .md</Button>
              <Button variant='outlined' size='small' startIcon={<i className='tabler-json' />} onClick={() => downloadJson(plan, `${(title || 'explainer').replace(/[^\w]+/g, '-').toLowerCase()}-plan.json`)}>Export .json</Button>
              <Button variant='text' color='error' size='small' startIcon={<i className='tabler-refresh' />} onClick={() => setConfirmResetOpen(true)}>New project</Button>
            </>
          )}
        </Box>
      </Box>

      {/* 8-step pipeline */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(4, 1fr)', md: 'repeat(8, 1fr)' }, gap: 0.75 }}>
        {PIPELINE_STEPS.map((step, i) => {
          const state = i < pipelineStep ? 'done' : i === pipelineStep ? 'active' : 'todo'

          return (
            <Tooltip key={step.id} title={step.desc}>
              <Box sx={{ p: 1, borderRadius: 1.5, border: '1px solid', borderColor: state === 'active' ? 'primary.main' : 'divider', bgcolor: state === 'done' ? 'success.main' : state === 'active' ? 'action.selected' : 'transparent', color: state === 'done' ? '#fff' : 'text.primary', opacity: state === 'todo' ? 0.6 : 1 }}>
                <Typography variant='caption' fontWeight={800} sx={{ display: 'block', lineHeight: 1.2 }}>{step.label}</Typography>
              </Box>
            </Tooltip>
          )
        })}
      </Box>

      {error && <Alert severity='error' onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 5fr) minmax(0, 7fr)' }, gap: 3, alignItems: 'start' }}>
        {/* ───────── LEFT: Brief ───────── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 1. Topic */}
          <Card>
            <CardContent>
              <SectionTitle step={1} icon='tabler-bulb' hint='What is the video about, for whom, and in what visual language?'>Describe the topic</SectionTitle>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label='Working title (optional)' value={title} onChange={e => setTitle(e.target.value)} fullWidth size='small' placeholder='The Evolution of Trains' />
                <TextField
                  label='Topic brief' value={topic} onChange={e => setTopic(e.target.value)} fullWidth multiline minRows={5}
                  placeholder={EXAMPLE_TOPIC}
                  helperText={<Box component='span' sx={{ display: 'flex', justifyContent: 'space-between' }}><span>Arc, key milestones, the "so what". More detail = better shots.</span><Button size='small' sx={{ py: 0, minWidth: 0 }} onClick={() => setTopic(EXAMPLE_TOPIC)}>Use train example</Button></Box>}
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField label='Audience' value={audience} onChange={e => setAudience(e.target.value)} size='small' />
                  <TextField label='Tone' value={tone} onChange={e => setTone(e.target.value)} size='small' />
                </Box>
                <FormControl size='small' fullWidth>
                  <InputLabel>Visual style</InputLabel>
                  <Select label='Visual style' value={style} onChange={e => setStyle(e.target.value as PlanStyle)}>
                    {PLAN_STYLES.map(s => <MenuItem key={s.id} value={s.id}><Box><Typography variant='body2' fontWeight={600}>{s.label}</Typography><Typography variant='caption' color='text.secondary'>{s.desc}</Typography></Box></MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>

          {/* 2. Length + target */}
          <Card>
            <CardContent>
              <SectionTitle step={2} icon='tabler-device-mobile' hint='Platform sets aspect ratio, safe zones, caption style and max runtime.'>Length & social media target</SectionTitle>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1, mb: 2 }}>
                {SOCIAL_TARGETS.map(t => {
                  const active = t.id === target

                  
return (
                    <Box key={t.id} onClick={() => setTarget(t.id)} sx={{ cursor: 'pointer', p: 1.25, borderRadius: 2, border: '2px solid', borderColor: active ? 'primary.main' : 'divider', bgcolor: active ? 'action.selected' : 'transparent', transition: 'all .15s' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <i className={`${t.platform === 'YouTube' ? 'tabler-brand-youtube' : t.platform === 'Instagram' ? 'tabler-brand-instagram' : 'tabler-brand-tiktok'} text-[18px]`} />
                        <Typography variant='body2' fontWeight={700} noWrap>{t.label}</Typography>
                      </Box>
                      <Typography variant='caption' color='text.secondary'>{t.aspect} · {t.width}×{t.height} · ≤{fmtTime(t.maxSeconds)}</Typography>
                    </Box>
                  )
                })}
              </Box>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1.5 }}>
                <b>{socialPreset.label}:</b> {socialPreset.notes} <i>{socialPreset.captionStyle}.</i>
              </Typography>
              <Typography variant='body2' fontWeight={700} sx={{ mb: 1 }}>Runtime</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                {LENGTH_PRESETS.filter(p => p.seconds <= socialPreset.maxSeconds).map(p => (
                  <Chip key={p.seconds} label={p.label} color={durationSec === p.seconds ? 'primary' : 'default'} variant={durationSec === p.seconds ? 'filled' : 'outlined'} onClick={() => { setDurationSec(p.seconds); setCustomDuration('') }}
                    icon={socialPreset.recommendedSeconds.includes(p.seconds) ? <i className='tabler-star text-[14px]' /> : undefined} />
                ))}
                <TextField size='small' label='Custom (sec)' value={customDuration} onChange={e => { setCustomDuration(e.target.value); const n = Number(e.target.value);

 if (n >= 15 && n <= socialPreset.maxSeconds) setDurationSec(n) }} sx={{ width: 120 }} />
              </Box>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
                {durationSec}s ≈ <b>{words} words</b> of narration · ★ = recommended for {socialPreset.platform}
              </Typography>
            </CardContent>
          </Card>

          {/* 3. Engine */}
          <Card>
            <CardContent>
              <SectionTitle step={3} icon='tabler-cpu' hint='Which generation technology renders the visuals.'>Technology</SectionTitle>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {ENGINES.map(e => {
                  const active = e.id === engine

                  
return (
                    <Box key={e.id} onClick={() => setEngine(e.id)} sx={{ cursor: 'pointer', p: 1.5, borderRadius: 2, border: '2px solid', borderColor: active ? 'primary.main' : 'divider', bgcolor: active ? 'action.selected' : 'transparent' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography variant='body2' fontWeight={800}>{e.label}</Typography>
                        <Chip size='small' label={e.costPerSecond ? `~$${e.costPerSecond.toFixed(3)}/s` : 'in-house · $0'} color={e.costPerSecond ? 'default' : 'success'} variant='outlined' sx={{ height: 20, fontSize: 11 }} />
                      </Box>
                      <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>{e.tagline}</Typography>
                      <Typography variant='caption' sx={{ display: 'block', mt: 0.5 }}><b>Best for:</b> {e.bestFor}</Typography>
                      {active && e.id === 'krea' && (
                        <FormControl size='small' fullWidth sx={{ mt: 1.5 }} onClick={ev => ev.stopPropagation()}>
                          <InputLabel>Krea video model</InputLabel>
                          <Select label='Krea video model' value={kreaModel} onChange={ev => setKreaModel(ev.target.value)}>
                            {KREA_VIDEO_MODELS.map(m => <MenuItem key={m.id} value={m.id}><Box><Typography variant='body2' fontWeight={600}>{m.name} <Typography component='span' variant='caption' color='text.secondary'>· ≤{m.maxSeconds}s · ~${m.costPerSecond}/s</Typography></Typography><Typography variant='caption' color='text.secondary'>{m.desc}</Typography></Box></MenuItem>)}
                          </Select>
                        </FormControl>
                      )}
                      {active && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                          {e.cameraMotions.map(c => <Chip key={c} label={c.replace(/_/g, ' ')} size='small' sx={{ height: 18, fontSize: 10 }} />)}
                        </Box>
                      )}
                    </Box>
                  )
                })}
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant='body2' fontWeight={700} sx={{ mb: 0.5 }}>The only two ways to animate</Typography>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>Every shot renders in Remotion one of two ways; Headless Chrome paints the frames, ffmpeg stitches them.</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, mb: 1.5 }}>
                {ANIMATION_MODES.map(m => {
                  const active = m.id === animationMode

                  return (
                    <Box key={m.id} onClick={() => setAnimationMode(m.id)} sx={{ cursor: 'pointer', p: 1.25, borderRadius: 2, border: '2px solid', borderColor: active ? 'secondary.main' : 'divider', bgcolor: active ? 'action.selected' : 'transparent' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <i className={`${m.id === '3d_threejs' ? 'tabler-cube-3d-sphere' : 'tabler-layers-subtract'} text-[18px]`} />
                        <Typography variant='body2' fontWeight={800}>{m.label}</Typography>
                      </Box>
                      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>{m.desc}</Typography>
                      <Typography variant='caption' sx={{ display: 'block', mt: 0.5, fontFamily: 'monospace', fontSize: 10, opacity: 0.8 }}>{m.renderer}</Typography>
                    </Box>
                  )
                })}
              </Box>
              <Collapse in={animationMode === '3d_threejs'}>
                <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: 'action.hover', mb: 1.5 }}>
                  <Typography variant='caption' fontWeight={800} sx={{ display: 'block', mb: 0.5 }}>3D asset library · slots the storyboard will fill</Typography>
                  {ASSET_3D_LIBRARY.map(a => (
                    <Box key={a.id} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                      <Chip size='small' label={a.label} sx={{ height: 20, fontSize: 10, flexShrink: 0 }} />
                      <Typography variant='caption' color='text.secondary'>{a.description} <i>{a.sourcing}</i></Typography>
                    </Box>
                  ))}
                </Box>
              </Collapse>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <FormControl size='small'>
                  <InputLabel>Narrator voice</InputLabel>
                  <Select label='Narrator voice' value={voiceId} onChange={e => setVoiceId(e.target.value)}>
                    {ELEVENLABS_VOICES.map(v => <MenuItem key={v.id} value={v.id}>{v.gender === 'm' ? '♂' : '♀'} {v.name} — <Typography component='span' variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>{v.desc.replace('Approved Voice – ', '')}</Typography></MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size='small' label='Closing CTA' value={ctaText} onChange={e => setCtaText(e.target.value)} />
              </Box>
            </CardContent>
          </Card>

          {/* 4. Reference */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <SectionTitle step={4} icon='tabler-brand-youtube' hint='Optional: emulate the structure and pacing of a video you love.'>Reference video</SectionTitle>
                <IconButton size='small' onClick={() => setRefOpen(o => !o)}><i className={refOpen ? 'tabler-chevron-up' : 'tabler-chevron-down'} /></IconButton>
              </Box>
              <Collapse in={refOpen || Boolean(refTranscript)}>
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                  <TextField size='small' fullWidth label='YouTube URL' value={refUrl} onChange={e => setRefUrl(e.target.value)} placeholder='https://youtu.be/…' />
                  <Button variant='outlined' onClick={handleFetchTranscript} disabled={refLoading || !refUrl.trim()} startIcon={refLoading ? <CircularProgress size={14} /> : <i className='tabler-download' />}>Transcript</Button>
                </Box>
                {refMeta?.title && <Typography variant='caption' sx={{ display: 'block', mb: 1 }}><b>{refMeta.title}</b>{refMeta.channel ? ` · ${refMeta.channel}` : ''}{refMeta.provider ? ` · via ${refMeta.provider}` : ''}</Typography>}
                {refError && (
                  <Alert severity='warning' sx={{ mb: 1.5 }}>
                    {refError}
                    {refMeta?.attempts && <Box component='ul' sx={{ m: 0, mt: 0.5, pl: 2, fontSize: 11 }}>{refMeta.attempts.map((a, i) => <li key={i}>{a}</li>)}</Box>}
                  </Alert>
                )}
                <TextField fullWidth multiline minRows={4} maxRows={10} size='small' label='Transcript (fetched or pasted)' value={refTranscript} onChange={e => setRefTranscript(e.target.value)} helperText='Used only to emulate structure and pacing — the generator never copies sentences.' />
              </Collapse>
            </CardContent>
          </Card>

          <Button size='large' variant='contained' onClick={handleGenerate} disabled={generating || !topic.trim()} startIcon={generating ? <CircularProgress size={18} color='inherit' /> : <i className='tabler-sparkles' />}
            sx={{ py: 1.5, fontWeight: 800, background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', boxShadow: '0 6px 18px rgba(99,102,241,.35)' }}>
            {generating ? 'Writing script & storyboard…' : plan ? 'Regenerate plan' : 'Generate explainer plan'}
          </Button>
        </Box>

        {/* ───────── RIGHT: Plan ───────── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, position: { lg: 'sticky' }, top: { lg: 88 } }}>
          {!plan && !generating && (
            <Card sx={{ minHeight: 420, display: 'grid', placeItems: 'center', border: '2px dashed', borderColor: 'divider', bgcolor: 'transparent', boxShadow: 'none' }}>
              <Box sx={{ textAlign: 'center', p: 4, maxWidth: 480 }}>
                <i className='tabler-clapperboard text-[56px]' style={{ opacity: .35 }} />
                <Typography variant='h6' fontWeight={700} sx={{ mt: 1 }}>Your production plan appears here</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Hook, research beats, chapter map, a word-budgeted narration script, a time-coded shot list with {enginePreset.label} prompts, a continuity bible, the publishing kit and a cost estimate for a {durationSec}s {socialPreset.label} video.
                </Typography>
              </Box>
            </Card>
          )}
          {generating && (
            <Card><CardContent><Typography fontWeight={700} sx={{ mb: 1 }}>Showrunner is working…</Typography><LinearProgress /><Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>Research beats → chapter map → {words}-word narration → {Math.round(durationSec / (socialPreset.aspect === '16:9' ? 8 : 4))} shots with {enginePreset.label} prompts.</Typography></CardContent></Card>
          )}

          {plan && !generating && (
            <>
              {/* Summary strip */}
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant='h5' fontWeight={800}>{title || plan.publishing.title_options[0]}</Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ fontStyle: 'italic' }}>{plan.logline}</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
                        <Chip size='small' icon={<i className='tabler-aspect-ratio text-[14px]' />} label={`${socialPreset.label} · ${socialPreset.aspect}`} />
                        <Chip size='small' icon={<i className='tabler-clock text-[14px]' />} label={`${fmtTime(durationSec)} · ${plan.script.split(/\s+/).filter(Boolean).length} words`} />
                        <Chip size='small' icon={<i className='tabler-cpu text-[14px]' />} label={plan.cost_estimate.engine_label} color='primary' variant='outlined' />
                        <Chip size='small' icon={<i className={`${plan.brief.animationMode === '3d_threejs' ? 'tabler-cube-3d-sphere' : 'tabler-layers-subtract'} text-[14px]`} />} label={ANIMATION_MODES.find(m => m.id === plan.brief.animationMode)?.label.split(' (')[0]} variant='outlined' />
                        <Chip size='small' onClick={() => setTab('checks')} icon={<i className={`${checkSummary.ok ? 'tabler-shield-check' : 'tabler-alert-triangle'} text-[14px]`} />} label={checkSummary.ok ? `Checks: ${checkSummary.warnings} warning${checkSummary.warnings === 1 ? '' : 's'}` : `Checks: ${checkSummary.errors} error${checkSummary.errors === 1 ? '' : 's'}`} color={checkSummary.ok ? (checkSummary.warnings ? 'warning' : 'success') : 'error'} />
                        <Chip size='small' icon={<i className='tabler-microphone text-[14px]' />} label={plan.brief.voiceName} />
                        <Chip size='small' icon={<i className='tabler-coin text-[14px]' />} label={`≈ $${plan.cost_estimate.total_usd}`} color='success' variant='outlined' />
                        {plan.generated_by === 'fallback' && <Tooltip title='OPENAI_API_KEY not configured — template plan generated. Add the key for real research + writing.'><Chip size='small' color='warning' label='template mode' /></Tooltip>}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 220 }}>
                      {sentVideoId ? (
                        <Alert severity='success' sx={{ py: 0 }}>Saved to Video Studio. <Link href='/videos' style={{ fontWeight: 700 }}>Open /videos →</Link></Alert>
                      ) : (
                        <Button variant='contained' onClick={handleSendToStudio} disabled={sending || !checkSummary.ok} startIcon={sending ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-send' />}>{checkSummary.ok ? 'Send to Video Studio' : 'Fix check errors first'}</Button>
                      )}
                      <Typography variant='caption' color='text.secondary'>Creates a video record with script + hyperframes so you can voice, caption and render it.</Typography>
                      <Divider />
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button variant={plan.voice ? 'outlined' : 'contained'} color='secondary' onClick={handleVoice} disabled={voicing} startIcon={voicing ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-microphone' />} sx={{ flex: 1 }}>
                          {voicing ? 'Recording…' : plan.voice ? 'Re-record & re-time' : 'Voice & time'}
                        </Button>
                        <TextField size='small' type='number' label='Speed' value={voiceSpeed} onChange={e => setVoiceSpeed(Number(e.target.value) || 1)} inputProps={{ step: 0.05, min: 0.7, max: 1.2 }} sx={{ width: 90 }} />
                      </Box>
                      {plan.voice ? (
                        <Box>
                          <audio controls src={plan.voice.audio_url} style={{ width: '100%', height: 32 }} />
                          <Typography variant='caption' color='text.secondary'>{plan.voice.words.length} words · {plan.voice.duration}s · {plan.voice.pace} words/s · {plan.voice.silences.length} silences · shots re-timed to spoken words</Typography>
                        </Box>
                      ) : (
                        <Typography variant='caption' color='text.secondary'>Voice first: the ElevenLabs take sets the real timing. Every shot then starts on a spoken word.</Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Hook + beats + chapters */}
              <Card>
                <CardContent sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                  <Box>
                    <Typography variant='overline' color='primary' fontWeight={800}>Hook (0–3s)</Typography>
                    <Typography variant='body1' fontWeight={600} sx={{ mb: 2 }}>{plan.hook}</Typography>
                    <Typography variant='overline' color='primary' fontWeight={800}>Research beats</Typography>
                    <Box component='ol' sx={{ m: 0, pl: 2.5 }}>{plan.research_beats.map((b, i) => <li key={i}><Typography variant='body2'>{b}</Typography></li>)}</Box>
                  </Box>
                  <Box>
                    <Typography variant='overline' color='primary' fontWeight={800}>Chapter map</Typography>
                    <Box sx={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', mb: 1 }}>
                      {plan.chapters.map((c, i) => <Box key={i} sx={{ flex: Math.max(1, c.end_sec - c.start_sec), bgcolor: `hsl(${(i * 47 + 220) % 360} 70% 55%)` }} title={c.title} />)}
                    </Box>
                    {plan.chapters.map((c, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'baseline', mb: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: `hsl(${(i * 47 + 220) % 360} 70% 55%)`, flexShrink: 0 }} />
                        <Typography variant='caption' sx={{ fontFamily: 'monospace', minWidth: 72 }}>{fmtTime(c.start_sec)}–{fmtTime(c.end_sec)}</Typography>
                        <Typography variant='body2'><b>{c.title}</b> <Typography component='span' variant='caption' color='text.secondary'>{c.beat}</Typography></Typography>
                      </Box>
                    ))}
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant='overline' color='primary' fontWeight={800}>Continuity bible</Typography>
                    <Typography variant='caption' sx={{ display: 'block' }}><b>Subject:</b> {plan.continuity_bible.subject}</Typography>
                    <Typography variant='caption' sx={{ display: 'block' }}><b>Look:</b> {plan.continuity_bible.palette} · {plan.continuity_bible.lighting} · {plan.continuity_bible.lens}</Typography>
                    <Typography variant='caption' sx={{ display: 'block' }}><b>Motifs:</b> {plan.continuity_bible.recurring_motifs.join(', ')}</Typography>
                    <Typography variant='caption' sx={{ display: 'block', color: 'error.main' }}><b>Avoid:</b> {plan.continuity_bible.negative_prompt}</Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Card>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} variant='scrollable' sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Tab value='storyboard' label={`Storyboard · ${plan.shots.length} shots`} icon={<i className='tabler-layout-grid' />} iconPosition='start' />
                  <Tab value='script' label='Narration script' icon={<i className='tabler-file-text' />} iconPosition='start' />
                  <Tab value='checks' label={`Checks · ${checkSummary.errors}✕ ${checkSummary.warnings}⚠ ${checkSummary.passed}✓`} icon={<i className='tabler-shield-check' />} iconPosition='start' />
                  <Tab value='publishing' label='Publishing kit' icon={<i className='tabler-rocket' />} iconPosition='start' />
                </Tabs>
                <CardContent>
                  {tab === 'script' && (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Button size='small' startIcon={<i className={copiedKey === 'script' ? 'tabler-check' : 'tabler-copy'} />} onClick={() => { copyText(plan.script); flashCopied('script') }}>{copiedKey === 'script' ? 'Copied' : 'Copy script'}</Button>
                      </Box>
                      <Typography variant='body1' sx={{ lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{plan.script}</Typography>
                    </Box>
                  )}

                  {tab === 'storyboard' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {engine === 'krea' && (
                        <Alert severity={kreaConfigured ? 'info' : 'warning'} sx={{ py: 0 }}>
                          {kreaConfigured
                            ? <>Krea API connected. Generate a <b>draft</b> (480p, cheap) to validate motion, then a full clip. Finished clip URLs attach to the hyperframes when you send to the Video Studio.</>
                            : <>KREA_API_KEY not configured — copy each prompt into Krea manually, or add the key to <code>App/.env</code> and Vercel.</>}
                        </Alert>
                      )}
                      {plan.shots.map(shot => {
                        const job = kreaJobs[shot.order]
                        const key = `shot-${shot.order}`

                        
return (
                          <Box key={shot.order} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '72px 1fr' }, gap: 2, p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant='h5' fontWeight={900} color='primary'>{String(shot.order).padStart(2, '0')}</Typography>
                              <Typography variant='caption' sx={{ fontFamily: 'monospace', display: 'block' }}>{fmtTime(shot.timestamp_start)}–{fmtTime(shot.timestamp_end)}</Typography>
                              {plan.voice && <Chip size='small' icon={<i className='tabler-microphone text-[12px]' />} label='on cue' color='secondary' variant='outlined' sx={{ mt: 0.5, height: 18, fontSize: 10 }} />}
                              {shot.era && <Chip size='small' label={shot.era} sx={{ mt: 0.5, height: 18, fontSize: 10 }} />}
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant='body2' fontWeight={600}>🎙 {shot.narration}</Typography>
                              {shot.onscreen_text && <Typography variant='caption' sx={{ display: 'inline-block', mt: 0.5, px: 1, py: 0.25, borderRadius: 1, bgcolor: 'action.selected', fontWeight: 800, letterSpacing: .3 }}>TEXT: {shot.onscreen_text}</Typography>}
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, my: 0.75 }}>
                                <Chip size='small' icon={<i className='tabler-video text-[13px]' />} label={shot.camera_motion.replace(/_/g, ' ')} sx={{ height: 20, fontSize: 11 }} />
                                <Chip size='small' icon={<i className='tabler-transition-right text-[13px]' />} label={shot.transition} sx={{ height: 20, fontSize: 11 }} />
                                {shot.sound_design && <Chip size='small' icon={<i className='tabler-volume text-[13px]' />} label={shot.sound_design} sx={{ height: 20, fontSize: 11 }} />}
                                {shot.assets_3d?.map((a, i) => <Chip key={i} size='small' color='secondary' variant='outlined' icon={<i className='tabler-cube text-[13px]' />} label={`${ASSET_3D_LIBRARY.find(x => x.id === a.slot)?.label || a.slot}: ${a.name}`} sx={{ height: 20, fontSize: 11 }} />)}
                              </Box>
                              <Box sx={{ position: 'relative', p: 1.25, pr: 5, borderRadius: 1.5, bgcolor: '#0a0d14', color: '#cbd5e1', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                {shot.engine_prompt}
                                <Tooltip title='Copy engine prompt'>
                                  <IconButton size='small' onClick={() => { copyText(shot.engine_prompt); flashCopied(key) }} sx={{ position: 'absolute', top: 4, right: 4, color: copiedKey === key ? '#4ade80' : '#94a3b8' }}>
                                    <i className={copiedKey === key ? 'tabler-check' : 'tabler-copy'} style={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                              {engine === 'krea' && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                  <Button size='small' variant='outlined' disabled={!kreaConfigured || job?.status === 'submitting'} onClick={() => handleKreaClip(shot, true)} startIcon={<i className='tabler-bolt' />}>Draft clip</Button>
                                  <Button size='small' variant='contained' disabled={!kreaConfigured || job?.status === 'submitting'} onClick={() => handleKreaClip(shot, false)} startIcon={<i className='tabler-player-play' />}>Generate clip</Button>
                                  {job && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 160 }}>
                                      <Chip size='small' label={job.status} color={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'error' : 'info'} sx={{ height: 20, fontSize: 11 }} />
                                      {typeof job.progress === 'number' && !['completed', 'failed'].includes(job.status) && <LinearProgress variant='determinate' value={Math.round(job.progress * 100)} sx={{ flex: 1, height: 6, borderRadius: 3 }} />}
                                      {job.url && <Button size='small' href={job.url} target='_blank' rel='noreferrer' startIcon={<i className='tabler-external-link' />}>Open clip</Button>}
                                      {job.error && <Typography variant='caption' color='error'>{job.error}</Typography>}
                                    </Box>
                                  )}
                                </Box>
                              )}
                            </Box>
                          </Box>
                        )
                      })}
                    </Box>
                  )}

                  {tab === 'checks' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Alert severity={checkSummary.ok ? (checkSummary.warnings ? 'warning' : 'success') : 'error'} sx={{ py: 0 }}>
                        {checkSummary.ok ? 'No blocking errors.' : `${checkSummary.errors} blocking error${checkSummary.errors === 1 ? '' : 's'} — fix (or regenerate) before hand-off.`} {checkSummary.warnings} warning{checkSummary.warnings === 1 ? '' : 's'}, {checkSummary.passed} passed. Checks re-run on every change; the MCP server exposes the same set.
                      </Alert>
                      {[...checks].sort((a, b) => ['error', 'warn', 'pass'].indexOf(a.level) - ['error', 'warn', 'pass'].indexOf(b.level)).map(c => (
                        <Box key={c.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 1, borderRadius: 1.5, border: '1px solid', borderColor: c.level === 'error' ? 'error.main' : c.level === 'warn' ? 'warning.main' : 'divider', opacity: c.level === 'pass' ? 0.75 : 1 }}>
                          <i className={`${c.level === 'error' ? 'tabler-circle-x text-error' : c.level === 'warn' ? 'tabler-alert-triangle text-warning' : 'tabler-circle-check text-success'} text-[20px]`} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant='body2' fontWeight={c.level === 'pass' ? 500 : 700}>{c.message}</Typography>
                            {c.shots && c.shots.length > 0 && <Typography variant='caption' color='text.secondary'>Shots: {c.shots.join(', ')}</Typography>}
                          </Box>
                          <Chip size='small' label={c.id} sx={{ height: 18, fontSize: 10, fontFamily: 'monospace' }} />
                        </Box>
                      ))}
                    </Box>
                  )}

                  {tab === 'publishing' && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                      <Box>
                        <Typography variant='overline' color='primary' fontWeight={800}>Title options</Typography>
                        {plan.publishing.title_options.map((t, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant='body2' fontWeight={600} sx={{ flex: 1 }}>{t}</Typography>
                            <Button size='small' sx={{ minWidth: 0 }} onClick={() => setTitle(t)}>Use</Button>
                          </Box>
                        ))}
                        <Typography variant='overline' color='primary' fontWeight={800} sx={{ display: 'block', mt: 2 }}>Description</Typography>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>{plan.publishing.description}</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1.5 }}>{plan.publishing.hashtags.map((h, i) => <Chip key={i} size='small' label={h.startsWith('#') ? h : `#${h}`} />)}</Box>
                        {plan.publishing.pinned_comment && <><Typography variant='overline' color='primary' fontWeight={800} sx={{ display: 'block', mt: 2 }}>Pinned comment</Typography><Typography variant='body2'>{plan.publishing.pinned_comment}</Typography></>}
                      </Box>
                      <Box>
                        <Typography variant='overline' color='primary' fontWeight={800}>Thumbnail / cover concepts</Typography>
                        <Box component='ul' sx={{ m: 0, pl: 2.5 }}>{plan.publishing.thumbnail_concepts.map((t, i) => <li key={i}><Typography variant='body2'>{t}</Typography></li>)}</Box>
                        <Typography variant='overline' color='primary' fontWeight={800} sx={{ display: 'block', mt: 2 }}>Export spec</Typography>
                        <Typography variant='body2'>{socialPreset.width}×{socialPreset.height} ({socialPreset.aspect}) · H.264 MP4 · 30 fps · AAC 48 kHz · ≤{fmtTime(socialPreset.maxSeconds)}</Typography>
                        <Typography variant='caption' color='text.secondary'>{socialPreset.captionStyle}</Typography>
                        <Typography variant='overline' color='primary' fontWeight={800} sx={{ display: 'block', mt: 2 }}>Cost estimate</Typography>
                        <Box component='table' sx={{ fontSize: 13, '& td': { py: 0.25, pr: 2 } }}>
                          <tbody>
                            <tr><td>Voiceover (ElevenLabs)</td><td>${plan.cost_estimate.voice_usd}</td></tr>
                            <tr><td>Visuals ({plan.cost_estimate.engine_label})</td><td>${plan.cost_estimate.video_usd}</td></tr>
                            <tr><td>Writing (LLM)</td><td>${plan.cost_estimate.llm_usd}</td></tr>
                            <tr><td><b>Total</b></td><td><b>${plan.cost_estimate.total_usd}</b></td></tr>
                          </tbody>
                        </Box>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </Box>
      </Box>

      <ConfirmDialog
        open={confirmResetOpen}
        title='Start a new project?'
        message='This clears the current brief, plan and any Krea job status. Exported files are unaffected.'
        confirmLabel='Start new' confirmColor='warning'
        onConfirm={() => { setConfirmResetOpen(false); handleReset() }}
        onClose={() => setConfirmResetOpen(false)}
      />
    </Box>
  )
}
