'use client'

import { useState, useEffect, useRef } from 'react'

import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Switch from '@mui/material/Switch'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Card from '@mui/material/Card'
import CardMedia from '@mui/material/CardMedia'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Menu from '@mui/material/Menu'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Slider from '@mui/material/Slider'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

import EntityEditDialog from '@/components/EntityEditDialog'
import ProTimelineStudioDialog from './ProTimelineStudioDialog'

export type LogoPosition = 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center'
export type LogoSize = 'xs' | 'small' | 'medium' | 'large' | 'xl'

export const LOGO_POSITIONS: { value: LogoPosition; label: string; short: string }[] = [
  { value: 'top-left', label: 'Top-Left (TL)', short: 'TL' },
  { value: 'top-center', label: 'Top-Center (TC)', short: 'TC' },
  { value: 'top-right', label: 'Top-Right (TR)', short: 'TR' },
  { value: 'bottom-left', label: 'Bottom-Left (BL)', short: 'BL' },
  { value: 'bottom-center', label: 'Bottom-Center (BC)', short: 'BC' },
  { value: 'bottom-right', label: 'Bottom-Right (BR)', short: 'BR' },
]

export interface MediaAsset {
  id: string
  url: string
  name: string
  type: 'image' | 'video'
  order: number
}

export interface ContinuityReference {
  id: string
  url: string
  name: string
  role: 'character' | 'environment' | 'brand' | 'style'
  weight: number
}

export interface Hyperframe {
  id: string
  order: number
  timestamp_start: number
  timestamp_end: number
  text_segment: string
  visual_prompt: string
  transition: 'fade' | 'slide_left' | 'zoom_in' | 'dissolve' | 'glitch'
  camera_motion: 'static' | 'pan_slow_right' | 'push_forward' | 'orbit' | 'tilt_up'
  asset_url?: string
}

export interface VideoRecord {
  id: string
  title: string
  format: 'short' | 'long'
  generation_mode: 'static' | 'motion'
  video_model: string
  duration_sec: number
  script: string
  ai_directive: string
  cta_text: string
  cta_on_every_frame: boolean
  tts_engine: 'elevenlabs' | 'openai' | 'qwen-openrouter'
  voice_id: string
  voice_name: string
  tempo: number
  status: 'draft' | 'generating' | 'ready' | 'failed'
  video_url: string | null
  audio_url: string | null
  thumbnail_url: string | null
  hyperframes: Hyperframe[]
  continuity_references: ContinuityReference[]
  media_assets: MediaAsset[]
  metadata?: Record<string, any>
  is_deleted: boolean
  cre_dt: string
  cre_by: string
  mod_dt: string
  mod_by: string
  version_no: number
}

export const ELEVENLABS_VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'm', desc: 'Dominant, firm executive male' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'f', desc: 'Mature, reassuring, confident female' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'm', desc: 'Warm, captivating storyteller male' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', gender: 'f', desc: 'Clear, engaging educator female' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'm', desc: 'Deep, authoritative, seasoned male' },
  { id: 'hpp4J3VqNfWAUOO0d1Us', name: 'Bella', gender: 'f', desc: 'Professional, bright, warm female' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'm', desc: 'Deep, energetic, confident male' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'f', desc: 'Confident, engaging female' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', gender: 'm', desc: 'Laid-back, casual, resonant male' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'f', desc: 'Playful, bright, warm female' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'm', desc: 'Formal, trustworthy narrator male' },
  { id: 'rPMkKgdwgIwqv4fXgR6N', name: 'Tyler', gender: 'm', desc: 'Clear US YouTube Creator voice' },
]

export const OPENAI_VOICES = [
  { id: 'onyx', name: 'Onyx', gender: 'm', desc: 'Deep, authoritative male' },
  { id: 'echo', name: 'Echo', gender: 'm', desc: 'Neutral, crisp male' },
  { id: 'fable', name: 'Fable', gender: 'm', desc: 'Warm, narrative male' },
  { id: 'nova', name: 'Nova', gender: 'f', desc: 'Warm, engaging female' },
  { id: 'shimmer', name: 'Shimmer', gender: 'f', desc: 'Clear, expressive female' },
  { id: 'alloy', name: 'Alloy', gender: 'neutral', desc: 'Balanced, versatile' },
]

export const VIDEO_MODELS = [
  { id: 'higgsfield', name: 'Higgsfield AI', desc: 'Multi-reference character & scene continuity with camera controls' },
  { id: 'seeddance', name: 'SeedDance / ByteDance', desc: 'Dynamic generative video motion with high visual coherence' },
  { id: 'qwen-wan', name: 'Qwen Wan2.1 (OpenRouter)', desc: 'High precision text-to-video with fine visual details' },
  { id: 'openai-sora', name: 'OpenAI Sora', desc: 'Cinematic photo-realism and physics-based motion' },
  { id: 'fal-kling', name: 'FAL Kling AI', desc: 'Realistic cinematic footage generation' },
  { id: 'remotion-kinetic', name: 'Remotion Kinetic Cards', desc: 'Static typography & hyperframe slide transitions' },
]

export const QUICK_TEMPLATES = [
  {
    name: 'FERS Special Supplement Bridge',
    title: 'FERS Special Annuity Supplement Explained',
    format: 'short' as const,
    duration: 35,
    script: 'Are you retiring under FERS before age sixty-two? You might qualify for the FERS Special Annuity Supplement, a bridge payment worth thousands before Social Security begins. Don\'t lose out on what you earned through thirty years of service. Call us today or visit FedSafe Retirement dot com to calculate your bridge payment.',
    ai_directive: 'Fast-paced hook with high contrast text. Background footage of federal office walking transition. Subtle countdown timer overlay on bridge payment graphic.',
    cta: 'Call (774) 273-8473 | FedSafeRetirement.com',
  },
  {
    name: 'TSP 3 Critical Mistakes',
    title: 'Three Critical TSP Mistakes at Retirement',
    format: 'short' as const,
    duration: 40,
    script: 'Three critical TSP withdrawal mistakes federal employees make at retirement: Taking taxable lump sums too early, keeping the wrong fund allocation, and failing to coordinate with your FERS pension. We help you build an intentional retirement income strategy. Call the number below or visit FedSafe Retirement dot com to schedule your free review.',
    ai_directive: 'Dramatic cautionary opening with split red/green highlight boxes. Clean typography on G, C, and S Fund charts. Crisp closing FedSafe shield transition.',
    cta: 'Call 771-FEDSAFE | www.fedsaferetirement.com',
  },
  {
    name: 'Survivor Benefit Plan (SBP) Choice',
    title: 'The Irreversible SBP Decision: 25% vs 50%',
    format: 'short' as const,
    duration: 40,
    script: 'Choosing between a twenty-five percent and fifty percent Survivor Benefit Plan is an irreversible decision. A wrong election can cost your spouse their healthcare eligibility or cost you tens of thousands in pension reductions. Get the facts before you sign your retirement application. Call or visit FedSafe Retirement dot com today.',
    ai_directive: 'Serious, compassionate professional tone. Split screen illustrating OPM pension deduction vs spouse benefit. Highlight FEHB healthcare continuity in amber.',
    cta: 'Schedule Free SBP Review: (774) 273-8473',
  },
  {
    name: 'FEHB 5-Year Consecutive Rule',
    title: 'Don\'t Lose Lifetime Healthcare: FEHB 5-Year Rule',
    format: 'short' as const,
    duration: 35,
    script: 'To carry your FEHB health insurance into federal retirement, you must be enrolled for the five consecutive years before retiring. A single gap in coverage could cost you lifetime federal healthcare. Verify your eligibility before you submit your retirement paperwork. Call us or visit FedSafe Retirement dot com.',
    ai_directive: 'Healthcare checkup visual overlay. Yellow warning tag for 5-year timeline bar. Clean FedSafe badge footer with SAM.gov verified contractor credentials.',
    cta: 'Verify Eligibility: FedSafeRetirement.com',
  },
  {
    name: 'Military Service Buyback ROI',
    title: 'Military Time Buyback ROI for FERS & CSRS',
    format: 'short' as const,
    duration: 45,
    script: 'Did you serve in the military before joining the federal government? Buying back your military time could add hundreds of dollars each month to your FERS or CSRS pension check for life. We calculate your return on investment to see if military buyback makes sense for you. Call today or visit FedSafe Retirement dot com.',
    ai_directive: 'Patriotic yet objective graphic elements. ROI calculation comparison table animating numbers from military deposit to lifetime cumulative payout.',
    cta: 'Call (774) 273-8473 | FedSafeRetirement.com',
  },
  {
    name: 'Why FedSafe Specialist Advantage',
    title: 'Why Choose a Dedicated Federal Retirement Specialist',
    format: 'long' as const,
    duration: 60,
    script: 'Federal retirement shouldn\'t be left to guesswork. At FedSafe Retirement, we are a SAM dot gov registered contractor with over eighty combined years of federal benefits experience. We are not generalists. Federal and postal retirement is all we do. The future favors the prepared. Call or visit FedSafe Retirement dot com.',
    ai_directive: 'Corporate overview styling. Show FedSafe credential cards (RFC®, FRC℠, Veteran-Owned, SAM.gov UEI). Cinematic pacing with smooth logo pulse.',
    cta: 'The Future Favors the Prepared | FedSafeRetirement.com',
  },
]

interface VideoEditDialogProps {
  open: boolean
  onClose: () => void
  video: VideoRecord | null
  onSaved: (video: VideoRecord) => void
}

