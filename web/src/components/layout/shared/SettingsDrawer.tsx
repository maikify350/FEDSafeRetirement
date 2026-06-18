'use client'

import { useState } from 'react'
import Link from 'next/link'

import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Switch from '@mui/material/Switch'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import MenuList from '@mui/material/MenuList'
import Select from '@mui/material/Select'
import Tooltip from '@mui/material/Tooltip'

import { useVoiceExplainerEnabled, useToggleVoiceExplainer } from '@/lib/state/voice-explainer-store'
import { ALPHA, COLORS } from '../../../theme/designTokens'
import { useAuth } from '@/context/AuthContext'


// ─── Types ───────────────────────────────────────────────────────────────────
type Props = {
  open: boolean
  onClose: () => void
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <Typography
      variant='overline'
      sx={{ display: 'block', px: 3, pt: 2, pb: 0.5, color: 'text.secondary', letterSpacing: '0.1em', fontSize: '0.7rem' }}
    >
      {label}
    </Typography>
  )
}

function SettingRow({
  icon, title, subtitle, href, onClick, rightSlot, dark
}: {
  icon: string; title: string; subtitle?: string
  href?: string; onClick?: () => void
  rightSlot?: React.ReactNode
  dark?: boolean
}) {
  const content = (
    <div
      className='flex items-center gap-3 px-4 py-3 transition-colors'
      style={{
        cursor: href || onClick ? 'pointer' : 'default',
        background: dark ? 'var(--mui-palette-common-black)' : undefined,
        color: dark ? COLORS.white : 'inherit',
      }}
    >
      <div
        className='w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0'
        style={{ background: 'var(--mui-palette-primary-main)18' }}
      >
        <i className={`${icon} text-lg`} style={{ color: 'var(--mui-palette-primary-main)' }} />
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-medium leading-tight' style={{ color: dark ? COLORS.white : 'var(--mui-palette-text-primary)' }}>{title}</p>
        {subtitle && (
          <p className='text-xs' style={{ color: dark ? COLORS.separator : 'var(--mui-palette-text-secondary)' }}>{subtitle}</p>
        )}
      </div>
      {rightSlot ?? ((href || onClick) ? (
        <i className='tabler-chevron-right text-base' style={{ color: dark ? COLORS.placeholder : 'var(--mui-palette-text-disabled)' }} />
      ) : null)}
    </div>
  )

  if (href) return <Link href={href} className='block hover:opacity-80' onClick={onClick}>{content}</Link>
  if (onClick) return <button className='w-full text-left hover:opacity-80' onClick={onClick}>{content}</button>
  return content
}

// ─── Main Drawer ─────────────────────────────────────────────────────────────
/**
 * Theme settings drawer for customizing colors, mode, and layout options.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/components/layout/shared/SettingsDrawer.tsx
 */
