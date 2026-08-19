'use client'

/**
 * ProTimelineStudioDialog.tsx — Futuristic, High-Impact Multi-Track Hyperframe Timeline Studio
 * Features:
 *   • Multi-Track Canvas (Spoken Waveform, Hyperframes Typography, AI Scene Prompts, Camera Motion, Brand Overlays)
 *   • Interactive Time Ruler & Scrubber with real-time Play/Pause audio playback
 *   • Real-Time Synchronized Phone Canvas Mockup previewing active subtitles and camera motion
 *   • Track Zoom controls, Frame Counter (@ 30fps), and Remotion Engine Export Preview
 */

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Slider from '@mui/material/Slider'
import Tooltip from '@mui/material/Tooltip'
import Paper from '@mui/material/Paper'
import CardMedia from '@mui/material/CardMedia'
import CircularProgress from '@mui/material/CircularProgress'

import type { Hyperframe, VideoRecord } from './VideoEditDialog'

interface ProTimelineStudioDialogProps {
  open: boolean
  onClose: () => void
  video: VideoRecord | null
  hyperframes: Hyperframe[]
  script: string
  durationSec: number
  tempo: number
  voiceName: string
  audioUrl?: string | null
  ctaText?: string
}

export default function ProTimelineStudioDialog({
  open,
  onClose,
  video,
  hyperframes,
  script,
  durationSec,
  tempo,
  voiceName,
  audioUrl,
  ctaText,
}: ProTimelineStudioDialogProps) {
  const totalDuration = Math.max(5, durationSec || 40)
  const fps = 30
  const totalFrames = Math.round(totalDuration * fps)

  // Timeline playback state
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [zoomScale, setZoomScale] = useState<number>(1.0) // 1.0 = standard width
  const [selectedHfId, setSelectedHfId] = useState<string | null>(null)

  // Track Mute/Solo states
  const [muteAudio, setMuteAudio] = useState(false)
  const [muteText, setMuteText] = useState(false)
  const [mutePrompts, setMutePrompts] = useState(false)

  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const pausedAtRef = useRef<number>(0)
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null)
  const timelineContainerRef = useRef<HTMLDivElement | null>(null)

  // Auto-generate hyperframes if empty
  const activeHyperframes = useMemo(() => {
    if (hyperframes && hyperframes.length > 0) return hyperframes

    // Fallback split sentences
    const sentences = script.split(/(?<=[.?!])\s+/).filter(Boolean)
    const segDur = totalDuration / Math.max(1, sentences.length)

    return sentences.map((s, idx) => ({
      id: `gen_hf_${idx + 1}`,
      order: idx + 1,
      timestamp_start: Number((idx * segDur).toFixed(1)),
      timestamp_end: Number(((idx + 1) * segDur).toFixed(1)),
      text_segment: s.replace(/\/\//g, '').replace(/<[^>]*>/g, '').trim(),
      visual_prompt: `Cinematic visualization: "${s.substring(0, 45)}..."`,
      transition: idx === 0 ? 'fade' : idx % 2 === 0 ? 'slide_left' : 'zoom_in',
      camera_motion: idx % 2 === 0 ? 'pan_slow_right' : 'push_forward',
    })) as Hyperframe[]
  }, [hyperframes, script, totalDuration])

  // Find active hyperframe at current playhead time
  const currentHyperframe = useMemo(() => {
    return activeHyperframes.find(
      hf => currentTime >= hf.timestamp_start && currentTime <= hf.timestamp_end
    ) || activeHyperframes[0]
  }, [activeHyperframes, currentTime])

  // Playback engine
  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = performance.now() - (pausedAtRef.current * 1000)

      const loop = (now: number) => {
        if (!startTimeRef.current) return
        const elapsed = (now - startTimeRef.current) / 1000

        if (elapsed >= totalDuration) {
          setCurrentTime(totalDuration)
          setIsPlaying(false)
          pausedAtRef.current = 0
          if (audioInstanceRef.current) {
            audioInstanceRef.current.pause()
            audioInstanceRef.current.currentTime = 0
          }
          return
        }

        setCurrentTime(elapsed)
        animationFrameRef.current = requestAnimationFrame(loop)
      }

      animationFrameRef.current = requestAnimationFrame(loop)

      // Audio sync
      if (audioUrl && !muteAudio) {
        if (!audioInstanceRef.current) {
          audioInstanceRef.current = new Audio(audioUrl)
        }
        audioInstanceRef.current.currentTime = pausedAtRef.current
        audioInstanceRef.current.play().catch(() => {})
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      pausedAtRef.current = currentTime
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause()
      }
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioInstanceRef.current) audioInstanceRef.current.pause()
    }
  }, [isPlaying, totalDuration, audioUrl, muteAudio])

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setIsPlaying(false)
      setCurrentTime(0)
      pausedAtRef.current = 0
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause()
        audioInstanceRef.current.currentTime = 0
      }
    }
  }, [open])

  // Time Scrubbing
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    const newTime = percentage * totalDuration
    setCurrentTime(newTime)
    pausedAtRef.current = newTime
    if (audioInstanceRef.current) {
      audioInstanceRef.current.currentTime = newTime
    }
  }

  // Format MM:SS.SS
  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    const ms = Math.floor((sec % 1) * 100)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
  }

  const currentFrame = Math.min(totalFrames, Math.round(currentTime * fps))

  // Color mappings
  const transitionColors: Record<string, string> = {
    fade: '#3b82f6',
    slide_left: '#8b5cf6',
    zoom_in: '#ec4899',
    dissolve: '#10b981',
    glitch: '#f59e0b',
  }

  const cameraColors: Record<string, string> = {
    push_forward: '#06b6d4',
    pan_slow_right: '#14b8a6',
    orbit: '#84cc16',
    tilt_up: '#f97316',
    static: '#64748b',
  }

  // Timeline track pixels width calculation
  const baseTrackWidth = 1000 * zoomScale

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='xl'
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0a0d14',
          color: '#f1f5f9',
          borderRadius: 2.5,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95)',
          overflow: 'hidden',
          minHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* ── Studio Header Bar ────────────────────────────────────────── */}
      <DialogTitle sx={{
        bgcolor: '#0f172a',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        p: 2,
        px: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 38,
            height: 38,
            borderRadius: 1.5,
            bgcolor: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8',
          }}>
            <i className='tabler-movie text-[22px]' />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant='h6' fontWeight={800} sx={{ color: '#fff', letterSpacing: 0.2 }}>
                Hyperframe Pro Timeline Studio
              </Typography>
              <Chip
                label='READ-ONLY COMPOSER'
                size='small'
                sx={{
                  bgcolor: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  fontWeight: 800,
                  fontSize: 10,
                  height: 20,
                }}
              />
            </Box>
            <Typography variant='caption' sx={{ color: '#94a3b8', fontSize: 11 }}>
              {video?.title || 'Federal Retirement Presentation'} · {video?.video_model || 'Higgsfield 2.0'} · Voice: {voiceName} ({tempo.toFixed(2)}×)
            </Typography>
          </Box>
        </Box>

        {/* Center Timecode Readout */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          bgcolor: '#05070d',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          px: 2.5,
          py: 0.75,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography sx={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 800, color: '#38bdf8' }}>
              {formatTimecode(currentTime)}
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>
              / {formatTimecode(totalDuration)}
            </Typography>
          </Box>
          <Box sx={{ height: 20, width: 1, bgcolor: 'rgba(255, 255, 255, 0.15)' }} />
          <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>
            {String(currentFrame).padStart(4, '0')}f <span style={{ color: '#64748b', fontSize: 10 }}>@ 30fps</span>
          </Typography>
        </Box>

        {/* Right Action Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Zoom Slider */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 120 }}>
            <i className='tabler-zoom-out text-[14px] text-slate-400' />
            <Slider
              size='small'
              value={zoomScale}
              min={0.8}
              max={2.5}
              step={0.1}
              onChange={(_, v) => setZoomScale(v as number)}
              sx={{ color: '#6366f1' }}
            />
            <i className='tabler-zoom-in text-[14px] text-slate-400' />
          </Box>

          <Button
            variant='contained'
            color='primary'
            size='small'
            startIcon={<i className='tabler-brand-youtube' />}
            sx={{
              bgcolor: '#6366f1',
              fontWeight: 700,
              fontSize: 12,
              '&:hover': { bgcolor: '#4f46e5' },
            }}
          >
            Remotion Composition Ready
          </Button>

          <IconButton size='small' onClick={onClose} sx={{ color: '#94a3b8', '&:hover': { color: '#fff' } }}>
            <i className='tabler-x text-[20px]' />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* ── Studio Body (Split View: Left Canvas Preview, Right Timeline) ──── */}
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {/* Top Preview Canvas & Live Director Inspector */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '340px 1fr' },
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          bgcolor: '#070a12',
          minHeight: 280,
        }}>
          {/* 1. Live Phone Mockup Preview */}
          <Box sx={{
            p: 2,
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#04060b',
          }}>
            {/* Phone Bezel */}
            <Box sx={{
              width: 140,
              height: 248,
              borderRadius: 3.5,
              border: '2px solid rgba(255, 255, 255, 0.2)',
              bgcolor: '#000',
              boxShadow: '0 12px 30px rgba(0,0,0,0.8), 0 0 15px rgba(99,102,241,0.2)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              p: 1,
            }}>
              {/* Top Notch & Brand Badges */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {video?.metadata?.show_shield_logo !== false && (
                    <Box sx={{ bgcolor: 'rgba(0,0,0,0.5)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.1)' }}>
                      <img
                        src='/images/branding/fedsafe-shield-logo-transparent.webp'
                        alt='FEDSafe Shield'
                        style={{ height: 12, objectFit: 'contain', display: 'block' }}
                      />
                    </Box>
                  )}
                  {video?.metadata?.show_sam_badge !== false && (
                    <Box sx={{ bgcolor: 'rgba(0,0,0,0.5)', p: '2px 4px', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.1)' }}>
                      <img
                        src='/images/branding/fedsafe-sam-badge-transparent.webp'
                        alt='SAM.gov Registered'
                        style={{ height: 11, objectFit: 'contain', display: 'block' }}
                      />
                    </Box>
                  )}
                </Box>
                <Chip
                  label={currentHyperframe?.camera_motion || 'Motion'}
                  size='small'
                  sx={{
                    height: 12,
                    fontSize: 7,
                    fontWeight: 700,
                    bgcolor: 'rgba(6, 182, 212, 0.25)',
                    color: '#22d3ee',
                    px: 0,
                  }}
                />
              </Box>

              {/* Center Live Subtitle Preview */}
              <Box sx={{
                zIndex: 2,
                my: 'auto',
                p: 0.75,
                bgcolor: 'rgba(0, 0, 0, 0.65)',
                borderRadius: 1,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(4px)',
                textAlign: 'center',
              }}>
                <Typography sx={{ fontSize: 9, fontWeight: 800, color: '#facc15', lineHeight: 1.2, mb: 0.25 }}>
                  {currentHyperframe?.text_segment || 'Federal Retirement Overview'}
                </Typography>
                <Typography sx={{ fontSize: 7, color: '#94a3b8' }}>
                  Transition: <span style={{ color: '#a78bfa' }}>{currentHyperframe?.transition}</span>
                </Typography>
              </Box>

              {/* Bottom CTA Overlay */}
              <Box sx={{ zIndex: 2, bgcolor: 'rgba(15, 23, 42, 0.85)', borderRadius: 0.5, p: 0.5, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 6.5, fontWeight: 700, color: '#38bdf8' }}>
                  {ctaText || 'FedSafeRetirement.com'}
                </Typography>
              </Box>

              {/* Background Ambient Glow */}
              <Box sx={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'radial-gradient(circle at center, rgba(99,102,241,0.2) 0%, rgba(0,0,0,0.8) 100%)',
                zIndex: 1,
              }} />
            </Box>
          </Box>

          {/* 2. Active Hyperframe & Director Inspector */}
          <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant='subtitle2' fontWeight={800} sx={{ color: '#38bdf8', letterSpacing: 0.5 }}>
                  FRAME #{currentHyperframe?.order || 1} INSPECTOR
                </Typography>
                <Chip
                  label={`${currentHyperframe?.timestamp_start}s ➔ ${currentHyperframe?.timestamp_end}s`}
                  size='small'
                  sx={{ height: 18, fontSize: 10, bgcolor: 'rgba(255,255,255,0.06)', color: '#cbd5e1', fontFamily: 'monospace' }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={`Transition: ${currentHyperframe?.transition || 'fade'}`}
                  size='small'
                  sx={{
                    height: 20, fontSize: 10, fontWeight: 700,
                    bgcolor: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                  }}
                />
                <Chip
                  label={`Camera: ${currentHyperframe?.camera_motion || 'push_forward'}`}
                  size='small'
                  sx={{
                    height: 20, fontSize: 10, fontWeight: 700,
                    bgcolor: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                  }}
                />
              </Box>
            </Box>

            {/* Visual Prompt Card */}
            <Box sx={{ p: 1.5, bgcolor: '#0b1120', borderRadius: 1.5, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <Typography variant='caption' sx={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', fontSize: 9 }}>
                AI Visual Prompt & Motion Directive
              </Typography>
              <Typography variant='body2' sx={{ color: '#e2e8f0', mt: 0.5, fontSize: 13, lineHeight: 1.4 }}>
                "{currentHyperframe?.visual_prompt}"
              </Typography>
            </Box>

            {/* Spoken Text Segment */}
            <Box sx={{ p: 1.5, bgcolor: '#0b1120', borderRadius: 1.5, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <Typography variant='caption' sx={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', fontSize: 9 }}>
                Narrative Script Segment
              </Typography>
              <Typography variant='body2' sx={{ color: '#fbbf24', fontWeight: 600, mt: 0.5, fontSize: 13 }}>
                "{currentHyperframe?.text_segment}"
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ── Studio Multi-Track Timeline Canvas ────────────────────── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#06080e', overflow: 'hidden' }}>
          {/* Timeline Transport Toolbar */}
          <Box sx={{
            p: 1,
            px: 2,
            bgcolor: '#090d16',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title={isPlaying ? 'Pause (Space)' : 'Play Timeline (Space)'}>
                <IconButton
                  size='small'
                  onClick={() => setIsPlaying(!isPlaying)}
                  sx={{
                    bgcolor: isPlaying ? '#ef4444' : '#6366f1',
                    color: '#fff',
                    p: 0.75,
                    '&:hover': { bgcolor: isPlaying ? '#dc2626' : '#4f46e5' },
                  }}
                >
                  <i className={isPlaying ? 'tabler-player-pause text-[18px]' : 'tabler-player-play text-[18px]'} />
                </IconButton>
              </Tooltip>

              <Tooltip title='Rewind to Start'>
                <IconButton
                  size='small'
                  onClick={() => {
                    setCurrentTime(0)
                    pausedAtRef.current = 0
                    if (audioInstanceRef.current) audioInstanceRef.current.currentTime = 0
                  }}
                  sx={{ color: '#94a3b8' }}
                >
                  <i className='tabler-player-skip-back text-[16px]' />
                </IconButton>
              </Tooltip>

              <Box sx={{ height: 16, width: 1, bgcolor: 'rgba(255, 255, 255, 0.1)', mx: 0.5 }} />

              <Typography variant='caption' sx={{ color: '#94a3b8', fontWeight: 700, fontSize: 11 }}>
                TRACKS ({activeHyperframes.length} Hyperframes · 4 Layers)
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label='Snap: 0.1s'
                size='small'
                sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
              />
              <Chip
                label='Render Mode: 60fps Remotion'
                size='small'
                sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 700 }}
              />
            </Box>
          </Box>

          {/* Timeline Multi-Track Body (Scrollable Container) */}
          <Box
            ref={timelineContainerRef}
            sx={{
              flex: 1,
              overflowX: 'auto',
              overflowY: 'auto',
              position: 'relative',
              p: 2,
              userSelect: 'none',
              cursor: 'crosshair',
            }}
            onClick={handleTimelineClick}
          >
            <Box sx={{ width: baseTrackWidth, minWidth: '100%', position: 'relative' }}>
              {/* 1. Time Ruler Bar */}
              <Box sx={{
                height: 28,
                bgcolor: '#0f172a',
                borderRadius: 1,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                position: 'relative',
                mb: 1.5,
              }}>
                {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, sec) => {
                  const leftPercent = (sec / totalDuration) * 100
                  const isMajor = sec % 5 === 0

                  return (
                    <Box
                      key={sec}
                      sx={{
                        position: 'absolute',
                        left: `${leftPercent}%`,
                        top: 0,
                        bottom: 0,
                        borderLeft: isMajor ? '2px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.15)',
                        pl: 0.5,
                      }}
                    >
                      {isMajor && (
                        <Typography sx={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: '#94a3b8' }}>
                          00:{String(sec).padStart(2, '0')}s
                        </Typography>
                      )}
                    </Box>
                  )
                })}
              </Box>

              {/* ── TRACK 1: Voiceover & Audio Waveform Track ──────────────── */}
              <Box sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <i className='tabler-waveform text-[14px] text-amber-400' />
                  <Typography variant='caption' sx={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>
                    Track 1: ElevenLabs Voiceover & Audio Waveform ({voiceName})
                  </Typography>
                </Box>
                <Box sx={{
                  height: 48,
                  bgcolor: '#131b2e',
                  borderRadius: 1.5,
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  {/* Simulated Waveform SVG Curve */}
                  <svg width='100%' height='100%' style={{ opacity: 0.75 }}>
                    <path
                      d='M 0 24 Q 20 8, 40 24 T 80 24 T 120 12 T 160 36 T 200 16 T 240 24 T 280 8 T 320 24 T 360 40 T 400 24 T 440 10 T 480 24 T 520 38 T 560 24 T 600 8 T 640 24 T 680 34 T 720 24 T 760 12 T 800 24 T 840 38 T 880 24 T 920 14 T 960 24 T 1000 30'
                      fill='none'
                      stroke='#f59e0b'
                      strokeWidth='2'
                    />
                  </svg>
                  <Typography sx={{ position: 'absolute', left: 12, fontSize: 11, fontWeight: 700, color: '#fcd34d' }}>
                    🎙️ Voice: {voiceName} · TTS Turbo 2.5
                  </Typography>
                </Box>
              </Box>

              {/* ── TRACK 2: Hyperframes & Kinetic Subtitles Track ─────────── */}
              <Box sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <i className='tabler-typography text-[14px] text-purple-400' />
                  <Typography variant='caption' sx={{ fontSize: 10, fontWeight: 800, color: '#c084fc', textTransform: 'uppercase' }}>
                    Track 2: Kinetic Typography & Spoken Hyperframes ({activeHyperframes.length} Blocks)
                  </Typography>
                </Box>
                <Box sx={{
                  height: 52,
                  bgcolor: '#0f1422',
                  borderRadius: 1.5,
                  border: '1px solid rgba(192, 132, 252, 0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {activeHyperframes.map((hf, i) => {
                    const left = (hf.timestamp_start / totalDuration) * 100
                    const width = ((hf.timestamp_end - hf.timestamp_start) / totalDuration) * 100
                    const isActive = currentTime >= hf.timestamp_start && currentTime <= hf.timestamp_end

                    return (
                      <Box
                        key={hf.id || i}
                        onClick={(e) => { e.stopPropagation(); setSelectedHfId(hf.id); setCurrentTime(hf.timestamp_start) }}
                        sx={{
                          position: 'absolute',
                          left: `${left}%`,
                          width: `${width}%`,
                          top: 4,
                          bottom: 4,
                          bgcolor: isActive ? 'rgba(168, 85, 247, 0.35)' : 'rgba(168, 85, 247, 0.15)',
                          border: isActive ? '2px solid #c084fc' : '1px solid rgba(168, 85, 247, 0.4)',
                          borderRadius: 1,
                          p: 0.5,
                          px: 1,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: isActive ? '0 0 12px rgba(168, 85, 247, 0.4)' : 'none',
                        }}
                      >
                        <Typography noWrap sx={{ fontSize: 10, fontWeight: 700, color: isActive ? '#fff' : '#e9d5ff' }}>
                          #{hf.order} {hf.text_segment}
                        </Typography>
                        <Chip
                          label={hf.transition}
                          size='small'
                          sx={{
                            height: 14,
                            fontSize: 8,
                            bgcolor: transitionColors[hf.transition] || '#a855f7',
                            color: '#fff',
                            fontWeight: 800,
                            ml: 0.5,
                          }}
                        />
                      </Box>
                    )
                  })}
                </Box>
              </Box>

              {/* ── TRACK 3: AI Scene Prompts & Camera Motion Track ─────────── */}
              <Box sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <i className='tabler-video text-[14px] text-cyan-400' />
                  <Typography variant='caption' sx={{ fontSize: 10, fontWeight: 800, color: '#22d3ee', textTransform: 'uppercase' }}>
                    Track 3: AI Scene Directives & Camera Fly-Bys ({video?.video_model || 'Higgsfield 2.0'})
                  </Typography>
                </Box>
                <Box sx={{
                  height: 52,
                  bgcolor: '#0a1520',
                  borderRadius: 1.5,
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {activeHyperframes.map((hf, i) => {
                    const left = (hf.timestamp_start / totalDuration) * 100
                    const width = ((hf.timestamp_end - hf.timestamp_start) / totalDuration) * 100
                    const isActive = currentTime >= hf.timestamp_start && currentTime <= hf.timestamp_end

                    return (
                      <Box
                        key={`prompt_${hf.id || i}`}
                        onClick={(e) => { e.stopPropagation(); setCurrentTime(hf.timestamp_start) }}
                        sx={{
                          position: 'absolute',
                          left: `${left}%`,
                          width: `${width}%`,
                          top: 4,
                          bottom: 4,
                          bgcolor: isActive ? 'rgba(6, 182, 212, 0.3)' : 'rgba(6, 182, 212, 0.12)',
                          border: isActive ? '2px solid #22d3ee' : '1px solid rgba(6, 182, 212, 0.35)',
                          borderRadius: 1,
                          p: 0.5,
                          px: 1,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: isActive ? '0 0 12px rgba(6, 182, 212, 0.4)' : 'none',
                        }}
                      >
                        <Typography noWrap sx={{ fontSize: 10, color: '#a5f3fc', fontWeight: 600 }}>
                          🎬 {hf.visual_prompt}
                        </Typography>
                        <Chip
                          label={hf.camera_motion}
                          size='small'
                          sx={{
                            height: 14,
                            fontSize: 8,
                            bgcolor: cameraColors[hf.camera_motion] || '#06b6d4',
                            color: '#fff',
                            fontWeight: 800,
                            ml: 0.5,
                          }}
                        />
                      </Box>
                    )
                  })}
                </Box>
              </Box>

              {/* ── TRACK 4: Brand Identity & CTA Track ────────────────────── */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <i className='tabler-shield-check text-[14px] text-emerald-400' />
                  <Typography variant='caption' sx={{ fontSize: 10, fontWeight: 800, color: '#34d399', textTransform: 'uppercase' }}>
                    Track 4: FedSafe SAM.gov Verified Brand Watermark & CTA
                  </Typography>
                </Box>
                <Box sx={{
                  height: 38,
                  bgcolor: '#0a1914',
                  borderRadius: 1.5,
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  px: 1.5,
                }}>
                  <Box sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 4,
                    bottom: 4,
                    bgcolor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1.5,
                  }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#6ee7b7' }}>
                      🛡️ FedSafe Shield + SAM.gov UEI Registered Badge (Continuous Overlay)
                    </Typography>
                    <Chip
                      label={ctaText ? `CTA: ${ctaText}` : 'CTA: FedSafeRetirement.com'}
                      size='small'
                      sx={{ height: 16, fontSize: 9, bgcolor: '#10b981', color: '#fff', fontWeight: 800 }}
                    />
                  </Box>
                </Box>
              </Box>

              {/* ── Glowing Scrubber / Playhead Cursor ────────────────────── */}
              <Box sx={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${(currentTime / totalDuration) * 100}%`,
                width: 2,
                bgcolor: '#ef4444',
                boxShadow: '0 0 10px #ef4444, 0 0 20px #ef4444',
                zIndex: 10,
                pointerEvents: 'none',
                transition: isPlaying ? 'none' : 'left 0.05s ease-out',
              }}>
                {/* Playhead Handle Top */}
                <Box sx={{
                  position: 'absolute',
                  top: -6,
                  left: -5,
                  width: 12,
                  height: 12,
                  bgcolor: '#ef4444',
                  transform: 'rotate(45deg)',
                  boxShadow: '0 0 6px #ef4444',
                }} />
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
