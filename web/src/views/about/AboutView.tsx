'use client'

import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { useProductLogo } from '@/hooks/useProductLogo'

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

function InfoRow({ icon, label, value, linkHref }: { icon: string; label: string; value: string; linkHref?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5 }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: 'primary.lightOpacity' }}>
        <i className={`${icon} text-lg`} style={{ color: 'var(--mui-palette-primary-main)' }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant='caption' sx={{ display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</Typography>
        {linkHref ? (
          <a href={linkHref} target='_blank' rel='noopener noreferrer' style={{ color: 'var(--mui-palette-primary-main)', textDecoration: 'none' }}>
            <Typography variant='body2' fontWeight={500} color='primary'>{value}</Typography>
          </a>
        ) : (
          <Typography variant='body2' fontWeight={500}>{value}</Typography>
        )}
      </Box>
      {linkHref && <i className='tabler-external-link text-base' style={{ color: 'var(--mui-palette-text-disabled)' }} />}
    </Box>
  )
}

/**
 * About page showing app version, build info, system status, and diagnostics.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/about/AboutView.tsx
 */
export default function AboutView({ hideCloseButton }: { hideCloseButton?: boolean } = {}) {
  const logoSrc = useProductLogo()
  const router = useRouter()

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', pt: hideCloseButton ? 0 : 4 }}>
      <Card sx={{ maxWidth: 560, width: '100%', position: 'relative', boxShadow: hideCloseButton ? 'none' : undefined }}>

        {/* Close button — only shown on standalone /about page */}
        {!hideCloseButton && (
          <Tooltip title='Close'>
            <IconButton
              size='small'
              onClick={() => router.back()}
              sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
            >
              <i className='tabler-x text-lg' />
            </IconButton>
          </Tooltip>
        )}

        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, pt: 4, pb: 2 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt='JobMaster logo' width={200} height={200} loading='eager' style={{ width: 200, height: 200, objectFit: 'contain' }} />
          <Typography variant='h5' fontWeight={700}>{APP_INFO.name}</Typography>
          <Typography variant='caption' color='text.secondary'>{APP_INFO.tagline}</Typography>
          <Chip label={`Version ${APP_INFO.version}`} size='small' color='primary' variant='tonal' sx={{ fontWeight: 600 }} />
          <Typography variant='body2' color='text.secondary' align='center' sx={{ px: 2, pt: 1 }}>{APP_INFO.description}</Typography>
        </CardContent>

        <Divider />

        <Box sx={{ pb: 2 }}>
          <InfoRow icon='tabler-user' label='Author' value={APP_INFO.author} />
          <InfoRow icon='tabler-building' label='Company' value={APP_INFO.company} />
          <InfoRow icon='tabler-world' label='Website' value={APP_INFO.website} linkHref={APP_INFO.websiteUrl} />
        </Box>

        <Divider />

        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'center', gap: 3 }}>
          {[
            { icon: 'tabler-shield-check', label: 'Secure' },
            { icon: 'tabler-cloud', label: 'Cloud-native' },
            { icon: 'tabler-device-mobile', label: 'Mobile-ready' },
          ].map(f => (
            <Box key={f.label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <i className={`${f.icon} text-2xl`} style={{ color: 'var(--mui-palette-primary-main)' }} />
              <Typography variant='caption' color='text.secondary'>{f.label}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ p: 2, pt: 0, textAlign: 'center' }}>
          <Typography variant='caption' color='text.disabled'>
            © {new Date().getFullYear()} {APP_INFO.company}. All Rights Reserved.
          </Typography>
        </Box>
      </Card>
    </Box>
  )
}
