'use client'

import { useState, useEffect, useRef } from 'react'

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Switch from '@mui/material/Switch'
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
  { id: 'GGRMgbKfr7QscdcrvWga', name: 'Kai', gender: 'm', desc: 'Authoritative, dynamic male' },
  { id: 'dtVZnErhiiosqofxDzSH', name: 'Havoc', gender: 'm', desc: 'Deep, bold, energetic male' },
  { id: 'a1m16HA3i1rljUsxpKfn', name: 'Aurora', gender: 'f', desc: 'Warm, clear, confident female' },
  { id: 'UXrpoYalpW5MpGiFHq3z', name: 'Brock', gender: 'm', desc: 'Friendly, trustworthy male' },
  { id: '747pEiZ56cpB4qEKk969', name: 'Shanni', gender: 'f', desc: 'Polished, professional female' },
  { id: 'dXtC3XhB9GtPusIpNtQx', name: 'Hale', gender: 'm', desc: 'Direct, crisp narrator male' },
  { id: 'JSWO6cw2AyFE324d5kEr', name: 'Carolyn', gender: 'f', desc: 'Natural, engaging female' },
  { id: 'Gfpl8Yo74Is0W6cPUWWT', name: 'Max', gender: 'm', desc: 'Strong, conversational male' },
  { id: '56AoDkrOh6qfVPDXZ7Pt', name: 'Cassidy', gender: 'f', desc: 'Approachable, warm female' },
  { id: 'zQzvQBubVkDWYuqJYMFn', name: 'Billy', gender: 'm', desc: 'Upbeat, authentic male' },
  { id: 'g6xIsTj2HwM6VR4iXFCw', name: 'Jessica', gender: 'f', desc: 'Expressive, clear female' },
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
  const isEditing = Boolean(video?.id)

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
  const [voiceId, setVoiceId] = useState('GGRMgbKfr7QscdcrvWga')
  const [tempo, setTempo] = useState<number>(1.00)
  const [status, setStatus] = useState<'draft' | 'generating' | 'ready' | 'failed'>('draft')
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  
  // Advanced features
  const [hyperframes, setHyperframes] = useState<Hyperframe[]>([])
  const [continuityReferences, setContinuityReferences] = useState<ContinuityReference[]>([])
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  
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

  // Template Menu anchor
  const [templateMenuAnchor, setTemplateMenuAnchor] = useState<null | HTMLElement>(null)

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
        setVoiceId(video.voice_id || 'GGRMgbKfr7QscdcrvWga')
        setTempo(Number(video.tempo) || 1.00)
        setStatus(video.status || 'draft')
        setThumbnailUrl(video.thumbnail_url || null)
        setHyperframes(video.hyperframes || [])
        setContinuityReferences(video.continuity_references || [])
        setMediaAssets(video.media_assets || [])
        setGeneratedAudioUrl(video.audio_url || null)
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
        setVoiceId('GGRMgbKfr7QscdcrvWga')
        setTempo(1.00)
        setStatus('draft')
        setThumbnailUrl(null)
        setHyperframes([])
        setContinuityReferences([])
        setMediaAssets([])
        setGeneratedAudioUrl(null)
      }
      setTab('script')
      setDirty(false)
      setError('')
      setIsPlayingPreview(false)
    }
  }, [open, video])

  // Script metrics & Cost Estimation Engine
  const words = script.trim() ? script.trim().split(/\s+/).length : 0
  const estSec = words > 0 ? words / (2.58 * tempo) : 0
  const fmtDur = estSec < 60
    ? `~${Math.round(estSec)} sec`
    : `~${Math.floor(estSec / 60)}m ${String(Math.round(estSec % 60)).padStart(2, '0')}s`

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

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate voice preview')
      }

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
    } catch (err: any) {
      setError(err.message || 'Voice preview failed')
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
          <Grid container spacing={2} alignItems='center'>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label='Video Title *'
                placeholder='e.g. FERS Supplement MRA + 30 Explainer'
                value={title}
                onChange={e => { setTitle(e.target.value); setDirty(true) }}
                size='small'
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2.5}>
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
            </Grid>
            <Grid item xs={6} sm={4} md={1.5}>
              <TextField
                fullWidth
                label='Duration'
                type='number'
                size='small'
                value={durationSec}
                onChange={e => { setDurationSec(Number(e.target.value) || 40); setDirty(true) }}
                inputProps={{ min: 5, max: 600, step: 5 }}
                InputProps={{ endAdornment: <Typography variant='caption'>s</Typography> }}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth size='small'>
                <InputLabel id='status-label'>Status</InputLabel>
                <Select
                  labelId='status-label'
                  value={status}
                  label='Status'
                  onChange={e => { setStatus(e.target.value as any); setDirty(true) }}
                >
                  <MenuItem value='draft'>Draft</MenuItem>
                  <MenuItem value='generating'>Generating</MenuItem>
                  <MenuItem value='ready'>Ready</MenuItem>
                  <MenuItem value='failed'>Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Row 2: Generation Mode & Model Engine Bar */}
          <Box sx={{
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}>
            {/* Mode: Motion vs Static */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ minWidth: 45 }}>
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
            <Grid container spacing={2.5}>
              {/* Left Column: Script, AI Directive, CTA */}
              <Grid item xs={12} md={7}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Script Box */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant='subtitle2' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <i className='tabler-file-text text-[18px] text-primary' />
                        Narration Script
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {fmtDur} @ {tempo.toFixed(2)}× · {words.toLocaleString()} words · ~${estimatedCost}
                      </Typography>
                    </Box>
                    <TextField
                      fullWidth
                      multiline
                      rows={8}
                      placeholder='Enter spoken narration...'
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
              </Grid>

              {/* Right Column: Thumbnail & Voice Engine */}
              <Grid item xs={12} md={5}>
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
                      <Box sx={{ position: 'relative', borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                        <CardMedia
                          component='img'
                          image={thumbnailUrl}
                          alt='Thumbnail'
                          sx={{ width: '100%', height: format === 'short' ? 140 : 100, objectFit: 'cover' }}
                        />
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => { setThumbnailUrl(null); setDirty(true) }}
                          sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.65)', p: 0.25 }}
                        >
                          <i className='tabler-trash text-white text-[14px]' />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box sx={{
                        height: 90,
                        borderRadius: 1,
                        border: '1px dashed',
                        borderColor: 'divider',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.hover',
                        p: 1,
                      }}>
                        <i className='tabler-photo text-[24px] text-textSecondary mb-0.5' />
                        <Typography variant='caption' color='text.secondary'>No thumbnail set</Typography>
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
                        onClick={() => { setTtsEngine('elevenlabs'); setVoiceId('GGRMgbKfr7QscdcrvWga'); setDirty(true) }}
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
                        onClick={() => { setTtsEngine('qwen-openrouter'); setVoiceId('GGRMgbKfr7QscdcrvWga'); setDirty(true) }}
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
                      {[1.0, 1.1, 1.2, 1.3, 1.5].map(preset => (
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
              </Grid>
            </Grid>
          )}

          {/* TAB 2: Hyperframes Synchronization Timeline */}
          {tab === 'hyperframes' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant='subtitle2' fontWeight={700}>
                    Hyperframe Narrative Synchronization Timeline
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Synchronize spoken narrative phrases with visual scene transitions and camera movements.
                  </Typography>
                </Box>
                <Button
                  size='small'
                  variant='contained'
                  color='info'
                  startIcon={syncingHyperframes ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-wand' />}
                  onClick={handleAutoGenerateHyperframes}
                  disabled={syncingHyperframes}
                >
                  {syncingHyperframes ? 'Syncing…' : 'Auto-Sync from Script'}
                </Button>
              </Box>

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
                <Grid container spacing={2}>
                  {continuityReferences.map((ref, idx) => (
                    <Grid item xs={12} sm={6} md={4} key={ref.id || idx}>
                      <Card sx={{ border: '1px solid', borderColor: 'divider', p: 1.5 }}>
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
                    </Grid>
                  ))}
                </Grid>
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
            <Grid container spacing={2}>
              {galleryItems.map(item => (
                <Grid item xs={6} sm={4} md={3} key={item.id}>
                  <Card
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
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGalleryOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
