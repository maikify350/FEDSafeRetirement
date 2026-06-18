'use client'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import Grow from '@mui/material/Grow'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'

// Hook Imports
import { useProductLogo } from '@/hooks/useProductLogo'

// ─── App constants ────────────────────────────────────────────────────────────
const APP_INFO = {
  name: 'JobMaster',
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0',
  tagline: 'Field Service Management',
  description:
    'An AI-powered field service management platform for small businesses and solo entrepreneurs in trades like plumbing, painting, remodeling, and landscaping.',
  author: 'Ricardo B Garcia',
  company: 'VentureSoft LLC',
  website: 'JobMaster.MustAutomate.AI',
  websiteUrl: 'https://jobmaster.mustautomate.ai',
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, linkHref }: { icon: string; label: string; value: string; linkHref?: string }) {
  return (
    <div className='flex items-center gap-3 px-4 py-3'>
      <div
        className='w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0'
        style={{ background: 'color-mix(in srgb, var(--mui-palette-primary-main) 15%, transparent)' }}
      >
        <i className={`${icon} text-lg`} style={{ color: 'var(--mui-palette-primary-main)' }} />
      </div>
      <div className='flex-1 min-w-0'>
        <Typography variant='caption' sx={{ display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </Typography>
        {linkHref ? (
          <a href={linkHref} target='_blank' rel='noopener noreferrer' style={{ color: 'var(--mui-palette-primary-main)', textDecoration: 'none' }}>
            <Typography variant='body2' fontWeight={500} color='primary'>
              {value}
            </Typography>
          </a>
        ) : (
          <Typography variant='body2' fontWeight={500}>
            {value}
          </Typography>
        )}
      </div>
      {linkHref && <i className='tabler-external-link text-base' style={{ color: 'var(--mui-palette-text-disabled)' }} />}
    </div>
  )
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <Typography
      variant='overline'
      sx={{ display: 'block', px: 1, pt: 2.5, pb: 0.5, color: 'text.secondary', letterSpacing: '0.1em', fontSize: '0.7rem' }}
    >
      {label}
    </Typography>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
/**
 * Modal dialog version of the About page for quick access from the navbar.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/components/layout/shared/AboutModal.tsx
 */
export default function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const productLogo = useProductLogo()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='xs'
      fullWidth
      TransitionComponent={Grow}
      transitionDuration={{ enter: 420, exit: 180 }}
      PaperProps={{
        style: { transformOrigin: 'left bottom' },
        sx: {
          '@keyframes wx-slide-in': {
            '0%':   { transform: 'scale(0.15) translate(-60px, 60px)', opacity: 0 },
            '70%':  { transform: 'scale(1.03) translate(3px, -3px)',   opacity: 1 },
            '100%': { transform: 'scale(1)    translate(0,    0)',      opacity: 1 },
          },
          animation: open ? 'wx-slide-in 0.42s cubic-bezier(0.34, 1.5, 0.64, 1) forwards' : 'none',
        },
      }}
    >
      {/* ── Header ── */}
      <div
        className='flex items-center justify-between px-6 pt-5 pb-3'
        style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}
      >
        <div className='flex flex-col'>
          <Typography variant='h5' fontWeight={700} lineHeight={1.2}>
            {APP_INFO.name}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {APP_INFO.tagline}
          </Typography>
        </div>
        <IconButton size='small' onClick={onClose}>
          <i className='tabler-x text-xl' />
        </IconButton>
      </div>

      {/* ── Body ── */}
      <DialogContent sx={{ px: 3, pt: 2, pb: 0 }}>
        {/* Product Image */}
        <div className='flex justify-center pt-2 pb-1'>
          <img
            src={productLogo}
            alt='JobMaster'
            style={{ width: 200, height: 200, objectFit: 'contain' }}
          />
        </div>

        {/* Version + Description */}
        <div className='flex flex-col items-center text-center pb-4 gap-3'>
          <Chip
            label={`Version ${APP_INFO.version}`}
            size='small'
            color='primary'
            variant='tonal'
            sx={{ fontWeight: 600 }}
          />
          <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.7 }}>
            {APP_INFO.description}
          </Typography>
        </div>

        <Divider />

        {/* Developer */}
        <SectionLabel label='Developer' />
        <div
          className='rounded-2xl overflow-hidden'
          style={{ border: '1px solid var(--mui-palette-divider)', background: 'var(--mui-palette-background-paper)' }}
        >
          <InfoRow icon='tabler-user' label='Author' value={APP_INFO.author} />
          <Divider />
          <InfoRow icon='tabler-building' label='Company' value={APP_INFO.company} />
        </div>

        {/* Website */}
        <SectionLabel label='Website' />
        <div
          className='rounded-2xl overflow-hidden mb-2'
          style={{ border: '1px solid var(--mui-palette-divider)', background: 'var(--mui-palette-background-paper)' }}
        >
          <InfoRow
            icon='tabler-globe'
            label='App Website'
            value={APP_INFO.website}
            linkHref={APP_INFO.websiteUrl}
          />
        </div>
      </DialogContent>

      {/* ── Footer ── */}
      <DialogActions sx={{ justifyContent: 'center', flexDirection: 'column', gap: 0.25, pb: 3, pt: 2 }}>
        <Typography variant='caption' color='primary' fontWeight={500}>
          Made with ❤️ by {APP_INFO.company}
        </Typography>
        <Typography variant='caption' color='text.disabled'>
          © 2026 All rights reserved
        </Typography>
      </DialogActions>
    </Dialog>
  )
}
