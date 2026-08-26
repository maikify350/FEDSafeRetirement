'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Avatar from '@mui/material/Avatar'
import AvatarGroup from '@mui/material/AvatarGroup'
import Dialog from '@mui/material/Dialog'
import { createColumnHelper } from '@tanstack/react-table'

import EntityListView from '@/components/EntityListView'
import ConfirmDialog from '@/components/ConfirmDialog'
import { downloadBlob, downloadJson } from '@/utils/exportDownload'
import VideoEditDialog, { type VideoRecord } from './VideoEditDialog'
import VoiceCloneStudioDialog from './VoiceCloneStudioDialog'
import ProTimelineStudioDialog from './ProTimelineStudioDialog'
import VideoBrandSettingsDialog from './VideoBrandSettingsDialog'
import { DEFAULT_PREGENERATED_VIDEOS, LIBRARY_V2_VIDEOS, EXPERIMENTAL_VIDEOS } from '@/data/defaultVideos'

const columnHelper = createColumnHelper<VideoRecord>()

const formatDate = (v: string | null) => {
  if (!v) return '—'

  return new Date(v).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const BATCH_COLORS: Record<number, 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'> = {
  1: 'primary',
  2: 'info',
  3: 'success',
  4: 'warning',
  5: 'secondary',
  6: 'error',
}

const CTA_TYPE_LABELS: Record<string, { label: string; color: 'primary' | 'secondary' | 'info' | 'success' }> = {
  direct_review: { label: '🎯 Direct Review', color: 'primary' },
  lead_magnet: { label: '🧲 Lead Magnet', color: 'secondary' },
  website_traffic: { label: '🌐 Website Traffic', color: 'info' },
  agency: { label: '🏛️ Agency Briefing', color: 'success' },
}

const SCENE_IMAGE_POOLS: Record<number, string[]> = {
  1: [
    '/images/scenes/federal-advisor-consultation.jpg',
    '/images/scenes/federal-couple-happy.jpg',
    '/images/scenes/who-retired-vet.webp',
    '/images/scenes/who-decision-background.webp',
  ],
  2: [
    '/images/scenes/advisor-classroom.png',
    '/images/scenes/advisor-session.png',
    '/images/scenes/who-workshop.webp',
    '/images/scenes/who-mike-podium.webp',
  ],
  3: [
    '/images/scenes/military-buyback-desk.jpg',
    '/images/scenes/who-retired-mail.webp',
    '/images/scenes/seminar-hero.webp',
    '/images/scenes/federal-couple-happy.jpg',
  ],
  4: [
    '/images/scenes/fegli-rate-spike-shock.jpg',
    '/images/scenes/pshb-healthcare-review.jpg',
    '/images/scenes/federal-advisor-consultation.jpg',
    '/images/scenes/federal-couple-happy.jpg',
  ],
  5: [
    '/images/scenes/tsp-retirement-growth.jpg',
    '/images/scenes/who-home-hero.webp',
    '/images/scenes/federal-couple-happy.jpg',
    '/images/scenes/federal-advisor-consultation.jpg',
  ],
  6: [
    '/images/scenes/agency-benefits.png',
    '/images/scenes/agency-education.png',
    '/images/scenes/usps-mail-carrier-sunset.jpg',
    '/images/scenes/who-mike-podium.webp',
  ],
}