export default function SettingsDrawer({ open, onClose }: Props) {
  const { user, adminModeEnabled, setAdminModeEnabled } = useAuth()
  const voiceEnabled = useVoiceExplainerEnabled()
  const setVoiceEnabled = useToggleVoiceExplainer()
  const [timezone, setTimezone] = useState('America/New_York')

  const timezones = [
    { value: 'America/New_York',    label: 'Eastern Time (ET)' },
    { value: 'America/Chicago',     label: 'Central Time (CT)' },
    { value: 'America/Denver',      label: 'Mountain Time (MT)' },
    { value: 'America/Phoenix',     label: 'Arizona (MST)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage',   label: 'Alaska (AKT)' },
    { value: 'Pacific/Honolulu',    label: 'Hawaii (HST)' },
  ]

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 320, sm: 380 }, display: 'flex', flexDirection: 'column' } }}
    >
      {/* ── Header ── */}
      <div className='flex items-center gap-2 px-4 py-4' style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
        <IconButton size='small' onClick={onClose}>
          <i className='tabler-x text-xl' />
        </IconButton>
        <Typography variant='h6' fontWeight={600}>Settings</Typography>
      </div>

      {/* ── Scrollable body ── */}
      <div className='flex-1 overflow-y-auto'>

        {/* ══ REWARDS ══ */}
        <SectionLabel label='Rewards' />
        <div className='mx-3 rounded-2xl overflow-hidden mb-1' style={{ border: `1px solid ${COLORS.orange}`, background: ALPHA.warningBgOrange }}>
          <SettingRow icon='tabler-gift' title='Refer a Friend' subtitle='Share and earn rewards' href='/admin/referrals' onClick={onClose} />
          <Divider />
          <SettingRow icon='tabler-message-circle' title='Submit Feedback' subtitle='Share your suggestions and ideas' href='/admin/feedback' onClick={onClose} />
        </div>

        {/* ══ GENERAL ══ */}
        <SectionLabel label='General' />
        <div className='mx-3 rounded-2xl overflow-hidden mb-1' style={{ border: '1px solid var(--mui-palette-divider)', background: 'var(--mui-palette-background-paper)' }}>
          {/* Time Zone */}
          <div className='flex items-center gap-3 px-4 py-2'>
            <div className='w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0' style={{ background: 'var(--mui-palette-primary-main)18' }}>
              <i className='tabler-world text-lg' style={{ color: 'var(--mui-palette-primary-main)' }} />
            </div>
            <div className='flex-1'>
              <p className='text-sm font-medium' style={{ color: 'var(--mui-palette-text-primary)' }}>Time Zone</p>
            </div>
            <Select
              size='small'
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              sx={{ fontSize: '0.75rem', minWidth: 140 }}
            >
              {timezones.map(tz => (
                <MenuItem key={tz.value} value={tz.value} sx={{ fontSize: '0.75rem' }}>{tz.label}</MenuItem>
              ))}
            </Select>
          </div>
        </div>

        {/* ══ VOICE TUTORIALS ══ */}
        <SectionLabel label='Voice Tutorials' />
        <div className='mx-3 rounded-2xl overflow-hidden mb-1' style={{ border: '1px solid var(--mui-palette-divider)', background: 'var(--mui-palette-background-paper)' }}>
          <SettingRow
            icon='tabler-volume'
            title='Enable Voice Explainers'
            subtitle={voiceEnabled ? 'Speaker icon appears on supported pages' : 'Voice tutorials disabled'}
            rightSlot={
              <Switch
                size='small'
                checked={voiceEnabled}
                onChange={e => setVoiceEnabled(e.target.checked)}
                color='primary'
              />
            }
          />
          <Typography variant='caption' sx={{ display: 'block', px: 3, pb: 1.5, color: 'text.secondary' }}>
            When enabled, shake your device on any screen to hear a voice tutorial explaining its features.
          </Typography>
        </div>



        {/* ══ ADMINISTRATION ══ */}
        <SectionLabel label='Administration' />
        <div className='mx-3 rounded-2xl overflow-hidden mb-1' style={{ border: '1px solid var(--mui-palette-divider)', background: 'var(--mui-palette-background-paper)' }}>
          {/* Admin Mode toggle — OWNER only */}
          {(!user?.role || user.role === 'OWNER') && (
            <SettingRow
              icon='tabler-shield-check'
              title='Admin Mode'
              subtitle={adminModeEnabled ? 'Auth guard bypassed (dev mode)' : 'View internal notes & admin features'}
              rightSlot={
                <Switch
                  size='small'
                  checked={adminModeEnabled}
                  onChange={e => setAdminModeEnabled(e.target.checked)}
                  color='primary'
                />
              }
            />
          )}
          <Divider />
          {/* Admin Tables — dark row */}
          <SettingRow
            icon='tabler-table'
            title='Admin Tables'
            subtitle='View subscription tiers, users, and sessions'
            href='/admin/tables'
            onClick={onClose}
            dark
          />
          <Divider />
          <SettingRow icon='tabler-refresh' title='Refresh Lookup Data' subtitle='Reset all dropdowns to latest defaults' onClick={() => {}} />
          <Divider />
          <SettingRow icon='tabler-database' title='Backup & Restore' subtitle='Export and restore your data' href='/admin/backup' onClick={onClose} />
        </div>


      </div>
    </Drawer>
  )
}