export default function VideoEditDialog({ open, onClose, video, onSaved }: VideoEditDialogProps) {
  const isUUID = (str?: string | null) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))
  const isEditing = Boolean(video?.id && isUUID(video.id))

  const [tab, setTab] = useState<'script' | 'hyperframes' | 'continuity' | 'assets'>('script')

  const [title, setTitle] = useState('')
  const [format, setFormat] = useState<'short' | 'long'>('short')
  const [generationMode, setGenerationMode] = useState<'static' | 'motion'>('motion')
  const [videoModel, setVideoModel] = useState('higgsfield')
  const [durationSec, setDurationSec] = useState<number>(40)
  const [script, setScript] = useState('')
  const [aiDirective, setAiDirective] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [ctaOnEveryFrame, setCtaOnEveryFrame] = useState(false)
  const [ttsEngine, setTtsEngine] = useState<'elevenlabs' | 'openai' | 'qwen-openrouter'>('elevenlabs')
  const [voiceId, setVoiceId] = useState('pNInz6obpgDQGcFmaJgB')
  const [tempo, setTempo] = useState<number>(1.00)
  const currentVoiceName = ELEVENLABS_VOICES.find(v => v.id === voiceId)?.name || 'Adam'
  const [status, setStatus] = useState<'draft' | 'generating' | 'ready' | 'failed'>('draft')
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  
  // Advanced features
  const [hyperframes, setHyperframes] = useState<Hyperframe[]>([])
  const [continuityReferences, setContinuityReferences] = useState<ContinuityReference[]>([])
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  
  // Brand Watermarks & Multi-Position Branding
  const [showShieldLogo, setShowShieldLogo] = useState<boolean>(true)
  const [shieldLogoPosition, setShieldLogoPosition] = useState<LogoPosition>('top-left')
  const [showSamBadge, setShowSamBadge] = useState<boolean>(true)
  const [samBadgePosition, setSamBadgePosition] = useState<LogoPosition>('top-right')
  const [showDoubleLogo, setShowDoubleLogo] = useState<boolean>(false)
  const [doubleLogoPosition, setDoubleLogoPosition] = useState<LogoPosition>('top-center')
  const [showTaglineLogo, setShowTaglineLogo] = useState<boolean>(false)
  const [taglineLogoPosition, setTaglineLogoPosition] = useState<LogoPosition>('bottom-left')
  const [logoSize, setLogoSize] = useState<LogoSize>('medium')
  const [logoOpacity, setLogoOpacity] = useState<number>(0.9)
  
  // UI states
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [copiedScript, setCopiedScript] = useState(false)
  const [syncingHyperframes, setSyncingHyperframes] = useState(false)

  // Voice Preview states
  const [previewLoading, setPreviewLoading] = useState(false)
  const [isPlayingPreview, setIsPlayingPreview] = useState(false)
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const scriptInputRef = useRef<HTMLTextAreaElement | null>(null)

  // Template Menu anchor
  const [templateMenuAnchor, setTemplateMenuAnchor] = useState<null | HTMLElement>(null)

  // Pro Timeline Studio & Video Player state
  const [timelineStudioOpen, setTimelineStudioOpen] = useState(false)
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false)
  const [showPlayerOverlay, setShowPlayerOverlay] = useState(true)

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsPlayingPreview(false)
    setPreviewLoading(false)
  }

  // Always stop narration audio whenever video player or timeline studio opens or dialog closes
  useEffect(() => {
    if (videoPlayerOpen || timelineStudioOpen || !open) {
      stopAllAudio()
    }
  }, [videoPlayerOpen, timelineStudioOpen, open])

  useEffect(() => {
    return () => {
      stopAllAudio()
    }
  }, [])

  // Gallery Picker dialog state
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryTarget, setGalleryTarget] = useState<'media' | 'thumbnail' | 'continuity'>('media')
  const [galleryItems, setGalleryItems] = useState<any[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const thumbFileInputRef = useRef<HTMLInputElement | null>(null)
  const continuityFileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      if (video) {
        setTitle(video.title || '')
        setFormat(video.format || 'short')
        setGenerationMode(video.generation_mode || 'motion')
        setVideoModel(video.video_model || 'higgsfield')
        setDurationSec(video.duration_sec || 40)
        setScript(video.script || '')
        setAiDirective(video.ai_directive || '')
        setCtaText(video.cta_text || '')
        setCtaOnEveryFrame(Boolean(video.cta_on_every_frame))
        setTtsEngine(video.tts_engine || 'elevenlabs')
        setVoiceId(video.voice_id || 'pNInz6obpgDQGcFmaJgB')
        setTempo(Number(video.tempo) || 1.00)
        setStatus(video.status || 'draft')
        setThumbnailUrl(video.thumbnail_url || null)
        setHyperframes(video.hyperframes || [])
        setContinuityReferences(video.continuity_references || [])
        setMediaAssets(video.media_assets || [])
        setGeneratedAudioUrl(video.audio_url || null)
        setShowShieldLogo(video.metadata?.show_shield_logo ?? true)
        setShieldLogoPosition(video.metadata?.shield_logo_position || 'top-left')
        setShowSamBadge(video.metadata?.show_sam_badge ?? true)
        setSamBadgePosition(video.metadata?.sam_badge_position || 'top-right')
        setShowDoubleLogo(Boolean(video.metadata?.show_double_logo))
        setDoubleLogoPosition(video.metadata?.double_logo_position || 'top-center')
        setShowTaglineLogo(Boolean(video.metadata?.show_tagline_logo))
        setTaglineLogoPosition(video.metadata?.tagline_logo_position || 'bottom-left')
        setLogoSize(video.metadata?.logo_size || 'medium')
        setLogoOpacity(typeof video.metadata?.logo_opacity === 'number' ? video.metadata.logo_opacity : 0.9)
      } else {
        setTitle('')
        setFormat('short')
        setGenerationMode('motion')
        setVideoModel('higgsfield')
        setDurationSec(40)
        setScript('')
        setAiDirective('')
        setCtaText('Call (774) 273-8473 | FedSafeRetirement.com')
        setCtaOnEveryFrame(false)
        setTtsEngine('elevenlabs')
        setVoiceId('pNInz6obpgDQGcFmaJgB')
        setTempo(1.00)
        setStatus('draft')
        setThumbnailUrl(null)
        setHyperframes([])
        setContinuityReferences([])
        setMediaAssets([])
        setGeneratedAudioUrl(null)
        setShowShieldLogo(true)
        setShieldLogoPosition('top-left')
        setShowSamBadge(true)
        setSamBadgePosition('top-right')
        setShowDoubleLogo(false)
        setDoubleLogoPosition('top-center')
        setShowTaglineLogo(false)
        setTaglineLogoPosition('bottom-left')
        setLogoSize('medium')
        setLogoOpacity(0.9)
      }
      setTab('script')
      setDirty(false)
      setError('')
      setIsPlayingPreview(false)
    }
  }, [open, video])

  // Script metrics & Cost Estimation Engine (accounting for // 2s, //// 4s, and [pause:Xs])
  const pauseMatches4 = (script.match(/\/\/\/\//g) || []).length
  const scriptWithout4 = script.replace(/\/\/\/\//g, '')
  const pauseMatches2 = (scriptWithout4.match(/\/\//g) || []).length
  const customPauseMatches = [...script.matchAll(/\[pause:([\d.]+)s?\]/gi)]
  const customPauseSec = customPauseMatches.reduce((acc, m) => acc + (parseFloat(m[1]) || 0), 0)
  const totalPauseSec = (pauseMatches4 * 4) + (pauseMatches2 * 2) + customPauseSec

  const cleanScriptWords = script.replace(/<[^>]*>/g, '').replace(/\[pause:[\d.]+s?\]/gi, '').replace(/\/\//g, '').trim()
  const words = cleanScriptWords ? cleanScriptWords.split(/\s+/).filter(Boolean).length : 0
  const estSec = (words > 0 ? words / (2.58 * tempo) : 0) + totalPauseSec
  const fmtDur = estSec < 60
    ? `~${Math.round(estSec)} sec`
    : `~${Math.floor(estSec / 60)}m ${String(Math.round(estSec % 60)).padStart(2, '0')}s`

  // Voice Director tag insertion helper
  const handleInsertTag = (tag: string) => {
    const textarea = scriptInputRef.current
    if (!textarea) {
      setScript(prev => prev + tag)
      setDirty(true)
      return
    }

    const start = textarea.selectionStart || 0
    const end = textarea.selectionEnd || 0
    const newScript = script.substring(0, start) + tag + script.substring(end)
    setScript(newScript)
    setDirty(true)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + tag.length, start + tag.length)
    }, 50)
  }

  // Voice Director tag wrapper helper
  const handleWrapTag = (tagName: string) => {
    const textarea = scriptInputRef.current
    if (!textarea) {
      setScript(prev => `${prev} <${tagName}>...</${tagName}>`)
      setDirty(true)
      return
    }

    const start = textarea.selectionStart || 0
    const end = textarea.selectionEnd || 0
    const selected = script.substring(start, end)
    const wrapped = selected ? `<${tagName}>${selected}</${tagName}>` : `<${tagName}>...</${tagName}>`
    const newScript = script.substring(0, start) + wrapped + script.substring(end)
    setScript(newScript)
    setDirty(true)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + wrapped.length, start + wrapped.length)
    }, 50)
  }

  // Remove / strip tag at current cursor position or within selection
  const handleRemoveTagAtCursor = () => {
    const textarea = scriptInputRef.current
    if (!textarea) return

    const pos = textarea.selectionStart || 0
    const endPos = textarea.selectionEnd || 0

    // Range selected -> strip all director tags inside selection
    if (pos !== endPos) {
      const selected = script.substring(pos, endPos)
      const cleaned = selected
        .replace(/<\/?(loud|whisper|fast|slow|spell|emphasis)>/gi, '')
        .replace(/\[pause:[\d.]+s?\]/gi, '')
        .replace(/\/\/\/\//g, '')
        .replace(/\/\//g, '')
      const newScript = script.substring(0, pos) + cleaned + script.substring(endPos)
      setScript(newScript)
      setDirty(true)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(pos, pos + cleaned.length)
      }, 50)
      return
    }

    // Cursor position -> detect surrounding tag and remove
    // 1. XML tags: <tag>content</tag>
    const tagRegex = /<(loud|whisper|fast|slow|spell|emphasis)>([\s\S]*?)<\/\1>/gi
    let match: RegExpExecArray | null
    while ((match = tagRegex.exec(script)) !== null) {
      const matchStart = match.index
      const matchEnd = match.index + match[0].length
      if (pos >= matchStart && pos <= matchEnd) {
        const innerContent = match[2]
        const newScript = script.substring(0, matchStart) + innerContent + script.substring(matchEnd)
        setScript(newScript)
        setDirty(true)
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(matchStart, matchStart + innerContent.length)
        }, 50)
        return
      }
    }

    // 2. Custom pause: [pause:Xs]
    const pauseRegex = /\[pause:([\d.]+)s?\]/gi
    while ((match = pauseRegex.exec(script)) !== null) {
      const matchStart = match.index
      const matchEnd = match.index + match[0].length
      if (pos >= matchStart && pos <= matchEnd) {
        const newScript = script.substring(0, matchStart) + script.substring(matchEnd)
        setScript(newScript)
        setDirty(true)
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(matchStart, matchStart)
        }, 50)
        return
      }
    }

    // 3. 4s Pause: ////
    const slash4Regex = /\/\/\/\//g
    while ((match = slash4Regex.exec(script)) !== null) {
      const matchStart = match.index
      const matchEnd = match.index + match[0].length
      if (pos >= matchStart && pos <= matchEnd) {
        const newScript = script.substring(0, matchStart) + script.substring(matchEnd)
        setScript(newScript)
        setDirty(true)
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(matchStart, matchStart)
        }, 50)
        return
      }
    }

    // 4. 2s Pause: //
    const slash2Regex = /\/\//g
    while ((match = slash2Regex.exec(script)) !== null) {
      const matchStart = match.index
      const matchEnd = match.index + match[0].length
      if (pos >= matchStart && pos <= matchEnd) {
        const newScript = script.substring(0, matchStart) + script.substring(matchEnd)
        setScript(newScript)
        setDirty(true)
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(matchStart, matchStart)
        }, 50)
        return
      }
    }
  }

  // Granular Cost Breakdown
  const ttsRate = ttsEngine === 'qwen-openrouter' ? 0.010 : 0.030
  const ttsCost = (script.length * ttsRate) / 1000

  const videoModelRates: Record<string, number> = {
    'higgsfield': 0.028,
    'seeddance': 0.016,
    'qwen-wan': 0.010,
    'openai-sora': 0.038,
    'fal-kling': 0.020,
    'remotion-kinetic': 0.000,
  }
  const modelSecRate = generationMode === 'static' ? 0 : (videoModelRates[videoModel] ?? 0.020)
  const videoGenCost = durationSec * modelSecRate
  const llmCost = 0.002

  const costPerRun = (ttsCost + videoGenCost + llmCost).toFixed(3)
  const versionCount = video?.version_no || 1
  const cumulativeCost = (versionCount * Number(costPerRun)).toFixed(2)

  const activeVoicesList = ttsEngine === 'openai' ? OPENAI_VOICES : ELEVENLABS_VOICES
  const selectedVoice = activeVoicesList.find(v => v.id === voiceId) || activeVoicesList[0]

  const [regenerating, setRegenerating] = useState(false)

  // Re-Generate Asset on script or directive change
  const handleRegenerateAsset = async () => {
    if (!script.trim()) {
      setError('Please enter a narration script before generating the asset.')
      return
    }

    setRegenerating(true)
    setError('')

    try {
      // 1. Generate Voiceover
      const ttsRes = await fetch('/api/videos/voice-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: ttsEngine,
          voice_id: selectedVoice.id,
          voice_name: selectedVoice.name,
          speed: tempo,
          text: script.trim(),
        }),
      })

      if (ttsRes.ok) {
        const blob = await ttsRes.blob()
        const audioUrl = URL.createObjectURL(blob)
        setGeneratedAudioUrl(audioUrl)
      }

      // 2. Auto-sync Hyperframes
      let updatedHyperframes = hyperframes
      try {
        const hfRes = await fetch('/api/videos/script-validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: script.trim(),
            duration_sec: durationSec,
            tempo,
          }),
        })

        if (hfRes.ok) {
          const hfData = await hfRes.json()
          if (Array.isArray(hfData.hyperframes)) {
            updatedHyperframes = hfData.hyperframes
            setHyperframes(updatedHyperframes)
          }
        }
      } catch {
        // ignore
      }

      // 3. Save / update video record with status = 'ready'
      const payload = {
        title: title.trim() || 'Untitled Video',
        format,
        generation_mode: generationMode,
        video_model: videoModel,
        duration_sec: durationSec,
        script,
        ai_directive: aiDirective,
        cta_text: ctaText,
        cta_on_every_frame: ctaOnEveryFrame,
        tts_engine: ttsEngine,
        voice_id: selectedVoice.id,
        voice_name: selectedVoice.name,
        tempo,
        status: 'ready',
        thumbnail_url: thumbnailUrl,
        hyperframes: updatedHyperframes,
        continuity_references: continuityReferences,
        media_assets: mediaAssets,
        version_no: versionCount + 1,
        metadata: {
          ...(video?.metadata || {}),
          show_shield_logo: showShieldLogo,
          shield_logo_position: shieldLogoPosition,
          show_sam_badge: showSamBadge,
          sam_badge_position: samBadgePosition,
          show_double_logo: showDoubleLogo,
          double_logo_position: doubleLogoPosition,
          show_tagline_logo: showTaglineLogo,
          tagline_logo_position: taglineLogoPosition,
          logo_size: logoSize,
          logo_opacity: logoOpacity,
        },
      }

      const url = isEditing ? `/api/videos/${video!.id}` : '/api/videos'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Re-generation failed')

      setShowSuccess(true)
      setDirty(false)
      setStatus('ready')
      onSaved(data)
    } catch (err: any) {
      setError(err.message || 'Re-generation failed')
    } finally {
      setRegenerating(false)
    }
  }

  // Play / generate voice preview
  const handlePlayVoicePreview = async () => {
    if (isPlayingPreview && audioRef.current) {
      audioRef.current.pause()
      setIsPlayingPreview(false)
      return
    }

    setPreviewLoading(true)
    setError('')

    try {
      const res = await fetch('/api/videos/voice-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: ttsEngine,
          voice_id: selectedVoice.id,
          voice_name: selectedVoice.name,
          speed: tempo,
          text: script.trim() || undefined,
        }),
      })

      if (res.ok) {
        const blob = await res.blob()
        const audioUrl = URL.createObjectURL(blob)
        setGeneratedAudioUrl(audioUrl)

        if (audioRef.current) {
          audioRef.current.pause()
        }

        const audio = new Audio(audioUrl)
        audioRef.current = audio
        audio.onended = () => setIsPlayingPreview(false)
        audio.onerror = () => setIsPlayingPreview(false)
        await audio.play()
        setIsPlayingPreview(true)
        setPreviewLoading(false)
        return
      }
    } catch {
      // Fallback to browser SpeechSynthesis
    }

    // Fallback to browser SpeechSynthesis
    try {
      if ('speechSynthesis' in window) {
        const sampleText = script.trim() || `Hello! This is a preview of the ${selectedVoice.name} voice.`
        const utterance = new SpeechSynthesisUtterance(sampleText)
        utterance.rate = tempo || 1.0
        utterance.onend = () => setIsPlayingPreview(false)
        utterance.onerror = () => setIsPlayingPreview(false)
        window.speechSynthesis.speak(utterance)
        setIsPlayingPreview(true)
      }
    } catch {
      // ignore
    } finally {
      setPreviewLoading(false)
    }
  }

  // Automatic Hyperframe generation from script sentences
  const handleAutoGenerateHyperframes = async () => {
    if (!script.trim()) {
      setError('Enter a script before generating hyperframe timeline.')
      return
    }

    setSyncingHyperframes(true)
    setError('')

    try {
      const res = await fetch('/api/videos/script-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: script.trim(),
          duration_sec: durationSec,
          tempo,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Hyperframe sync failed')

      if (Array.isArray(data.hyperframes)) {
        setHyperframes(data.hyperframes)
        setDirty(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate hyperframes')
    } finally {
      setSyncingHyperframes(false)
    }
  }

  // Quick template selection
  const handleApplyTemplate = (tmpl: typeof QUICK_TEMPLATES[0]) => {
    setTitle(tmpl.title)
    setFormat(tmpl.format)
    setDurationSec(tmpl.duration)
    setScript(tmpl.script)
    setAiDirective(tmpl.ai_directive)
    setCtaText(tmpl.cta)
    setDirty(true)
    setTemplateMenuAnchor(null)
  }

  // Copy full script and directive
  const handleCopyScript = () => {
    const text = `TITLE: ${title}\nFORMAT: ${format.toUpperCase()} (${durationSec}s) | MODE: ${generationMode.toUpperCase()} (${videoModel})\nVOICE: ${selectedVoice.name} (${ttsEngine} @ ${tempo}x)\nCTA: ${ctaText} (${ctaOnEveryFrame ? 'Every Frame' : 'End Frame'})\n\nSCRIPT:\n${script}\n\nAI DIRECTIVES:\n${aiDirective}`
    navigator.clipboard.writeText(text)
    setCopiedScript(true)
    setTimeout(() => setCopiedScript(false), 2000)
  }

  // Open Gallery Picker
  const handleOpenGallery = async (target: 'media' | 'thumbnail' | 'continuity') => {
    setGalleryTarget(target)
    setGalleryOpen(true)
    setGalleryLoading(true)
    try {
      const res = await fetch('/api/gallery')
      const data = await res.json()
      if (Array.isArray(data)) setGalleryItems(data)
    } catch {
      // ignore
    } finally {
      setGalleryLoading(false)
    }
  }

  // Upload thumbnail
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'gallery')

      const res = await fetch('/api/gallery', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        setThumbnailUrl(data.publicUrl)
        setDirty(true)
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (thumbFileInputRef.current) thumbFileInputRef.current.value = ''
    }
  }

  // Upload continuity reference (Higgsfield)
  const handleContinuityUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'gallery')

      const res = await fetch('/api/gallery', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        const newRef: ContinuityReference = {
          id: data.fileName || String(Date.now()),
          url: data.publicUrl,
          name: file.name,
          role: 'character',
          weight: 0.8,
        }
        setContinuityReferences(prev => [...prev, newRef])
        setDirty(true)
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (continuityFileInputRef.current) continuityFileInputRef.current.value = ''
    }
  }

  // Upload scene media
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'gallery')

      const res = await fetch('/api/gallery', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        const newAsset: MediaAsset = {
          id: data.fileName || String(Date.now()),
          url: data.publicUrl,
          name: file.name,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          order: mediaAssets.length + 1,
        }
        setMediaAssets(prev => [...prev, newAsset])
        setDirty(true)
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSelectGalleryItem = (item: any) => {
    if (galleryTarget === 'thumbnail') {
      setThumbnailUrl(item.publicUrl)
      setDirty(true)
    } else if (galleryTarget === 'continuity') {
      const newRef: ContinuityReference = {
        id: item.id || item.name,
        url: item.publicUrl,
        name: item.name,
        role: 'character',
        weight: 0.8,
      }
      setContinuityReferences(prev => [...prev, newRef])
      setDirty(true)
    } else {
      const newAsset: MediaAsset = {
        id: item.id || item.name,
        url: item.publicUrl,
        name: item.name,
        type: item.type === 'video' ? 'video' : 'image',
        order: mediaAssets.length + 1,
      }
      setMediaAssets(prev => [...prev, newAsset])
      setDirty(true)
    }
    setGalleryOpen(false)
  }

  const handleRemoveContinuity = (index: number) => {
    setContinuityReferences(prev => prev.filter((_, i) => i !== index))
    setDirty(true)
  }

  const handleRemoveMedia = (index: number) => {
    setMediaAssets(prev => {
      const updated = prev.filter((_, i) => i !== index)
      return updated.map((item, i) => ({ ...item, order: i + 1 }))
    })
    setDirty(true)
  }

  const handleMoveMedia = (index: number, direction: 'left' | 'right') => {
    const newIndex = direction === 'left' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= mediaAssets.length) return

    setMediaAssets(prev => {
      const copy = [...prev]
      const [item] = copy.splice(index, 1)
      copy.splice(newIndex, 0, item)
      return copy.map((el, i) => ({ ...el, order: i + 1 }))
    })
    setDirty(true)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      title: title.trim(),
      format,
      generation_mode: generationMode,
      video_model: videoModel,
      duration_sec: durationSec,
      script,
      ai_directive: aiDirective,
      cta_text: ctaText,
      cta_on_every_frame: ctaOnEveryFrame,
      tts_engine: ttsEngine,
      voice_id: selectedVoice.id,
      voice_name: selectedVoice.name,
      tempo,
      status,
      thumbnail_url: thumbnailUrl,
      hyperframes,
      continuity_references: continuityReferences,
      media_assets: mediaAssets,
      metadata: {
        ...(video?.metadata || {}),
        show_shield_logo: showShieldLogo,
        shield_logo_position: shieldLogoPosition,
        show_sam_badge: showSamBadge,
        sam_badge_position: samBadgePosition,
        show_double_logo: showDoubleLogo,
        double_logo_position: doubleLogoPosition,
        show_tagline_logo: showTaglineLogo,
        tagline_logo_position: taglineLogoPosition,
        logo_size: logoSize,
        logo_opacity: logoOpacity,
      },
    }

    try {
      const url = isEditing ? `/api/videos/${video!.id}` : '/api/videos'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')

      setShowSuccess(true)
      setDirty(false)
      onSaved(data)
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (err: any) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAsCopy = async () => {
    setSaving(true)
    setError('')

    const copyTitle = `${title.trim() || 'Untitled Video'} (Copy)`
    const payload = {
      title: copyTitle,
      format,
      generation_mode: generationMode,
      video_model: videoModel,
      duration_sec: durationSec,
      script,
      ai_directive: aiDirective,
      cta_text: ctaText,
      cta_on_every_frame: ctaOnEveryFrame,
      tts_engine: ttsEngine,
      voice_id: selectedVoice.id,
      voice_name: selectedVoice.name,
      tempo,
      status: 'draft',
      thumbnail_url: thumbnailUrl,
      hyperframes,
      continuity_references: continuityReferences,
      media_assets: mediaAssets,
      version_no: 1,
    }

    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Clone failed')

      setTitle(copyTitle)
      setShowSuccess(true)
      setDirty(false)
      onSaved(data)
    } catch (err: any) {
      setError(err.message || 'Clone failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <EntityEditDialog
        open={open}
        onClose={onClose}
        title={isEditing ? `Edit Video: ${title || 'Untitled'}` : 'Create New Video / Short'}
        subtitle='Configure AI motion model, narration, Hyperframe sync, Higgsfield continuity, and thumbnail cover'
        icon='tabler-video'
        onSave={handleSave}
        saving={saving}
        dirty={dirty}
        error={error}
        onClearError={() => setError('')}
        showSuccess={showSuccess}
        onClearSuccess={() => setShowSuccess(false)}
        entityId={video?.id}
        createdAt={video?.cre_dt}
        createdBy={video?.cre_by}
        modifiedAt={video?.mod_dt}
        modifiedBy={video?.mod_by}
        width='95vw'
        maxWidth='1680px'
        height='94vh'
        headerActions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {/* Cost Breakdown Tooltip & Chip */}
            <Tooltip
              title={
                <Box sx={{ p: 0.5 }}>
                  <Typography variant='caption' fontWeight={700} display='block' sx={{ color: 'primary.light', borderBottom: '1px solid rgba(255,255,255,0.2)', pb: 0.5, mb: 0.5 }}>
                    Estimated Cloud Production Cost Breakdown
                  </Typography>
                  <Typography variant='caption' display='block'>
                    • <strong>Voiceover TTS ({ttsEngine}):</strong> ~${ttsCost.toFixed(3)} ({script.length} chars)
                  </Typography>
                  <Typography variant='caption' display='block'>
                    • <strong>Video Engine ({videoModel}):</strong> ~${videoGenCost.toFixed(3)} ({durationSec}s {generationMode})
                  </Typography>
                  <Typography variant='caption' display='block'>
                    • <strong>AI Hyperframe Validation:</strong> ~${llmCost.toFixed(3)}
                  </Typography>
                  <Divider sx={{ my: 0.5, bgcolor: 'rgba(255,255,255,0.2)' }} />
                  <Typography variant='caption' fontWeight={700} display='block' sx={{ color: 'success.light' }}>
                    Cost this run: ~${costPerRun}
                  </Typography>
                  <Typography variant='caption' color='text.secondary' display='block' sx={{ fontSize: 10, mt: 0.25 }}>
                    Version #{versionCount} · Cumulative spent: ~${cumulativeCost}
                  </Typography>
                </Box>
              }
              arrow
            >
              <Chip
                icon={<i className='tabler-coin text-[14px]' />}
                label={`~$${costPerRun} / run`}
                size='small'
                variant='outlined'
                color='success'
                sx={{ height: 26, fontSize: 11, fontWeight: 700, cursor: 'help' }}
              />
            </Tooltip>

            {/* Watch Video Screen Preview */}
            <Button
              size='small'
              variant='contained'
              color='info'
              startIcon={<i className='tabler-player-play' />}
              onClick={() => setVideoPlayerOpen(true)}
              sx={{
                fontSize: 11,
                fontWeight: 700,
                bgcolor: 'info.main',
                '&:hover': { bgcolor: 'info.dark' },
              }}
            >
              Watch Video
            </Button>

            {/* Launch Pro Timeline Studio */}
            <Button
              size='small'
              variant='outlined'
              color='primary'
              startIcon={<i className='tabler-movie' />}
              onClick={() => setTimelineStudioOpen(true)}
              sx={{ fontSize: 11, fontWeight: 700 }}
            >
              Timeline Studio
            </Button>

            {/* Dynamic Re-Generate Asset Button */}
            <Button
              size='small'
              variant={dirty ? 'contained' : 'outlined'}
              color={dirty ? 'primary' : 'inherit'}
              startIcon={regenerating ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-sparkles' />}
              disabled={regenerating}
              onClick={handleRegenerateAsset}
              sx={{
                fontSize: 11,
                fontWeight: 700,
                boxShadow: dirty ? '0 0 12px rgba(115, 103, 240, 0.5)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {regenerating ? 'Generating…' : dirty ? 'Re-Generate Asset' : 'Generate Asset'}
            </Button>

            {/* Clone / Save As Copy */}
            {isEditing && (
              <Tooltip title='Clone this video as a new record'>
                <Button
                  size='small'
                  variant='outlined'
                  color='inherit'
                  startIcon={<i className='tabler-copy' />}
                  onClick={handleSaveAsCopy}
                  disabled={saving || regenerating}
                  sx={{ fontSize: 11 }}
                >
                  Save as Copy
                </Button>
              </Tooltip>
            )}

            <Button
              size='small'
              variant='outlined'
              color='secondary'
              startIcon={<i className='tabler-template' />}
              onClick={e => setTemplateMenuAnchor(e.currentTarget)}
            >
              Templates
            </Button>
            <Tooltip title={copiedScript ? 'Copied to Clipboard!' : 'Copy Briefing'}>
              <IconButton size='small' onClick={handleCopyScript} color={copiedScript ? 'success' : 'default'}>
                <i className={copiedScript ? 'tabler-check' : 'tabler-copy'} />
              </IconButton>
            </Tooltip>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
          {/* Row 1: Title, Format & Duration */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr auto auto' },
            gap: 2,
            alignItems: 'center',
          }}>
            <TextField
              fullWidth
              label='Video Title *'
              placeholder='e.g. FERS Supplement MRA + 30 Explainer'
              value={title}
              onChange={e => { setTitle(e.target.value); setDirty(true) }}
              size='small'
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Chip
                label='9:16 Short'
                clickable
                size='small'
                color={format === 'short' ? 'primary' : 'default'}
                variant={format === 'short' ? 'filled' : 'outlined'}
                onClick={() => { setFormat('short'); setDirty(true) }}
              />
              <Chip
                label='16:9 Long'
                clickable
                size='small'
                color={format === 'long' ? 'primary' : 'default'}
                variant={format === 'long' ? 'filled' : 'outlined'}
                onClick={() => { setFormat('long'); setDirty(true) }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label='Duration'
                type='number'
                size='small'
                value={durationSec}
                onChange={e => { setDurationSec(Math.max(5, Math.min(300, Number(e.target.value) || 30))); setDirty(true) }}
                InputProps={{
                  endAdornment: <InputAdornment position='end'>sec</InputAdornment>,
                  inputProps: { min: 5, max: 300, step: 5 }
                }}
                sx={{ width: 120 }}
              />
            </Box>
          </Box>

          {/* Row 2: Generation Mode (Static vs Motion) & Video Model Selection */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
            p: 1.25,
            bgcolor: 'action.hover',
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: 'divider',
          }}>
            {/* Mode Switcher */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant='caption' fontWeight={700} color='text.secondary'>
                MODE:
              </Typography>
              <Chip
                label='Motion Video (Generative AI)'
                clickable
                color={generationMode === 'motion' ? 'primary' : 'default'}
                variant={generationMode === 'motion' ? 'filled' : 'outlined'}
                onClick={() => { setGenerationMode('motion'); setDirty(true) }}
                size='small'
                icon={<i className='tabler-movie' />}
              />
              <Chip
                label='Static Infographic Slides'
                clickable
                color={generationMode === 'static' ? 'secondary' : 'default'}
                variant={generationMode === 'static' ? 'filled' : 'outlined'}
                onClick={() => { setGenerationMode('static'); setDirty(true) }}
                size='small'
                icon={<i className='tabler-layout-cards' />}
              />
            </Box>

            {/* Video Model Selector */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <FormControl size='small' sx={{ minWidth: 260 }}>
                <InputLabel id='model-select-label'>AI Video Engine</InputLabel>
                <Select
                  labelId='model-select-label'
                  value={videoModel}
                  label='AI Video Engine'
                  onChange={e => { setVideoModel(e.target.value); setDirty(true) }}
                >
                  {VIDEO_MODELS.map(m => (
                    <MenuItem key={m.id} value={m.id}>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant='body2' fontWeight={600}>{m.name}</Typography>
                        <Typography variant='caption' color='text.secondary' sx={{ fontSize: 10 }}>{m.desc}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Navigation Tabs */}
          <Tabs
            value={tab}
            onChange={(_, val) => setTab(val)}
            sx={{ minHeight: 40, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Tab value='script' label='Narration & Voice' icon={<i className='tabler-microphone' />} iconPosition='start' />
            <Tab value='hyperframes' label={`Hyperframes (${hyperframes.length})`} icon={<i className='tabler-clock-play' />} iconPosition='start' />
            <Tab value='continuity' label={`Higgsfield Continuity (${continuityReferences.length})`} icon={<i className='tabler-users' />} iconPosition='start' />
            <Tab value='assets' label={`Scene Assets (${mediaAssets.length})`} icon={<i className='tabler-photo-video' />} iconPosition='start' />
          </Tabs>

          {/* TAB 1: Script, Voice & Social Thumbnail */}
          {tab === 'script' && (
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' },
              gap: 2.5,
            }}>
              {/* Left Column: Script, AI Directive, CTA */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Script Box */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant='subtitle2' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <i className='tabler-file-text text-[18px] text-primary' />
                        Narration Script
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {fmtDur} @ {tempo.toFixed(2)}× · {words.toLocaleString()} words · {totalPauseSec > 0 ? `(+${totalPauseSec}s pauses) · ` : ''}~${costPerRun}
                      </Typography>
                    </Box>

                    {/* Voice Director Quick Tags Toolbar */}
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      flexWrap: 'wrap',
                      p: 0.75,
                      px: 1,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}>
                      <Typography variant='caption' sx={{ fontWeight: 700, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mr: 0.5, fontSize: 11 }}>
                        <i className='tabler-adjustments-horizontal text-[14px] text-primary' /> Director Tags:
                      </Typography>

                      <Tooltip title='Insert 2-second breath / transition pause'>
                        <Chip
                          label='⏱️ // 2s Pause'
                          size='small'
                          onClick={() => handleInsertTag(' // ')}
                          sx={{ height: 22, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                          color='primary'
                          variant='outlined'
                        />
                      </Tooltip>

                      <Tooltip title='Insert 4-second dramatic hook pause'>
                        <Chip
                          label='⏱️ //// 4s Pause'
                          size='small'
                          onClick={() => handleInsertTag(' //// ')}
                          sx={{ height: 22, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                          color='secondary'
                          variant='outlined'
                        />
                      </Tooltip>

                      <Tooltip title='Wrap selected word in <loud> emphasis tags'>
                        <Chip
                          label='🔊 <loud>'
                          size='small'
                          onClick={() => handleWrapTag('loud')}
                          sx={{ height: 22, fontSize: 11, cursor: 'pointer' }}
                          variant='filled'
                        />
                      </Tooltip>

                      <Tooltip title='Wrap selected word in <whisper> quiet advisory tags'>
                        <Chip
                          label='🤫 <whisper>'
                          size='small'
                          onClick={() => handleWrapTag('whisper')}
                          sx={{ height: 22, fontSize: 11, cursor: 'pointer' }}
                          variant='filled'
                        />
                      </Tooltip>

                      <Tooltip title='Wrap in <fast> brisk pacing tags (1.25×)'>
                        <Chip
                          label='⚡ <fast>'
                          size='small'
                          onClick={() => handleWrapTag('fast')}
                          sx={{ height: 22, fontSize: 11, cursor: 'pointer' }}
                          variant='filled'
                        />
                      </Tooltip>

                      <Tooltip title='Wrap in <slow> deliberate pacing tags (0.85×)'>
                        <Chip
                          label='🐢 <slow>'
                          size='small'
                          onClick={() => handleWrapTag('slow')}
                          sx={{ height: 22, fontSize: 11, cursor: 'pointer' }}
                          variant='filled'
                        />
                      </Tooltip>

                      <Tooltip title='Wrap acronym in <spell> letter-by-letter spelling'>
                        <Chip
                          label='🔤 <spell>'
                          size='small'
                          onClick={() => handleWrapTag('spell')}
                          sx={{ height: 22, fontSize: 11, cursor: 'pointer' }}
                          variant='filled'
                        />
                      </Tooltip>

                      <Divider orientation='vertical' flexItem sx={{ mx: 0.25, height: 16, alignSelf: 'center' }} />

                      <Tooltip title='Remove tag at cursor position or strip tags from selection'>
                        <Chip
                          label='❌ Remove Tag'
                          size='small'
                          onClick={handleRemoveTagAtCursor}
                          sx={{ height: 22, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
                          color='error'
                          variant='outlined'
                        />
                      </Tooltip>
                    </Box>

                    <TextField
                      inputRef={scriptInputRef}
                      fullWidth
                      multiline
                      rows={8}
                      placeholder='Enter spoken narration... Use // for 2s pause, //// for 4s pause, <loud>WON</loud> for emphasis'
                      value={script}
                      onChange={e => { setScript(e.target.value); setDirty(true) }}
                      sx={{
                        '& .MuiInputBase-root': {
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          lineHeight: 1.5,
                        }
                      }}
                    />
                  </Box>

                  {/* AI Directive */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <Typography variant='subtitle2' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <i className='tabler-sparkles text-[18px] text-primary' />
                      AI Generation Directive & Visual Rules
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder='Visual cues, pacing, lighting, b-roll recommendations...'
                      value={aiDirective}
                      onChange={e => { setAiDirective(e.target.value); setDirty(true) }}
                      size='small'
                    />
                  </Box>

                  {/* CTA Message */}
                  <Box sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: 'action.hover',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant='subtitle2' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <i className='tabler-flag text-[16px] text-primary' />
                        Call to Action (CTA)
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            size='small'
                            checked={ctaOnEveryFrame}
                            onChange={e => { setCtaOnEveryFrame(e.target.checked); setDirty(true) }}
                            color='primary'
                          />
                        }
                        label={
                          <Typography variant='caption' fontWeight={600}>
                            {ctaOnEveryFrame ? 'On Every Frame' : 'End Frame Only'}
                          </Typography>
                        }
                        sx={{ m: 0 }}
                      />
                    </Box>
                    <TextField
                      fullWidth
                      size='small'
                      placeholder='e.g. Call (774) 273-8473 | FedSafeRetirement.com'
                      value={ctaText}
                      onChange={e => { setCtaText(e.target.value); setDirty(true) }}
                    />
                  </Box>
                </Box>

              {/* Right Column: Thumbnail & Voice Engine */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Social Thumbnail Cover */}
                <Box sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                    gap: 1,
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant='subtitle2' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <i className='tabler-brand-instagram text-[18px] text-primary' />
                        Branding Thumbnail Cover
                      </Typography>
                      <Chip
                        label={format === 'short' ? '9:16 Reel Cover' : '16:9 Cover'}
                        size='small'
                        variant='outlined'
                        color='primary'
                        sx={{ height: 18, fontSize: 9, fontWeight: 700 }}
                      />
                    </Box>

                    {thumbnailUrl ? (
                      <Box
                        onClick={() => setVideoPlayerOpen(true)}
                        sx={{
                          position: 'relative',
                          borderRadius: 1,
                          overflow: 'hidden',
                          border: '1px solid',
                          borderColor: 'divider',
                          cursor: 'pointer',
                          '&:hover .play-thumb-btn': { opacity: 1 },
                        }}
                      >
                        <CardMedia
                          component='img'
                          image={thumbnailUrl}
                          alt='Thumbnail'
                          sx={{ width: '100%', height: format === 'short' ? 140 : 100, objectFit: 'cover' }}
                        />
                        <Box
                          className='play-thumb-btn'
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            bgcolor: 'rgba(0,0,0,0.45)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.75,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <Box sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            bgcolor: 'info.main',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                          }}>
                            <i className='tabler-player-play text-[18px]' />
                          </Box>
                        </Box>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={(e) => { e.stopPropagation(); setThumbnailUrl(null); setDirty(true) }}
                          sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.65)', p: 0.25 }}
                        >
                          <i className='tabler-trash text-white text-[14px]' />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box
                        onClick={() => setVideoPlayerOpen(true)}
                        sx={{
                          height: 90,
                          borderRadius: 1,
                          border: '1px dashed',
                          borderColor: 'divider',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'action.hover',
                          cursor: 'pointer',
                          p: 1,
                          '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(99,102,241,0.06)' },
                        }}
                      >
                        <i className='tabler-player-play text-[24px] text-primary mb-0.5' />
                        <Typography variant='caption' color='primary' fontWeight={600}>Click to Play Video Screen</Typography>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <input
                        type='file'
                        ref={thumbFileInputRef}
                        style={{ display: 'none' }}
                        accept='image/*'
                        onChange={handleThumbnailUpload}
                      />
                      <Button
                        size='small'
                        variant='contained'
                        color='info'
                        startIcon={<i className='tabler-player-play' />}
                        onClick={() => setVideoPlayerOpen(true)}
                        sx={{ fontSize: 11, flex: 1.2, fontWeight: 700 }}
                      >
                        Play Video
                      </Button>
                      <Button
                        size='small'
                        variant='outlined'
                        startIcon={<i className='tabler-photo' />}
                        onClick={() => handleOpenGallery('thumbnail')}
                        sx={{ fontSize: 11, flex: 1 }}
                      >
                        Gallery
                      </Button>
                      <Button
                        size='small'
                        variant='outlined'
                        startIcon={<i className='tabler-upload' />}
                        onClick={() => thumbFileInputRef.current?.click()}
                        sx={{ fontSize: 11, flex: 1 }}
                      >
                        Upload
                      </Button>
                    </Box>
                  </Box>

                  {/* Brand Watermark Logos & Multi-Position Placement */}
                  <Box sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                      <Box>
                        <Typography variant='subtitle2' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <i className='tabler-shield-check text-[18px] text-primary' />
                          Brand Watermarks & Logo Positions
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          Select official FedSafe logos and assign their on-screen corner or center positions:
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Chip
                          label={`${[showShieldLogo, showSamBadge, showDoubleLogo, showTaglineLogo].filter(Boolean).length} Active`}
                          size='small'
                          color='primary'
                          variant='tonal'
                          sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
                        />
                      </Box>
                    </Box>

                    {/* Global Watermark Adjustments: Size & Opacity */}
                    <Box sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: 'action.hover',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}>
                      {/* Scale Controls Row */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                          <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ mr: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <i className='tabler-arrows-maximize text-primary' /> SCALE:
                          </Typography>
                          {([
                            { key: 'xs', label: 'XS (60%)', mult: '0.6×' },
                            { key: 'small', label: 'SM (80%)', mult: '0.8×' },
                            { key: 'medium', label: 'MD (100%)', mult: '1.0×' },
                            { key: 'large', label: 'LG (130%)', mult: '1.3×' },
                            { key: 'xl', label: 'XL (160%)', mult: '1.6×' },
                          ] as const).map(sz => (
                            <Chip
                              key={sz.key}
                              label={sz.label}
                              size='small'
                              clickable
                              variant={logoSize === sz.key ? 'filled' : 'outlined'}
                              color={logoSize === sz.key ? 'primary' : 'default'}
                              onClick={() => { setLogoSize(sz.key as LogoSize); setDirty(true) }}
                              sx={{ height: 22, fontSize: 10, fontWeight: 700 }}
                            />
                          ))}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 200, flex: { xs: 1, sm: '0 1 240px' } }}>
                          <Typography variant='caption' color='text.secondary' sx={{ fontSize: 10, fontWeight: 600 }}>
                            {logoSize === 'xs' ? '60%' : logoSize === 'small' ? '80%' : logoSize === 'large' ? '130%' : logoSize === 'xl' ? '160%' : '100%'}
                          </Typography>
                          <Slider
                            size='small'
                            value={logoSize === 'xs' ? 60 : logoSize === 'small' ? 80 : logoSize === 'large' ? 130 : logoSize === 'xl' ? 160 : 100}
                            min={50}
                            max={170}
                            step={10}
                            onChange={(_, val) => {
                              const num = val as number
                              if (num <= 65) setLogoSize('xs')
                              else if (num <= 85) setLogoSize('small')
                              else if (num <= 115) setLogoSize('medium')
                              else if (num <= 145) setLogoSize('large')
                              else setLogoSize('xl')
                              setDirty(true)
                            }}
                            sx={{ flex: 1 }}
                          />
                        </Box>
                      </Box>

                      <Divider sx={{ my: 0.25 }} />

                      {/* Opacity Controls Row */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                          <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ mr: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <i className='tabler-droplet-half-2 text-info' /> OPACITY:
                          </Typography>
                          {[0.4, 0.6, 0.75, 0.9, 1.0].map(op => (
                            <Chip
                              key={op}
                              label={`${Math.round(op * 100)}%`}
                              size='small'
                              clickable
                              variant={Math.abs(logoOpacity - op) < 0.05 ? 'filled' : 'outlined'}
                              color={Math.abs(logoOpacity - op) < 0.05 ? 'info' : 'default'}
                              onClick={() => { setLogoOpacity(op); setDirty(true) }}
                              sx={{ height: 22, fontSize: 10, fontWeight: 700 }}
                            />
                          ))}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 200, flex: { xs: 1, sm: '0 1 240px' } }}>
                          <Typography variant='caption' color='text.secondary' sx={{ fontSize: 10, fontWeight: 600 }}>
                            {Math.round(logoOpacity * 100)}%
                          </Typography>
                          <Slider
                            size='small'
                            value={Math.round(logoOpacity * 100)}
                            min={30}
                            max={100}
                            step={5}
                            onChange={(_, val) => {
                              setLogoOpacity((val as number) / 100)
                              setDirty(true)
                            }}
                            sx={{ flex: 1 }}
                          />
                        </Box>
                      </Box>
                    </Box>

                    {/* 4 Official Logo Cards */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                      
                      {/* Logo 1: FEDSafe Shield */}
                      <Box sx={{
                        p: 1.25,
                        borderRadius: 1.5,
                        border: '1.5px solid',
                        borderColor: showShieldLogo ? 'primary.main' : 'divider',
                        bgcolor: showShieldLogo ? 'rgba(99, 102, 241, 0.06)' : 'background.default',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Checkbox
                              size='small'
                              checked={showShieldLogo}
                              sx={{ p: 0 }}
                              onChange={(e) => { setShowShieldLogo(e.target.checked); setDirty(true) }}
                            />
                            <Box>
                              <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>FEDSafe Shield</Typography>
                              <Typography variant='caption' color='text.secondary' sx={{ fontSize: 9 }}>Core Crest</Typography>
                            </Box>
                          </Box>
                          <Chip
                            label={LOGO_POSITIONS.find(p => p.value === shieldLogoPosition)?.short || 'TL'}
                            size='small'
                            color={showShieldLogo ? 'primary' : 'default'}
                            sx={{ height: 18, fontSize: 9, fontWeight: 700 }}
                          />
                        </Box>

                        <Box sx={{
                          width: '100%',
                          height: 52,
                          bgcolor: '#0a0e1a',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          p: 0.5,
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          opacity: showShieldLogo ? logoOpacity : 0.35,
                        }}>
                          <img
                            src='/images/branding/fedsafe-shield-logo-transparent.webp'
                            alt='FEDSafe Shield'
                            style={{
                              maxHeight: logoSize === 'small' ? 30 : logoSize === 'large' ? 44 : 36,
                              maxWidth: '90%',
                              objectFit: 'contain',
                            }}
                          />
                        </Box>

                        {/* Position Selector */}
                        <FormControl fullWidth size='small'>
                          <InputLabel sx={{ fontSize: 11 }}>Position</InputLabel>
                          <Select
                            value={shieldLogoPosition}
                            label='Position'
                            disabled={!showShieldLogo}
                            onChange={(e) => { setShieldLogoPosition(e.target.value as LogoPosition); setDirty(true) }}
                            sx={{ height: 28, fontSize: 11 }}
                          >
                            {LOGO_POSITIONS.map(pos => (
                              <MenuItem key={pos.value} value={pos.value} sx={{ fontSize: 11 }}>
                                {pos.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>

                      {/* Logo 2: SAM.gov Badge */}
                      <Box sx={{
                        p: 1.25,
                        borderRadius: 1.5,
                        border: '1.5px solid',
                        borderColor: showSamBadge ? 'primary.main' : 'divider',
                        bgcolor: showSamBadge ? 'rgba(99, 102, 241, 0.06)' : 'background.default',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Checkbox
                              size='small'
                              checked={showSamBadge}
                              sx={{ p: 0 }}
                              onChange={(e) => { setShowSamBadge(e.target.checked); setDirty(true) }}
                            />
                            <Box>
                              <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>SAM.gov Badge</Typography>
                              <Typography variant='caption' color='text.secondary' sx={{ fontSize: 9 }}>Verified Contractor</Typography>
                            </Box>
                          </Box>
                          <Chip
                            label={LOGO_POSITIONS.find(p => p.value === samBadgePosition)?.short || 'TR'}
                            size='small'
                            color={showSamBadge ? 'primary' : 'default'}
                            sx={{ height: 18, fontSize: 9, fontWeight: 700 }}
                          />
                        </Box>

                        <Box sx={{
                          width: '100%',
                          height: 52,
                          bgcolor: '#0a0e1a',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          p: 0.5,
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          opacity: showSamBadge ? logoOpacity : 0.35,
                        }}>
                          <img
                            src='/images/branding/fedsafe-sam-badge-transparent.webp'
                            alt='SAM.gov UEI Registered'
                            style={{
                              maxHeight: logoSize === 'small' ? 30 : logoSize === 'large' ? 44 : 36,
                              maxWidth: '90%',
                              objectFit: 'contain',
                            }}
                          />
                        </Box>

                        {/* Position Selector */}
                        <FormControl fullWidth size='small'>
                          <InputLabel sx={{ fontSize: 11 }}>Position</InputLabel>
                          <Select
                            value={samBadgePosition}
                            label='Position'
                            disabled={!showSamBadge}
                            onChange={(e) => { setSamBadgePosition(e.target.value as LogoPosition); setDirty(true) }}
                            sx={{ height: 28, fontSize: 11 }}
                          >
                            {LOGO_POSITIONS.map(pos => (
                              <MenuItem key={pos.value} value={pos.value} sx={{ fontSize: 11 }}>
                                {pos.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>

                      {/* Logo 3: Official Double Logo */}
                      <Box sx={{
                        p: 1.25,
                        borderRadius: 1.5,
                        border: '1.5px solid',
                        borderColor: showDoubleLogo ? 'primary.main' : 'divider',
                        bgcolor: showDoubleLogo ? 'rgba(99, 102, 241, 0.06)' : 'background.default',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Checkbox
                              size='small'
                              checked={showDoubleLogo}
                              sx={{ p: 0 }}
                              onChange={(e) => { setShowDoubleLogo(e.target.checked); setDirty(true) }}
                            />
                            <Box>
                              <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>Dual Brand Lockup</Typography>
                              <Typography variant='caption' color='text.secondary' sx={{ fontSize: 9 }}>Shield + SAM.gov</Typography>
                            </Box>
                          </Box>
                          <Chip
                            label={LOGO_POSITIONS.find(p => p.value === doubleLogoPosition)?.short || 'TC'}
                            size='small'
                            color={showDoubleLogo ? 'primary' : 'default'}
                            sx={{ height: 18, fontSize: 9, fontWeight: 700 }}
                          />
                        </Box>

                        <Box sx={{
                          width: '100%',
                          height: 52,
                          bgcolor: '#0a0e1a',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          p: 0.5,
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          opacity: showDoubleLogo ? logoOpacity : 0.35,
                        }}>
                          <img
                            src='/images/branding/fedsafe-double-logo-transparent.webp'
                            alt='Dual Brand Lockup'
                            style={{
                              maxHeight: logoSize === 'small' ? 30 : logoSize === 'large' ? 44 : 36,
                              maxWidth: '90%',
                              objectFit: 'contain',
                            }}
                          />
                        </Box>

                        {/* Position Selector */}
                        <FormControl fullWidth size='small'>
                          <InputLabel sx={{ fontSize: 11 }}>Position</InputLabel>
                          <Select
                            value={doubleLogoPosition}
                            label='Position'
                            disabled={!showDoubleLogo}
                            onChange={(e) => { setDoubleLogoPosition(e.target.value as LogoPosition); setDirty(true) }}
                            sx={{ height: 28, fontSize: 11 }}
                          >
                            {LOGO_POSITIONS.map(pos => (
                              <MenuItem key={pos.value} value={pos.value} sx={{ fontSize: 11 }}>
                                {pos.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>

                      {/* Logo 4: Tagline Horizontal Lockup */}
                      <Box sx={{
                        p: 1.25,
                        borderRadius: 1.5,
                        border: '1.5px solid',
                        borderColor: showTaglineLogo ? 'primary.main' : 'divider',
                        bgcolor: showTaglineLogo ? 'rgba(99, 102, 241, 0.06)' : 'background.default',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Checkbox
                              size='small'
                              checked={showTaglineLogo}
                              sx={{ p: 0 }}
                              onChange={(e) => { setShowTaglineLogo(e.target.checked); setDirty(true) }}
                            />
                            <Box>
                              <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>Tagline Lockup</Typography>
                              <Typography variant='caption' color='text.secondary' sx={{ fontSize: 9 }}>With Official Slogan</Typography>
                            </Box>
                          </Box>
                          <Chip
                            label={LOGO_POSITIONS.find(p => p.value === taglineLogoPosition)?.short || 'BL'}
                            size='small'
                            color={showTaglineLogo ? 'primary' : 'default'}
                            sx={{ height: 18, fontSize: 9, fontWeight: 700 }}
                          />
                        </Box>

                        <Box sx={{
                          width: '100%',
                          height: 52,
                          bgcolor: '#0a0e1a',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          p: 0.5,
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          opacity: showTaglineLogo ? logoOpacity : 0.35,
                        }}>
                          <img
                            src='/images/branding/fedsafe-logo-tagline-transparent.webp'
                            alt='Tagline Lockup'
                            style={{
                              maxHeight: logoSize === 'small' ? 26 : logoSize === 'large' ? 38 : 32,
                              maxWidth: '90%',
                              objectFit: 'contain',
                            }}
                          />
                        </Box>

                        {/* Position Selector */}
                        <FormControl fullWidth size='small'>
                          <InputLabel sx={{ fontSize: 11 }}>Position</InputLabel>
                          <Select
                            value={taglineLogoPosition}
                            label='Position'
                            disabled={!showTaglineLogo}
                            onChange={(e) => { setTaglineLogoPosition(e.target.value as LogoPosition); setDirty(true) }}
                            sx={{ height: 28, fontSize: 11 }}
                          >
                            {LOGO_POSITIONS.map(pos => (
                              <MenuItem key={pos.value} value={pos.value} sx={{ fontSize: 11 }}>
                                {pos.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>

                    {/* Real-time Visual Watermark Canvas Preview */}
                    <Box sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: '#030712',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <i className='tabler-device-mobile text-primary' />
                          Live Screen Watermark Overlay Mockup (9:16)
                        </Typography>
                        <Chip
                          label={`Opacity: ${Math.round(logoOpacity * 100)}% · ${logoSize.toUpperCase()}`}
                          size='small'
                          sx={{ height: 18, fontSize: 9, bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}
                        />
                      </Box>

                      {/* Phone Canvas Mockup */}
                      <Box sx={{
                        height: 160,
                        width: '100%',
                        maxWidth: 280,
                        mx: 'auto',
                        borderRadius: 2,
                        border: '1.5px solid rgba(255, 255, 255, 0.2)',
                        bgcolor: '#000',
                        position: 'relative',
                        p: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        overflow: 'hidden',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                      }}>
                        {/* Top Anchors Row */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2, minHeight: 28 }}>
                          {/* Top-Left */}
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', opacity: logoOpacity }}>
                            {showShieldLogo && shieldLogoPosition === 'top-left' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-shield-logo-transparent.webp' alt='Shield' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showSamBadge && samBadgePosition === 'top-left' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-sam-badge-transparent.webp' alt='SAM' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showDoubleLogo && doubleLogoPosition === 'top-left' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-double-logo-transparent.webp' alt='Double' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showTaglineLogo && taglineLogoPosition === 'top-left' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-logo-tagline-transparent.webp' alt='Tagline' style={{ height: logoSize === 'small' ? 9 : logoSize === 'large' ? 14 : 11, display: 'block' }} />
                              </Box>
                            )}
                          </Box>

                          {/* Top-Center */}
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', opacity: logoOpacity }}>
                            {showShieldLogo && shieldLogoPosition === 'top-center' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-shield-logo-transparent.webp' alt='Shield' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showSamBadge && samBadgePosition === 'top-center' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-sam-badge-transparent.webp' alt='SAM' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showDoubleLogo && doubleLogoPosition === 'top-center' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-double-logo-transparent.webp' alt='Double' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showTaglineLogo && taglineLogoPosition === 'top-center' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-logo-tagline-transparent.webp' alt='Tagline' style={{ height: logoSize === 'small' ? 9 : logoSize === 'large' ? 14 : 11, display: 'block' }} />
                              </Box>
                            )}
                          </Box>

                          {/* Top-Right */}
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', opacity: logoOpacity }}>
                            {showShieldLogo && shieldLogoPosition === 'top-right' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-shield-logo-transparent.webp' alt='Shield' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showSamBadge && samBadgePosition === 'top-right' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-sam-badge-transparent.webp' alt='SAM' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showDoubleLogo && doubleLogoPosition === 'top-right' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-double-logo-transparent.webp' alt='Double' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showTaglineLogo && taglineLogoPosition === 'top-right' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-logo-tagline-transparent.webp' alt='Tagline' style={{ height: logoSize === 'small' ? 9 : logoSize === 'large' ? 14 : 11, display: 'block' }} />
                              </Box>
                            )}
                          </Box>
                        </Box>

                        {/* Center Frame Content Preview */}
                        <Box sx={{ textAlign: 'center', zIndex: 2 }}>
                          <Typography sx={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>
                            Federal Video Scene Content
                          </Typography>
                        </Box>

                        {/* Bottom Anchors Row */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 2, minHeight: 28 }}>
                          {/* Bottom-Left */}
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', opacity: logoOpacity }}>
                            {showShieldLogo && shieldLogoPosition === 'bottom-left' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-shield-logo-transparent.webp' alt='Shield' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showSamBadge && samBadgePosition === 'bottom-left' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-sam-badge-transparent.webp' alt='SAM' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showDoubleLogo && doubleLogoPosition === 'bottom-left' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-double-logo-transparent.webp' alt='Double' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showTaglineLogo && taglineLogoPosition === 'bottom-left' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-logo-tagline-transparent.webp' alt='Tagline' style={{ height: logoSize === 'small' ? 9 : logoSize === 'large' ? 14 : 11, display: 'block' }} />
                              </Box>
                            )}
                          </Box>

                          {/* Bottom-Center */}
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', opacity: logoOpacity }}>
                            {showShieldLogo && shieldLogoPosition === 'bottom-center' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-shield-logo-transparent.webp' alt='Shield' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showSamBadge && samBadgePosition === 'bottom-center' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-sam-badge-transparent.webp' alt='SAM' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showDoubleLogo && doubleLogoPosition === 'bottom-center' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-double-logo-transparent.webp' alt='Double' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showTaglineLogo && taglineLogoPosition === 'bottom-center' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-logo-tagline-transparent.webp' alt='Tagline' style={{ height: logoSize === 'small' ? 9 : logoSize === 'large' ? 14 : 11, display: 'block' }} />
                              </Box>
                            )}
                          </Box>

                          {/* Bottom-Right */}
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', opacity: logoOpacity }}>
                            {showShieldLogo && shieldLogoPosition === 'bottom-right' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-shield-logo-transparent.webp' alt='Shield' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showSamBadge && samBadgePosition === 'bottom-right' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-sam-badge-transparent.webp' alt='SAM' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showDoubleLogo && doubleLogoPosition === 'bottom-right' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-double-logo-transparent.webp' alt='Double' style={{ height: logoSize === 'small' ? 10 : logoSize === 'large' ? 16 : 13, display: 'block' }} />
                              </Box>
                            )}
                            {showTaglineLogo && taglineLogoPosition === 'bottom-right' && (
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                <img src='/images/branding/fedsafe-logo-tagline-transparent.webp' alt='Tagline' style={{ height: logoSize === 'small' ? 9 : logoSize === 'large' ? 14 : 11, display: 'block' }} />
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  {/* Voice Engine & Preview */}
                  <Box sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}>
                    <Typography variant='subtitle2' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <i className='tabler-microphone text-[18px] text-primary' />
                      TTS Voice & Audio Narration
                    </Typography>

                    {/* TTS Engine Selector */}
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Chip
                        label='ElevenLabs'
                        size='small'
                        clickable
                        color={ttsEngine === 'elevenlabs' ? 'info' : 'default'}
                        variant={ttsEngine === 'elevenlabs' ? 'filled' : 'outlined'}
                        onClick={() => { setTtsEngine('elevenlabs'); setVoiceId('pNInz6obpgDQGcFmaJgB'); setDirty(true) }}
                        sx={{ height: 22, fontSize: 10 }}
                      />
                      <Chip
                        label='OpenAI TTS'
                        size='small'
                        clickable
                        color={ttsEngine === 'openai' ? 'info' : 'default'}
                        variant={ttsEngine === 'openai' ? 'filled' : 'outlined'}
                        onClick={() => { setTtsEngine('openai'); setVoiceId('onyx'); setDirty(true) }}
                        sx={{ height: 22, fontSize: 10 }}
                      />
                      <Chip
                        label='Qwen (OpenRouter)'
                        size='small'
                        clickable
                        color={ttsEngine === 'qwen-openrouter' ? 'info' : 'default'}
                        variant={ttsEngine === 'qwen-openrouter' ? 'filled' : 'outlined'}
                        onClick={() => { setTtsEngine('qwen-openrouter'); setVoiceId('pNInz6obpgDQGcFmaJgB'); setDirty(true) }}
                        sx={{ height: 22, fontSize: 10 }}
                      />
                    </Box>

                    {/* Voice Dropdown */}
                    <FormControl fullWidth size='small'>
                      <InputLabel id='voice-select-label'>Voice</InputLabel>
                      <Select
                        labelId='voice-select-label'
                        value={voiceId}
                        label='Voice'
                        onChange={e => { setVoiceId(e.target.value); setDirty(true) }}
                      >
                        {activeVoicesList.map(v => {
                          const isMale = v.gender === 'm'
                          const isFemale = v.gender === 'f'
                          const bgColor = isMale
                            ? 'rgba(59, 130, 246, 0.12)'
                            : isFemale
                              ? 'rgba(236, 72, 153, 0.12)'
                              : 'transparent'
                          const hoverBg = isMale
                            ? 'rgba(59, 130, 246, 0.22)'
                            : isFemale
                              ? 'rgba(236, 72, 153, 0.22)'
                              : 'action.hover'
                          const selectedBg = isMale
                            ? 'rgba(59, 130, 246, 0.28) !important'
                            : 'rgba(236, 72, 153, 0.28) !important'

                          return (
                            <MenuItem
                              key={v.id}
                              value={v.id}
                              sx={{
                                bgcolor: bgColor,
                                borderRadius: 1,
                                my: 0.3,
                                mx: 0.5,
                                transition: 'background-color 0.15s ease',
                                '&:hover': { bgcolor: hoverBg },
                                '&.Mui-selected': { bgcolor: selectedBg },
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <i
                                    className={isMale ? 'tabler-gender-male' : isFemale ? 'tabler-gender-female' : 'tabler-user'}
                                    style={{
                                      fontSize: 16,
                                      color: isMale ? '#3b82f6' : isFemale ? '#ec4899' : 'inherit',
                                    }}
                                  />
                                  <span><strong>{v.name}</strong></span>
                                  <Chip
                                    label={isMale ? 'Male' : isFemale ? 'Female' : 'Neutral'}
                                    size='small'
                                    variant='tonal'
                                    color={isMale ? 'info' : isFemale ? 'secondary' : 'default'}
                                    sx={{ height: 18, fontSize: 9, fontWeight: 700 }}
                                  />
                                </Box>
                                <Typography variant='caption' color='text.secondary' sx={{ ml: 1, fontSize: 11 }}>
                                  {v.desc}
                                </Typography>
                              </Box>
                            </MenuItem>
                          )
                        })}
                      </Select>
                    </FormControl>

                    {/* Tempo Chips */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ minWidth: 45 }}>
                        SPEED:
                      </Typography>
                      {[0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.5].map(preset => (
                        <Chip
                          key={preset}
                          label={`${preset.toFixed(1)}×`}
                          size='small'
                          clickable
                          variant={Math.abs(tempo - preset) < 0.005 ? 'filled' : 'outlined'}
                          color={Math.abs(tempo - preset) < 0.005 ? 'primary' : 'default'}
                          onClick={() => { setTempo(preset); setDirty(true) }}
                          sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
                        />
                      ))}
                    </Box>

                    {/* Audio Player & Preview Button */}
                    <Button
                      variant={isPlayingPreview ? 'contained' : 'contained'}
                      color={isPlayingPreview ? 'warning' : 'primary'}
                      size='small'
                      fullWidth
                      onClick={handlePlayVoicePreview}
                      disabled={previewLoading}
                      startIcon={
                        previewLoading ? (
                          <CircularProgress size={16} color='inherit' />
                        ) : (
                          <i className={isPlayingPreview ? 'tabler-player-stop' : 'tabler-player-play'} />
                        )
                      }
                    >
                      {previewLoading ? 'Generating…' : isPlayingPreview ? 'Stop Preview' : 'Generate & Play Voiceover'}
                    </Button>

                    {generatedAudioUrl && (
                      <audio
                        src={generatedAudioUrl}
                        controls
                        style={{ width: '100%', height: 32, marginTop: 4 }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
          )}

          {/* TAB 2: Hyperframes Synchronization Timeline */}
          {tab === 'hyperframes' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant='subtitle2' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className='tabler-timeline text-[18px] text-primary' />
                    Hyperframe Narrative Synchronization Timeline
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Synchronize spoken narrative phrases with visual scene transitions and camera movements.
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    size='small'
                    variant='outlined'
                    color='info'
                    startIcon={syncingHyperframes ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-wand' />}
                    onClick={handleAutoGenerateHyperframes}
                    disabled={syncingHyperframes}
                  >
                    {syncingHyperframes ? 'Syncing…' : 'Auto-Sync from Script'}
                  </Button>
                  <Button
                    size='small'
                    variant='contained'
                    color='primary'
                    startIcon={<i className='tabler-movie' />}
                    onClick={() => setTimelineStudioOpen(true)}
                    sx={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                      fontWeight: 700,
                    }}
                  >
                    Launch Pro Timeline Studio
                  </Button>
                </Box>
              </Box>

              {/* Multi-Track Visual Timeline Mini-Strip */}
              {hyperframes.length > 0 && (
                <Box sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: '#0a0d14',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant='caption' sx={{ color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', fontSize: 10 }}>
                      Multi-Track Synchronizer Preview ({hyperframes.length} Hyperframe Segments · {durationSec}s Total)
                    </Typography>
                    <Chip
                      label='Click segment to inspect'
                      size='small'
                      sx={{ height: 16, fontSize: 8, bgcolor: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
                    />
                  </Box>

                  {/* Track 1: Audio waveform strip */}
                  <Box sx={{
                    height: 24,
                    bgcolor: '#131b2e',
                    borderRadius: 1,
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    px: 1,
                    mb: 0.75,
                  }}>
                    <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#fcd34d' }}>
                      🎙️ Audio Track · Voice: {currentVoiceName} ({tempo.toFixed(2)}×)
                    </Typography>
                  </Box>

                  {/* Track 2: Spoken text blocks */}
                  <Box sx={{
                    height: 36,
                    bgcolor: '#0f1422',
                    borderRadius: 1,
                    border: '1px solid rgba(192, 132, 252, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    mb: 0.75,
                  }}>
                    {hyperframes.map((hf, idx) => {
                      const total = Math.max(1, durationSec || 40)
                      const left = (hf.timestamp_start / total) * 100
                      const width = ((hf.timestamp_end - hf.timestamp_start) / total) * 100

                      return (
                        <Box
                          key={hf.id || idx}
                          onClick={() => setTimelineStudioOpen(true)}
                          sx={{
                            position: 'absolute',
                            left: `${left}%`,
                            width: `${width}%`,
                            top: 2,
                            bottom: 2,
                            bgcolor: 'rgba(168, 85, 247, 0.25)',
                            border: '1px solid rgba(168, 85, 247, 0.5)',
                            borderRadius: 0.5,
                            p: 0.25,
                            px: 0.5,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'rgba(168, 85, 247, 0.45)' },
                          }}
                        >
                          <Typography noWrap sx={{ fontSize: 8, fontWeight: 700, color: '#e9d5ff' }}>
                            #{hf.order} {hf.text_segment}
                          </Typography>
                        </Box>
                      )
                    })}
                  </Box>
                </Box>
              )}

              {hyperframes.length === 0 ? (
                <Box sx={{
                  p: 4,
                  borderRadius: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                  textAlign: 'center',
                  bgcolor: 'background.paper',
                }}>
                  <i className='tabler-clock-play text-[36px] text-textSecondary mb-1' />
                  <Typography variant='body2' fontWeight={600}>
                    No Hyperframes defined yet
                  </Typography>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 2 }}>
                    Click "Auto-Sync from Script" to automatically map script sentences to timed presentation keyframes.
                  </Typography>
                  <Button size='small' variant='outlined' onClick={handleAutoGenerateHyperframes}>
                    Generate Hyperframes
                  </Button>
                </Box>
              ) : (
                <TableContainer component={Paper} variant='outlined'>
                  <Table size='small'>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700, width: 60 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 110 }}>Time</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Spoken Narrative</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 140 }}>Transition</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 140 }}>Camera Motion</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {hyperframes.map((hf, i) => (
                        <TableRow key={hf.id || i}>
                          <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                            #{hf.order || i + 1}
                          </TableCell>
                          <TableCell sx={{ fontSize: 11, fontFamily: 'monospace' }}>
                            {hf.timestamp_start}s – {hf.timestamp_end}s
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {hf.text_segment}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={hf.transition}
                              size='small'
                              variant='outlined'
                              sx={{ height: 20, fontSize: 10 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={hf.camera_motion}
                              size='small'
                              color='info'
                              variant='tonal'
                              sx={{ height: 20, fontSize: 10 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* TAB 3: Higgsfield Multi-Image Continuity References */}
          {tab === 'continuity' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant='subtitle2' fontWeight={700}>
                    Higgsfield Multi-Image Continuity References
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Upload reference face, character, and environment assets to enforce visual consistency across all generated motion shots.
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <input
                    type='file'
                    ref={continuityFileInputRef}
                    style={{ display: 'none' }}
                    accept='image/*'
                    onChange={handleContinuityUpload}
                  />
                  <Button
                    size='small'
                    variant='outlined'
                    startIcon={<i className='tabler-photo' />}
                    onClick={() => handleOpenGallery('continuity')}
                  >
                    From Gallery
                  </Button>
                  <Button
                    size='small'
                    variant='contained'
                    startIcon={uploading ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-upload' />}
                    onClick={() => continuityFileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    Upload Reference
                  </Button>
                </Box>
              </Box>

              {continuityReferences.length === 0 ? (
                <Box sx={{
                  p: 4,
                  borderRadius: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                  textAlign: 'center',
                  bgcolor: 'background.paper',
                }}>
                  <i className='tabler-users text-[36px] text-textSecondary mb-1' />
                  <Typography variant='body2' fontWeight={600}>
                    No continuity references configured
                  </Typography>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 2 }}>
                    Add subject headshots (e.g. Mike Zaino), federal agency logos, or backdrop scenes for consistent rendering.
                  </Typography>
                  <Button size='small' variant='outlined' onClick={() => handleOpenGallery('continuity')}>
                    Attach Reference
                  </Button>
                </Box>
              ) : (
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                  gap: 2,
                }}>
                  {continuityReferences.map((ref, idx) => (
                    <Card key={ref.id || idx} sx={{ border: '1px solid', borderColor: 'divider', p: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <CardMedia
                          component='img'
                          image={ref.url}
                          alt={ref.name}
                          sx={{ width: 70, height: 70, borderRadius: 1, objectFit: 'cover' }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant='caption' fontWeight={700} noWrap title={ref.name}>
                              {ref.name}
                            </Typography>
                            <IconButton size='small' color='error' onClick={() => handleRemoveContinuity(idx)}>
                              <i className='tabler-trash text-[14px]' />
                            </IconButton>
                          </Box>

                          <FormControl fullWidth size='small' sx={{ mt: 1 }}>
                            <Select
                              value={ref.role}
                              onChange={e => {
                                setContinuityReferences(prev => {
                                  const copy = [...prev]
                                  copy[idx] = { ...copy[idx], role: e.target.value as any }
                                  return copy
                                })
                                setDirty(true)
                              }}
                              sx={{ height: 26, fontSize: 11 }}
                            >
                              <MenuItem value='character'>Character / Face</MenuItem>
                              <MenuItem value='environment'>Environment / Setting</MenuItem>
                              <MenuItem value='brand'>Brand / Logo</MenuItem>
                              <MenuItem value='style'>Style / Lighting</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Typography variant='caption' color='text.secondary' sx={{ minWidth: 40, fontSize: 10 }}>
                          Weight: {ref.weight || 0.8}
                        </Typography>
                        <Slider
                          size='small'
                          value={ref.weight || 0.8}
                          min={0.1}
                          max={1.0}
                          step={0.05}
                          onChange={(_, val) => {
                            setContinuityReferences(prev => {
                              const copy = [...prev]
                              copy[idx] = { ...copy[idx], weight: val as number }
                              return copy
                            })
                            setDirty(true)
                          }}
                        />
                      </Box>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* TAB 4: Scene Sequence Assets */}
          {tab === 'assets' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant='subtitle2' fontWeight={700}>
                    Visual Scene Assets & Horizontal Sequence ({mediaAssets.length})
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Horizontal layout sets the playback sequence for your video shots.
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <input
                    type='file'
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept='image/*,video/*'
                    onChange={handleMediaUpload}
                  />
                  <Button
                    size='small'
                    variant='outlined'
                    startIcon={<i className='tabler-photo' />}
                    onClick={() => handleOpenGallery('media')}
                  >
                    From Gallery
                  </Button>
                  <Button
                    size='small'
                    variant='contained'
                    startIcon={uploading ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-upload' />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    Upload Asset
                  </Button>
                </Box>
              </Box>

              {mediaAssets.length === 0 ? (
                <Box sx={{
                  p: 4,
                  borderRadius: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                  textAlign: 'center',
                  bgcolor: 'background.paper',
                }}>
                  <i className='tabler-photo-video text-[36px] text-textSecondary mb-1' />
                  <Typography variant='body2' fontWeight={600}>
                    No visual scene assets attached
                  </Typography>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 2 }}>
                    Attach background graphics, slides, or footage from your gallery.
                  </Typography>
                  <Button size='small' variant='outlined' onClick={() => handleOpenGallery('media')}>
                    Add from Gallery
                  </Button>
                </Box>
              ) : (
                <Box sx={{
                  display: 'flex',
                  gap: 2,
                  overflowX: 'auto',
                  pb: 1.5,
                  pt: 0.5,
                  '&::-webkit-scrollbar': { height: 6 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
                }}>
                  {mediaAssets.map((asset, idx) => (
                    <Card
                      key={`${asset.id}-${idx}`}
                      sx={{
                        minWidth: 160,
                        maxWidth: 160,
                        position: 'relative',
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: 1,
                        flexShrink: 0,
                      }}
                    >
                      <Box sx={{ position: 'relative' }}>
                        {asset.type === 'video' ? (
                          <Box sx={{ height: 95, bgcolor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className='tabler-video text-white text-[28px]' />
                          </Box>
                        ) : (
                          <CardMedia
                            component='img'
                            height='95'
                            image={asset.url}
                            alt={asset.name}
                            sx={{ height: 95, objectFit: 'cover' }}
                          />
                        )}
                        <Chip
                          label={`#${idx + 1}`}
                          size='small'
                          color='primary'
                          sx={{ position: 'absolute', top: 4, left: 4, height: 18, fontSize: 9, fontWeight: 700 }}
                        />
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => handleRemoveMedia(idx)}
                          sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.6)', p: 0.25 }}
                        >
                          <i className='tabler-trash text-white text-[12px]' />
                        </IconButton>
                      </Box>
                      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                        <Typography variant='caption' noWrap fontWeight={600} display='block' title={asset.name}>
                          {asset.name}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                          <IconButton
                            size='small'
                            disabled={idx === 0}
                            onClick={() => handleMoveMedia(idx, 'left')}
                            sx={{ p: 0.25 }}
                          >
                            <i className='tabler-chevron-left text-[16px]' />
                          </IconButton>
                          <Typography variant='caption' color='text.secondary' sx={{ fontSize: 10 }}>
                            {asset.type}
                          </Typography>
                          <IconButton
                            size='small'
                            disabled={idx === mediaAssets.length - 1}
                            onClick={() => handleMoveMedia(idx, 'right')}
                            sx={{ p: 0.25 }}
                          >
                            <i className='tabler-chevron-right text-[16px]' />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </EntityEditDialog>

      {/* Quick Templates Menu */}
      <Menu
        anchorEl={templateMenuAnchor}
        open={Boolean(templateMenuAnchor)}
        onClose={() => setTemplateMenuAnchor(null)}
        PaperProps={{ sx: { minWidth: 320, maxHeight: 400 } }}
      >
        <Typography variant='caption' fontWeight={700} sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary', textTransform: 'uppercase' }}>
          Federal Short Templates
        </Typography>
        <Divider />
        {QUICK_TEMPLATES.map((tmpl, i) => (
          <MenuItem key={i} onClick={() => handleApplyTemplate(tmpl)} sx={{ py: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant='body2' fontWeight={600}>{tmpl.name}</Typography>
                <Chip label={`${tmpl.duration}s`} size='small' variant='outlined' sx={{ height: 16, fontSize: 9 }} />
              </Box>
              <Typography variant='caption' color='text.secondary' noWrap sx={{ mt: 0.25 }}>
                {tmpl.script}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* Gallery Picker Dialog */}
      <Dialog open={galleryOpen} onClose={() => setGalleryOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Select from Gallery ({galleryTarget})</span>
          <IconButton size='small' onClick={() => setGalleryOpen(false)}>
            <i className='tabler-x' />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {galleryLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : galleryItems.length === 0 ? (
            <Typography variant='body2' color='text.secondary' textAlign='center' sx={{ py: 4 }}>
              No assets found in gallery bucket.
            </Typography>
          ) : (
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
            }}>
              {galleryItems.map(item => (
                <Card
                  key={item.id}
                  sx={{
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    '&:hover': { borderColor: 'primary.main', transform: 'scale(1.02)' },
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => handleSelectGalleryItem(item)}
                >
                  {item.type === 'video' ? (
                    <Box sx={{ height: 110, bgcolor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className='tabler-video text-white text-[32px]' />
                    </Box>
                  ) : (
                    <CardMedia
                      component='img'
                      height='110'
                      image={item.publicUrl}
                      alt={item.name}
                      sx={{ height: 110, objectFit: 'cover' }}
                    />
                  )}
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant='caption' noWrap fontWeight={600} display='block'>
                      {item.name}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGalleryOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Pro Timeline Studio (Read-Only) Dialog */}
      <ProTimelineStudioDialog
        open={timelineStudioOpen}
        onClose={() => setTimelineStudioOpen(false)}
        video={video}
        hyperframes={hyperframes}
        script={script}
        durationSec={durationSec}
        tempo={tempo}
        voiceName={currentVoiceName}
        audioUrl={generatedAudioUrl}
        ctaText={ctaText}
      />

      {/* Full Video Screen Player Modal */}
      <Dialog
        open={videoPlayerOpen}
        onClose={() => setVideoPlayerOpen(false)}
        maxWidth='md'
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#030712',
            color: 'white',
            borderRadius: 2.5,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
            overflow: 'hidden',
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          px: 3,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <i className='tabler-player-play text-[22px] text-primary' />
            <Box>
              <Typography variant='subtitle1' fontWeight={700} sx={{ color: 'white', lineHeight: 1.2 }}>
                {title || 'Video Screen Preview'}
              </Typography>
              <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.6)' }}>
                {format === 'long' ? '16:9 Landscape' : '9:16 Vertical Short'} · {durationSec}s · Voice: {currentVoiceName}
              </Typography>
            </Box>
          </Box>
          <IconButton size='small' onClick={() => setVideoPlayerOpen(false)} sx={{ color: 'white' }}>
            <i className='tabler-x' />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{
          p: 3,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: '#030712',
          minHeight: 460,
        }}>
          {(() => {
            const playUrl = video?.video_url || 'https://gqarlkfmpgaotbezpkbs.supabase.co/storage/v1/object/public/videos/01_Video_Postal_Retirement_Reel.mp4'
            const scaleMult = logoSize === 'xs' ? 0.6 : logoSize === 'small' ? 0.8 : logoSize === 'large' ? 1.3 : logoSize === 'xl' ? 1.6 : 1.0

            const renderOverlayLogos = (pos: LogoPosition) => {
              const items = []
              if (showShieldLogo && shieldLogoPosition === pos) {
                items.push(
                  <Box key="shield" sx={{ bgcolor: 'rgba(6,29,50,0.85)', p: '3px 6px', borderRadius: 1, border: '1px solid rgba(255,255,255,0.18)', opacity: logoOpacity }}>
                    <img src='/images/branding/fedsafe-shield-logo-transparent.webp' alt='FEDSafe Shield' style={{ height: Math.round(20 * scaleMult), objectFit: 'contain', display: 'block' }} />
                  </Box>
                )
              }
              if (showSamBadge && samBadgePosition === pos) {
                items.push(
                  <Box key="sam" sx={{ bgcolor: 'rgba(6,29,50,0.85)', p: '3px 6px', borderRadius: 1, border: '1px solid rgba(255,255,255,0.18)', opacity: logoOpacity }}>
                    <img src='/images/branding/fedsafe-sam-badge-transparent.webp' alt='SAM.gov' style={{ height: Math.round(18 * scaleMult), objectFit: 'contain', display: 'block' }} />
                  </Box>
                )
              }
              if (showDoubleLogo && doubleLogoPosition === pos) {
                items.push(
                  <Box key="double" sx={{ bgcolor: 'rgba(6,29,50,0.85)', p: '3px 6px', borderRadius: 1, border: '1px solid rgba(255,255,255,0.18)', opacity: logoOpacity }}>
                    <img src='/images/branding/fedsafe-double-logo-transparent.webp' alt='Dual Lockup' style={{ height: Math.round(20 * scaleMult), objectFit: 'contain', display: 'block' }} />
                  </Box>
                )
              }
              if (showTaglineLogo && taglineLogoPosition === pos) {
                items.push(
                  <Box key="tagline" sx={{ bgcolor: 'rgba(6,29,50,0.85)', p: '3px 6px', borderRadius: 1, border: '1px solid rgba(255,255,255,0.18)', opacity: logoOpacity }}>
                    <img src='/images/branding/fedsafe-logo-tagline-transparent.webp' alt='Tagline' style={{ height: Math.round(16 * scaleMult), objectFit: 'contain', display: 'block' }} />
                  </Box>
                )
              }
              return items
            }

            return (
              <Box sx={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', maxWidth: '100%' }}>
                <video
                  src={playUrl}
                  controls
                  autoPlay
                  style={{
                    maxWidth: '100%',
                    maxHeight: '68vh',
                    borderRadius: 12,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
                    outline: 'none',
                  }}
                />

                {/* Optional Dynamic Live Watermark Overlay Layer */}
                {showPlayerOverlay && (
                  <Box sx={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    right: 12,
                    bottom: 56,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    zIndex: 2,
                  }}>
                    {/* Top Row */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        {renderOverlayLogos('top-left')}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        {renderOverlayLogos('top-center')}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        {renderOverlayLogos('top-right')}
                      </Box>
                    </Box>

                    {/* Bottom Row */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        {renderOverlayLogos('bottom-left')}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        {renderOverlayLogos('bottom-center')}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        {renderOverlayLogos('bottom-right')}
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            )
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)', bgcolor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  size='small'
                  checked={showPlayerOverlay}
                  onChange={(e) => setShowPlayerOverlay(e.target.checked)}
                  color='primary'
                />
              }
              label={
                <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                  {showPlayerOverlay ? 'Live Branding Watermarks: Visible' : 'Raw Video Only'}
                </Typography>
              }
              sx={{ m: 0 }}
            />
            {ctaText && (
              <Typography variant='caption' sx={{ color: 'primary.light', fontWeight: 600 }} noWrap>
                CTA: {ctaText}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size='small' variant='outlined' color='inherit' onClick={() => setVideoPlayerOpen(false)}>
              Close
            </Button>
            <Button size='small' variant='contained' color='primary' startIcon={<i className='tabler-movie' />} onClick={() => { setVideoPlayerOpen(false); setTimelineStudioOpen(true) }}>
              Open Timeline Studio
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  )
}