export default function VideosView() {
  const [videos, setVideos] = useState<VideoRecord[]>(DEFAULT_PREGENERATED_VIDEOS)
  const [studioTargetVideo, setStudioTargetVideo] = useState<VideoRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  // Filter states
  const [sourceFilter, setSourceFilter] = useState<'all' | 'library_v2' | 'experimental' | 'custom'>('library_v2')
  const [batchFilter, setBatchFilter] = useState<'all' | number>('all')

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [editVideo, setEditVideo] = useState<VideoRecord | null>(null)
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null)
  const [previewVideoRecord, setPreviewVideoRecord] = useState<VideoRecord | null>(null)
  const [voiceCloneOpen, setVoiceCloneOpen] = useState(false)
  const [brandSettingsOpen, setBrandSettingsOpen] = useState(false)

  // Audio preview playback state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const activeAudioRef = useRef<HTMLAudioElement | null>(null)
  const activeAbortRef = useRef<AbortController | null>(null)

  // Cleanly and immediately stop ALL in-flight or playing voice audio
  const stopAllVoicePlayback = useCallback(() => {
    if (activeAbortRef.current) {
      activeAbortRef.current.abort()
      activeAbortRef.current = null
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause()
      activeAudioRef.current.currentTime = 0
      activeAudioRef.current.src = ''
      activeAudioRef.current = null
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setPlayingVoiceId(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllVoicePlayback()
    }
  }, [stopAllVoicePlayback])

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<VideoRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchVideos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/videos')
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        // Keep all saved database videos and merge any remaining default templates
        const dbTitles = new Set(data.map(v => v.title?.toLowerCase().trim()))
        const remainingDefaults = DEFAULT_PREGENERATED_VIDEOS.filter(
          def => !dbTitles.has(def.title?.toLowerCase().trim())
        )
        setVideos([...data, ...remainingDefaults])
      } else {
        setVideos(DEFAULT_PREGENERATED_VIDEOS)
      }
    } catch {
      setVideos(DEFAULT_PREGENERATED_VIDEOS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  // Counts for pills
  const counts = useMemo(() => {
    const libCount = videos.filter(v => v.video_source === 'library_v2').length
    const expCount = videos.filter(v => v.video_source === 'experimental').length
    const customCount = videos.filter(v => v.video_source === 'custom').length
    return {
      all: videos.length,
      library_v2: libCount,
      experimental: expCount,
      custom: customCount,
    }
  }, [videos])

  // Filtered dataset
  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      // Source filter
      if (sourceFilter !== 'all') {
        const src = v.video_source || (v.script_no ? 'library_v2' : 'experimental')
        if (src !== sourceFilter) return false
      }

      // Batch filter
      if (batchFilter !== 'all') {
        if (v.batch_no !== batchFilter) return false
      }

      // Search filter
      if (search && search.trim()) {
        const q = search.toLowerCase().trim()
        const matchTitle = v.title?.toLowerCase().includes(q)
        const matchScript = v.script?.toLowerCase().includes(q)
        const matchSpoken = v.spoken_cta?.toLowerCase().includes(q)
        const matchBatch = v.batch_name?.toLowerCase().includes(q)
        const matchBroll = v.broll_notes?.toLowerCase().includes(q)
        if (!matchTitle && !matchScript && !matchSpoken && !matchBatch && !matchBroll) return false
      }

      return true
    })
  }, [videos, sourceFilter, batchFilter, search])

  // Play voice sample — strictly single instance, immediately halts previous
  const handlePlayVoice = async (video: VideoRecord, e: React.MouseEvent) => {
    e.stopPropagation()

    // 1. If clicking currently playing row, toggle pause and stop
    if (playingVoiceId === video.id) {
      stopAllVoicePlayback()
      return
    }

    // 2. Instantly cancel and stop any existing playback or pending network request
    stopAllVoicePlayback()

    // 3. Mark active playing ID
    setPlayingVoiceId(video.id)

    const controller = new AbortController()
    activeAbortRef.current = controller

    const sampleText = video.script ? video.script.substring(0, 140) : `Hello! This is a preview of the ${video.voice_name || 'Adam'} voice.`

    try {
      const res = await fetch('/api/videos/voice-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          voice_id: video.voice_id,
          voice_name: video.voice_name,
          speed: video.tempo,
          text: sampleText,
        }),
      })

      // If user switched or canceled during fetch, do not start audio
      if (controller.signal.aborted) return

      if (res.ok) {
        const blob = await res.blob()
        if (controller.signal.aborted) return

        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        activeAudioRef.current = audio

        audio.onended = () => {
          if (activeAudioRef.current === audio) {
            setPlayingVoiceId(null)
            activeAudioRef.current = null
          }
        }
        audio.onerror = () => {
          if (activeAudioRef.current === audio) {
            setPlayingVoiceId(null)
            activeAudioRef.current = null
          }
        }

        await audio.play()
        return
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
    }

    // Fallback to browser SpeechSynthesis only if not aborted
    if (controller.signal.aborted) return

    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(sampleText)
        utterance.rate = video.tempo || 1.0
        utterance.onend = () => setPlayingVoiceId(null)
        utterance.onerror = () => setPlayingVoiceId(null)
        window.speechSynthesis.speak(utterance)
        return
      }
    } catch {
      // ignore
    }

    setPlayingVoiceId(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/videos/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setVideos(prev => prev.filter(v => v.id !== deleteTarget.id))
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const handleCloneVideo = async (video: VideoRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    const clonedTitle = `${video.title || 'Untitled'} (Copy)`
    const payload = {
      ...video,
      title: clonedTitle,
      status: 'draft',
      version_no: 1,
      script_no: null,
      video_source: 'custom',
    }
    delete (payload as any).id
    delete (payload as any).cre_dt
    delete (payload as any).mod_dt

    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const newVideo = await res.json()
        setVideos(prev => [newVideo, ...prev])
        setEditVideo(newVideo)
      } else {
        const clientClone: VideoRecord = {
          ...video,
          id: `video_${Date.now()}`,
          title: clonedTitle,
          status: 'draft',
          version_no: 1,
          script_no: null,
          video_source: 'custom',
          cre_dt: new Date().toISOString(),
        }
        setVideos(prev => [clientClone, ...prev])
        setEditVideo(clientClone)
      }
    } catch {
      const clientClone: VideoRecord = {
        ...video,
        id: `video_${Date.now()}`,
        title: clonedTitle,
        status: 'draft',
        version_no: 1,
        script_no: null,
        video_source: 'custom',
        cre_dt: new Date().toISOString(),
      }
      setVideos(prev => [clientClone, ...prev])
      setEditVideo(clientClone)
    }
  }

  const columns = useMemo(() => [
    columnHelper.accessor('title', {
      header: 'Video & Script Brief',
      size: 320,
      cell: ({ row }) => {
        const v = row.original
        const isLib = v.video_source === 'library_v2' || Boolean(v.script_no)

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              onClick={(e) => {
                e.stopPropagation()
                setPreviewVideoRecord(v)
                setPreviewVideoUrl(v.video_url || null)
              }}
              sx={{
                position: 'relative',
                cursor: 'pointer',
                width: 46,
                height: v.format === 'short' ? 62 : 38,
                borderRadius: 1,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover .play-overlay': {
                  opacity: 1,
                },
              }}
            >
              {v.thumbnail_url ? (
                <Box
                  component='img'
                  src={v.thumbnail_url}
                  alt={v.title}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <i className='tabler-video text-textSecondary text-[20px]' />
              )}
              {v.video_url && (
                <Box
                  className='play-overlay'
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.7,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <i className='tabler-player-play text-white text-[16px]' />
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                {v.script_no !== null && v.script_no !== undefined && (
                  <Chip
                    label={`#${String(v.script_no).padStart(2, '0')}`}
                    size='small'
                    color='primary'
                    sx={{ height: 18, fontSize: 10, fontWeight: 800, px: 0.25 }}
                  />
                )}
                <Typography className='text-sm font-semibold' color='text.primary' noWrap title={v.title}>
                  {v.title || 'Untitled Video'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                {v.batch_no && (
                  <Chip
                    label={`B${v.batch_no}`}
                    title={v.batch_name || `Batch ${v.batch_no}`}
                    size='small'
                    color={BATCH_COLORS[v.batch_no] || 'default'}
                    variant='tonal'
                    sx={{ height: 16, fontSize: 9, fontWeight: 700 }}
                  />
                )}
                <Chip
                  label={v.format === 'long' ? '16:9 Long' : '9:16 Short'}
                  size='small'
                  color={v.format === 'long' ? 'info' : 'primary'}
                  variant='tonal'
                  sx={{ height: 16, fontSize: 9, fontWeight: 700 }}
                />
                <Typography variant='caption' color='text.secondary' sx={{ fontSize: 10 }}>
                  {v.target_length_min && v.target_length_max ? `${v.target_length_min}–${v.target_length_max}s` : `${v.duration_sec}s`}
                </Typography>
                {v.video_source === 'experimental' && (
                  <Chip
                    label='🧪 Exp'
                    size='small'
                    color='warning'
                    variant='outlined'
                    sx={{ height: 16, fontSize: 9 }}
                  />
                )}
              </Box>
            </Box>
          </Box>
        )
      },
    }),
    columnHelper.accessor('voice_name', {
      header: 'Voice (ElevenLabs)',
      size: 175,
      cell: ({ row }) => {
        const v = row.original
        const isPlaying = playingVoiceId === v.id

        const femaleVoices = ['Sarah', 'Alice', 'Bella', 'Lily', 'Jessica', 'Laura', 'Matilda', 'Amelia', 'Elena', 'Hope', 'Natasha', 'Nova', 'Shimmer']
        const isFemale = femaleVoices.includes(v.voice_name)

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography className='text-sm font-medium'>
                  {v.voice_name || 'Adam'}
                </Typography>
                <Chip
                  label={isFemale ? 'F' : 'M'}
                  size='small'
                  variant='tonal'
                  color={isFemale ? 'secondary' : 'info'}
                  sx={{ height: 16, fontSize: 9, fontWeight: 700, minWidth: 16, px: 0.25 }}
                />
              </Box>
              <Typography variant='caption' color='text.disabled' sx={{ fontSize: 10 }}>
                {v.tempo && v.tempo !== 1 ? `${v.tempo}× speed` : '1.0× default'}
              </Typography>
            </Box>

            <Tooltip title={isPlaying ? 'Pause sample' : 'Listen to voice sample'}>
              <IconButton
                size='small'
                color={isPlaying ? 'primary' : 'default'}
                onClick={(e) => handlePlayVoice(v, e)}
                sx={{
                  bgcolor: isPlaying ? 'primary.lighter' : isFemale ? 'rgba(236,72,153,0.1)' : 'rgba(59,130,246,0.1)',
                  '&:hover': { bgcolor: isFemale ? 'rgba(236,72,153,0.2)' : 'rgba(59,130,246,0.2)' },
                  p: 0.5,
                }}
              >
                <i className={isPlaying ? 'tabler-player-pause text-[16px]' : 'tabler-player-play text-[16px]'} />
              </IconButton>
            </Tooltip>
          </Box>
        )
      },
    }),
    columnHelper.accessor('script', {
      header: 'Narration Script & Spoken Hook',
      size: 260,
      cell: ({ row }) => {
        const scriptText = row.original.script || ''
        const spokenCta = row.original.spoken_cta || ''
        const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.3,
              }}
            >
              {scriptText || <span style={{ fontStyle: 'italic', color: '#999' }}>No script set</span>}
            </Typography>
            {spokenCta && (
              <Typography
                variant='caption'
                sx={{
                  color: 'primary.main',
                  fontSize: 10,
                  fontWeight: 600,
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                📢 {spokenCta}
              </Typography>
            )}
            {wordCount > 0 && (
              <Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>
                {wordCount} words
              </Typography>
            )}
          </Box>
        )
      },
    }),
    columnHelper.accessor('cta_text', {
      header: 'Call To Action (CTA)',
      size: 210,
      cell: ({ row }) => {
        const v = row.original
        const ctaTypeInfo = v.cta_type ? CTA_TYPE_LABELS[v.cta_type] : null

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant='caption' noWrap title={v.cta_text}>
              {v.cta_text || '—'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
              {ctaTypeInfo && (
                <Chip
                  label={ctaTypeInfo.label}
                  size='small'
                  color={ctaTypeInfo.color}
                  variant='tonal'
                  sx={{ height: 16, fontSize: 9, fontWeight: 700 }}
                />
              )}
              {v.lead_capture_destination && (
                <Chip
                  label={v.lead_capture_destination.replace(/ landing page| lead magnet/gi, '')}
                  size='small'
                  variant='outlined'
                  sx={{ height: 16, fontSize: 9 }}
                />
              )}
            </Box>
          </Box>
        )
      },
    }),
    columnHelper.accessor('batch_name', {
      header: 'Batch & Topic',
      size: 190,
      cell: ({ row }) => {
        const v = row.original
        if (!v.batch_no) {
          return <Typography variant='caption' color='text.disabled'>Individual Video</Typography>
        }

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Typography variant='caption' fontWeight={700} color='text.primary' noWrap>
              Batch {v.batch_no}
            </Typography>
            <Typography variant='caption' color='text.secondary' noWrap sx={{ fontSize: 10 }}>
              {v.batch_name}
            </Typography>
          </Box>
        )
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 100,
      cell: ({ row }) => {
        const s = row.original.status || 'draft'
        const colorMap: Record<string, 'default' | 'info' | 'success' | 'error'> = {
          draft: 'default',
          generating: 'info',
          ready: 'success',
          failed: 'error',
        }

        return (
          <Chip
            label={s.toUpperCase()}
            size='small'
            color={colorMap[s] || 'default'}
            sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
          />
        )
      },
    }),
    columnHelper.accessor('cre_dt', {
      header: 'Created',
      size: 130,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant='caption' suppressHydrationWarning>{formatDate(row.original.cre_dt)}</Typography>
          <Typography variant='caption' color='text.disabled' sx={{ fontSize: 10 }}>
            {row.original.cre_by || 'System'}
          </Typography>
        </Box>
      ),
    }),
    {
      id: 'actions',
      header: 'Actions',
      size: 145,
      enableSorting: false,
      cell: ({ row }: any) => {
        const v = row.original

        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Tooltip title='Watch Video Screen Preview'>
              <IconButton
                size='small'
                color='info'
                onClick={() => {
                  setPreviewVideoRecord(v)
                  setPreviewVideoUrl(v.video_url || null)
                }}
                sx={{
                  bgcolor: 'rgba(0, 186, 255, 0.08)',
                  '&:hover': { bgcolor: 'rgba(0, 186, 255, 0.2)' },
                }}
              >
                <i className='tabler-eye text-[18px]' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Launch Pro Timeline Studio (Preview)'>
              <IconButton
                size='small'
                color='primary'
                onClick={() => setStudioTargetVideo(v)}
                sx={{
                  bgcolor: 'rgba(99, 102, 241, 0.08)',
                  '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.22)' },
                }}
              >
                <i className='tabler-movie text-[18px]' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Clone / Duplicate Video'>
              <IconButton
                size='small'
                color='secondary'
                onClick={(e) => handleCloneVideo(v, e)}
                sx={{
                  bgcolor: 'rgba(115, 103, 240, 0.08)',
                  '&:hover': { bgcolor: 'rgba(115, 103, 240, 0.2)' },
                }}
              >
                <i className='tabler-copy text-[18px]' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Edit Video'>
              <IconButton size='small' color='primary' onClick={() => setEditVideo(v)}>
                <i className='tabler-edit text-[18px]' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Delete Video'>
              <IconButton size='small' color='error' onClick={() => setDeleteTarget(v)}>
                <i className='tabler-trash text-[18px]' />
              </IconButton>
            </Tooltip>
          </Box>
        )
      },
    },
  ], [playingVoiceId])

  const defaultColVisibility = {
    batch_name: true,
  }

  const handleSaved = (saved: VideoRecord) => {
    setVideos(prev => {
      const idx = prev.findIndex(v => v.id === saved.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = saved

        return copy
      }

      return [saved, ...prev]
    })
  }

  if (loading && videos.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Top Filter Strip: Source Filters & Batch Lanes */}
        <Box sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          {/* Row 1: Source Filter Pills */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ mr: 0.5 }}>
                COLLECTION:
              </Typography>
              <Chip
                label={`📚 Script Library V2 (${counts.library_v2})`}
                clickable
                color={sourceFilter === 'library_v2' ? 'primary' : 'default'}
                variant={sourceFilter === 'library_v2' ? 'filled' : 'outlined'}
                onClick={() => setSourceFilter('library_v2')}
                sx={{ fontWeight: 700, height: 28 }}
              />
              <Chip
                label={`🧪 Experimental (${counts.experimental})`}
                clickable
                color={sourceFilter === 'experimental' ? 'warning' : 'default'}
                variant={sourceFilter === 'experimental' ? 'filled' : 'outlined'}
                onClick={() => setSourceFilter('experimental')}
                sx={{ fontWeight: 700, height: 28 }}
              />
              <Chip
                label={`✨ All Videos (${counts.all})`}
                clickable
                color={sourceFilter === 'all' ? 'secondary' : 'default'}
                variant={sourceFilter === 'all' ? 'filled' : 'outlined'}
                onClick={() => setSourceFilter('all')}
                sx={{ fontWeight: 700, height: 28 }}
              />
            </Box>

            <Typography variant='caption' color='text.secondary'>
              Showing <strong>{filteredVideos.length}</strong> of {videos.length} videos
            </Typography>
          </Box>

          {/* Row 2: Batch Filter Pills (when looking at Library V2 or All) */}
          {(sourceFilter === 'library_v2' || sourceFilter === 'all') && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', pt: 0.5, borderTop: '1px dashed', borderColor: 'divider' }}>
              <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ mr: 0.5, fontSize: 10 }}>
                BATCH LANES:
              </Typography>
              <Chip
                label='All Batches'
                size='small'
                clickable
                color={batchFilter === 'all' ? 'primary' : 'default'}
                variant={batchFilter === 'all' ? 'filled' : 'outlined'}
                onClick={() => setBatchFilter('all')}
                sx={{ height: 22, fontSize: 10, fontWeight: 700 }}
              />
              {[
                { no: 1, label: 'B1: Core Traps (10)' },
                { no: 2, label: 'B2: ORA Process (10)' },
                { no: 3, label: 'B3: FERS & Dates (10)' },
                { no: 4, label: 'B4: Insurance & Medicare (10)' },
                { no: 5, label: 'B5: TSP & Income (10)' },
                { no: 6, label: 'B6: Agency & Rules (10)' },
              ].map(b => (
                <Chip
                  key={b.no}
                  label={b.label}
                  size='small'
                  clickable
                  color={batchFilter === b.no ? (BATCH_COLORS[b.no] || 'primary') : 'default'}
                  variant={batchFilter === b.no ? 'filled' : 'outlined'}
                  onClick={() => setBatchFilter(b.no)}
                  sx={{ height: 22, fontSize: 10, fontWeight: 600 }}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Entity List View */}
        <EntityListView<VideoRecord>
          columns={columns as any}
          data={filteredVideos}
          storageKey='fs-videos-grid'
          defaultColVisibility={defaultColVisibility}
          title='Video Production & Assets'
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder='Search 60 scripts by title, spoken hook, topic, b-roll...'
          toolbarActions={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {/* Brand Bible & Production Rules Panel Button */}
              <Button
                size='small'
                variant='contained'
                color='primary'
                startIcon={<i className='tabler-book-2' />}
                onClick={() => setBrandSettingsOpen(true)}
                sx={{ fontWeight: 700, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
              >
                📋 Brand Bible & Production Rules
              </Button>

              <Button
                size='small'
                variant='contained'
                color='secondary'
                startIcon={<i className='tabler-microphone' />}
                onClick={() => setVoiceCloneOpen(true)}
                sx={{ fontWeight: 700 }}
              >
                🎙️ Record Mike's Voice
              </Button>

              <Button
                size='small'
                variant='outlined'
                color='primary'
                startIcon={<i className='tabler-brand-google-drive' />}
                href='https://drive.google.com/drive/folders/1BrTO9rFFgLbLJQI1NhXWtblQ8EcA2Cis'
                target='_blank'
                rel='noopener noreferrer'
              >
                Drive Folder
              </Button>
            </Box>
          }
          newButtonLabel='+ Create Video'
          onNewClick={() => setCreateOpen(true)}
          onExportCsv={(rows) => {
            const csv = ['ScriptNo,BatchNo,Title,Format,DurationSec,Voice,Status,SpokenCTA,OnScreenCTA,LeadDestination,CreatedBy'].concat(
              rows.map(r => `"${r.script_no ?? ''}","${r.batch_no ?? ''}","${(r.title || '').replace(/"/g, '""')}","${r.format}",${r.duration_sec},"${r.voice_name}","${r.status}","${(r.spoken_cta || '').replace(/"/g, '""')}","${(r.cta_text || '').replace(/"/g, '""')}","${(r.lead_capture_destination || '').replace(/"/g, '""')}","${r.cre_by}"`)
            ).join('\n')

            downloadBlob(csv, 'fedsafe_60_video_scripts.csv', 'text/csv')
          }}
          onExportJson={(rows) => downloadJson(rows, 'fedsafe_60_video_scripts.json')}
          emptyMessage='No videos match your current filter. Try selecting "All Videos" or clearing the search.'
          onRowDoubleClick={(row) => setEditVideo(row)}
        />
      </Box>

      {/* Create / Edit Dialog */}
      <VideoEditDialog
        open={createOpen || Boolean(editVideo)}
        onClose={() => {
          setCreateOpen(false)
          setEditVideo(null)
        }}
        video={editVideo}
        onSaved={handleSaved}
      />

      {/* Brand Bible & Global Production Rules Dialog */}
      <VideoBrandSettingsDialog
        open={brandSettingsOpen}
        onClose={() => setBrandSettingsOpen(false)}
      />

      {/* Confirmation Dialog for Soft Deletion */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete Video'
        message={`Are you sure you want to delete "${deleteTarget?.title || 'this video'}"? This action can be undone by an administrator.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        confirmColor='error'
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Video Screen Preview Player Modal */}
      <Dialog
        open={Boolean(previewVideoRecord)}
        onClose={() => {
          setPreviewVideoUrl(null)
          setPreviewVideoRecord(null)
        }}
        maxWidth='md'
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#090d16',
            color: 'white',
            borderRadius: 2.5,
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
          }
        }}
      >
        {/* Header */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          px: 3,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          bgcolor: 'rgba(15, 23, 42, 0.8)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <i className='tabler-player-play text-[22px] text-primary' />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {previewVideoRecord?.script_no !== null && previewVideoRecord?.script_no !== undefined && (
                  <Chip
                    label={`#${String(previewVideoRecord.script_no).padStart(2, '0')}`}
                    size='small'
                    color='primary'
                    sx={{ height: 18, fontSize: 10, fontWeight: 800 }}
                  />
                )}
                <Typography variant='subtitle1' fontWeight={700} sx={{ color: 'white', lineHeight: 1.2 }}>
                  {previewVideoRecord?.title || 'Video Script Preview'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                <Chip
                  label={previewVideoRecord?.format === 'long' ? '16:9 Landscape' : '9:16 Vertical Short'}
                  size='small'
                  color='primary'
                  sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                />
                <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  {previewVideoRecord?.target_length_min && previewVideoRecord?.target_length_max
                    ? `${previewVideoRecord.target_length_min}–${previewVideoRecord.target_length_max}s Target`
                    : `${previewVideoRecord?.duration_sec}s Duration`} · Voice: {previewVideoRecord?.voice_name || 'Adam'}
                </Typography>
              </Box>
            </Box>
          </Box>

          <IconButton
            size='small'
            onClick={() => { setPreviewVideoUrl(null); setPreviewVideoRecord(null) }}
            sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
          >
            <i className='tabler-x text-[18px]' />
          </IconButton>
        </Box>

        {/* Video Player Display Container */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2.5,
          bgcolor: '#030712',
          minHeight: 460,
        }}>
          {(() => {
            if (previewVideoRecord?.video_url) {
              return (
                <video
                  src={previewVideoRecord.video_url}
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
              )
            }

            if (!previewVideoRecord) return null

            const pool = SCENE_IMAGE_POOLS[previewVideoRecord.batch_no || 1] || SCENE_IMAGE_POOLS[1]
            const bgImage = previewVideoRecord.media_assets?.[0]?.url || pool[0]

            return (
              <Box sx={{
                width: previewVideoRecord.format === 'short' ? 320 : 600,
                height: previewVideoRecord.format === 'short' ? 520 : 340,
                maxWidth: '100%',
                bgcolor: '#040711',
                borderRadius: 3.5,
                border: '2px solid #3b82f6',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 25px rgba(59,130,246,0.25)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                p: 3,
                overflow: 'hidden',
              }}>
                {/* Real Cinematic Topic B-Roll Scene Background Image */}
                {bgImage && (
                  <Box
                    component='img'
                    src={bgImage}
                    alt='Scene Background'
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: playingVoiceId === previewVideoRecord.id ? 'scale(1.12) translate(-2%, -2%)' : 'scale(1.0)',
                      transition: 'transform 6s ease-out',
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Dark Vignette & Gradient Overlay */}
                <Box sx={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(3, 7, 18, 0.78) 0%, rgba(3, 7, 18, 0.40) 35%, rgba(3, 7, 18, 0.88) 100%)',
                  zIndex: 2,
                }} />

                {/* Header Badges */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 3 }}>
                  <Box sx={{ bgcolor: 'rgba(6,29,50,0.85)', p: '3px 6px', borderRadius: 1, border: '1px solid rgba(255,255,255,0.18)' }}>
                    <img src='/images/branding/fedsafe-shield-logo-transparent.webp' alt='FEDSafe' style={{ height: 18, display: 'block' }} />
                  </Box>
                  <Box sx={{ bgcolor: 'rgba(6,29,50,0.85)', p: '3px 6px', borderRadius: 1, border: '1px solid rgba(255,255,255,0.18)' }}>
                    <img src='/images/branding/fedsafe-sam-badge-transparent.webp' alt='SAM.gov' style={{ height: 16, display: 'block' }} />
                  </Box>
                </Box>

                {/* Center Script Content (100% Match) */}
                <Box sx={{
                  my: 'auto',
                  textAlign: 'center',
                  zIndex: 3,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                }}>
                  <Typography variant='caption' sx={{ color: '#38bdf8', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', display: 'block', mb: 0.75 }}>
                    {previewVideoRecord.batch_name || 'Federal Retirement Script'}
                  </Typography>
                  <Typography variant='h6' sx={{ color: '#facc15', fontWeight: 800, lineHeight: 1.3, mb: 1, textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>
                    "{previewVideoRecord.title}"
                  </Typography>
                  <Typography variant='body2' sx={{ color: '#e2e8f0', fontSize: 13, lineHeight: 1.5, px: 1, fontStyle: 'italic' }}>
                    "{previewVideoRecord.script ? previewVideoRecord.script.substring(0, 180) + (previewVideoRecord.script.length > 180 ? '…' : '') : 'No script configured'}"
                  </Typography>
                </Box>

                {/* Footer CTA */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, zIndex: 3 }}>
                  {previewVideoRecord.spoken_cta && (
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', textAlign: 'center' }}>
                      <Typography variant='caption' sx={{ color: '#c7d2fe', fontWeight: 700, fontSize: 10, display: 'block' }}>
                        📢 Closing Spoken CTA:
                      </Typography>
                      <Typography variant='caption' sx={{ color: 'white', fontWeight: 600, fontSize: 11 }}>
                        "{previewVideoRecord.spoken_cta}"
                      </Typography>
                    </Box>
                  )}

                  {previewVideoRecord.cta_text && (
                    <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 0.75, px: 1.5, borderRadius: 1, textAlign: 'center', fontWeight: 700, fontSize: 11 }}>
                      {previewVideoRecord.cta_text}
                    </Box>
                  )}
                </Box>
              </Box>
            )
          })()}
        </Box>

        {/* Footer / Script snippet & Action Controls */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          px: 3,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          bgcolor: 'rgba(15, 23, 42, 0.8)',
          flexWrap: 'wrap',
          gap: 1.5,
        }}>
          <Box sx={{ maxWidth: '60%', minWidth: 240 }}>
            {previewVideoRecord?.spoken_cta && (
              <Typography variant='caption' display='block' sx={{ color: 'primary.light', fontWeight: 600, mb: 0.25 }}>
                📢 {previewVideoRecord.spoken_cta}
              </Typography>
            )}
            {previewVideoRecord?.script && (
              <Typography
                variant='caption'
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                "{previewVideoRecord.script}"
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {previewVideoRecord && (
              <Button
                size='small'
                variant='outlined'
                color='secondary'
                startIcon={<i className='tabler-player-play' />}
                onClick={(e) => handlePlayVoice(previewVideoRecord, e)}
              >
                {playingVoiceId === previewVideoRecord.id ? 'Pause Audio' : 'Play Narration'}
              </Button>
            )}
            <Button
              size='small'
              variant='outlined'
              color='primary'
              startIcon={<i className='tabler-movie' />}
              onClick={() => {
                const target = previewVideoRecord
                setPreviewVideoUrl(null)
                setPreviewVideoRecord(null)
                if (target) setStudioTargetVideo(target)
              }}
            >
              Timeline Studio
            </Button>
            <Button
              size='small'
              variant='contained'
              color='primary'
              startIcon={<i className='tabler-edit' />}
              onClick={() => {
                const target = previewVideoRecord
                setPreviewVideoUrl(null)
                setPreviewVideoRecord(null)
                if (target) setEditVideo(target)
              }}
            >
              Edit Script
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Voice Clone Studio & Teleprompter Modal */}
      <VoiceCloneStudioDialog
        open={voiceCloneOpen}
        onClose={() => setVoiceCloneOpen(false)}
        onVoiceCloned={() => {
          setVoiceCloneOpen(false)
          fetchVideos()
        }}
      />

      {/* Pro Timeline Studio Modal */}
      <ProTimelineStudioDialog
        open={Boolean(studioTargetVideo)}
        onClose={() => setStudioTargetVideo(null)}
        video={studioTargetVideo}
        hyperframes={[]}
        script={studioTargetVideo?.script || ''}
        durationSec={studioTargetVideo?.duration_sec || 40}
        tempo={studioTargetVideo?.tempo || 1.0}
        voiceName={studioTargetVideo?.voice_name || 'Adam'}
        audioUrl={null}
      />
    </>
  )
}
