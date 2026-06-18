'use client'

/**
 * VoiceExplainerPlayer — Floating VCR-style control bar
 *
 * Appears at the bottom of the screen when:
 *   1. Voice Explainers are enabled in Settings
 *   2. The current route has an audio explainer
 *
 * Controls: Restart | Play/Pause | progress bar | time
 */

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'

import { useVoiceExplainerAudio } from '@/hooks/useVoiceExplainer'
import { useVoiceExplainerEnabled, useVoiceExplainer } from '@/lib/state/voice-explainer-store'

// ─── Route → Supabase public audio URL map ───────────────────────────────────
// Audio files live in the JobMaster_Corp (platform-level) Supabase project,
// NOT the per-tenant project. Use NEXT_PUBLIC_CORP_SUPABASE_URL in .env.local
const SUPABASE_URL = process.env.NEXT_PUBLIC_CORP_SUPABASE_URL ?? ''
const BUCKET = 'Explainers'

function audioUrl(file: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${file}`
}

export const EXPLAINER_ROUTES: Record<string, string> = {
  '/':                audioUrl('DashboardView.mp3'),
  '/home':            audioUrl('DashboardView.mp3'),
  '/dashboard':       audioUrl('DashboardView.mp3'),
  '/calendar':        audioUrl('CalendarView.mp3'),
  '/gallery':         audioUrl('GalleryView.mp3'),
  '/clients':         audioUrl('ClientList.mp3'),
  '/requests':        audioUrl('RequestList.mp3'),
  '/quotes':          audioUrl('QuoteList.mp3'),
  '/jobs':            audioUrl('JobList.mp3'),
  '/invoices':        audioUrl('InvoiceList.mp3'),
  '/vendors':         audioUrl('VendorList.mp3'),
  '/purchase-orders': audioUrl('PurchaseOrderList.mp3'),
  '/team':            audioUrl('TeamList.mp3'),
  '/solutions':       audioUrl('SolutionList.mp3'),
  '/configuration':   audioUrl('ConfigurationView.mp3'),
  '/reports':         audioUrl('ReportsView.mp3'),
  '/scheduling':      audioUrl('DispatchView.mp3'), // Reuse dispatch explainer for now
  '/dispatch':        audioUrl('DispatchView.mp3'),
}

/** Named audio URLs for edit drawers (not route-based) */
export const DRAWER_AUDIO: Record<string, string> = {
  ClientEditDrawer:  audioUrl('ClientEdit.mp3'),
  RequestEditDrawer: audioUrl('RequestEdit.mp3'),
  QuoteEditDrawer:   audioUrl('QuoteEdit.mp3'),
  JobEditDrawer:     audioUrl('JobEdit.mp3'),
  InvoiceEditDrawer: audioUrl('InvoiceEdit.mp3'),
  VendorEditDrawer:  audioUrl('VendorEdit.mp3'),
  POEditDrawer:      audioUrl('POEdit.mp3'),
  TeamEditDrawer:        audioUrl('TeamEdit.mp3'),
  SolutionEditDrawer:    audioUrl('SolutionEdit.mp3'),
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

interface VoiceExplainerPlayerProps {
  /** When true, renders inline (no fixed positioning) — used in the navbar */
  inline?: boolean
}

export default function VoiceExplainerPlayer({ inline }: VoiceExplainerPlayerProps = {}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const pathname  = usePathname()
  const enabled   = useVoiceExplainerEnabled()
  const { drawerAudioUrl } = useVoiceExplainer()

  // Drawer audio takes priority over route audio
  const routeAudio = EXPLAINER_ROUTES[pathname] ?? null
  const audioSrc   = enabled ? (drawerAudioUrl ?? routeAudio) : null

  const { isPlaying, currentTime, duration, play, pause, restart } = useVoiceExplainerAudio(audioSrc)

  // Show VCR bar whenever there's an explainer for this context (route OR open drawer)
  const visible  = enabled && !!(drawerAudioUrl ?? routeAudio)
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (!mounted || !visible) return null

  return (
      <Paper
        elevation={8}
        sx={{
          ...(inline ? {} : {
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1400,
          }),
          display: 'flex',
          alignItems: 'center',
          gap: inline ? 0.5 : 1,
          px: inline ? 1.5 : 2,
          py: inline ? 0.5 : 1,
          borderRadius: 10,
          minWidth: inline ? 220 : 260,
          maxWidth: inline ? 320 : 380,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'primary.main',
          boxShadow: t => `0 4px 24px ${t.palette.primary.main}44`,
          flexShrink: 0,
        }}
      >
        {/* Speaker icon / label */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'primary.main', mr: 0.5, flexShrink: 0 }}>
          <i className='tabler-volume text-xl' />
          <Typography variant='caption' fontWeight={700} sx={{ color: 'primary.main', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Guide
          </Typography>
        </Box>

        {/* Progress bar */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <LinearProgress
            variant='determinate'
            value={progress}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': { borderRadius: 2 },
            }}
          />
        </Box>

        {/* Time */}
        <Typography variant='caption' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.7rem', minWidth: 42, textAlign: 'right', flexShrink: 0 }}>
          {fmtTime(currentTime)}{duration > 0 ? ` / ${fmtTime(duration)}` : ''}
        </Typography>

        {/* Restart */}
        <Tooltip title='Restart'>
          <IconButton size='small' onClick={restart} sx={{ color: 'text.secondary', p: 0.5 }}>
            <i className='tabler-player-skip-back text-base' />
          </IconButton>
        </Tooltip>

        {/* Play / Pause */}
        <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
          <IconButton
            size='small'
            onClick={isPlaying ? pause : play}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              p: 0.75,
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            <i className={`${isPlaying ? 'tabler-player-pause' : 'tabler-player-play'} text-base`} />
          </IconButton>
        </Tooltip>
      </Paper>
  )
}
