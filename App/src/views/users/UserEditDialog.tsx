'use client'

/**
 * UserEditDialog — Uses EntityEditDialog shell for user management.
 * Includes color swatch picker for agents.
 */

import { useState, useEffect } from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import CustomTextField from '@core/components/mui/TextField'
import EntityEditDialog from '@/components/EntityEditDialog'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: string
  color: string | null
  avatar_url: string | null
  cre_dt: string
  mod_by: string
  mod_dt: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  user: User | null
  onSaved?: () => void
  usedColors?: string[]   // colors already assigned to OTHER agents
}

const SectionHeader = ({ icon, children }: { icon: string; children: React.ReactNode }) => (
  <Box className='flex items-center gap-2 mb-4 mt-2'>
    <i className={`${icon} text-xl text-primary`} />
    <Typography variant='h6' fontWeight={700}>{children}</Typography>
  </Box>
)

// Preset palette of 16 distinct, attractive colors
const COLOR_PRESETS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f97316','#f59e0b','#84cc16','#10b981',
  '#0ea5e9','#06b6d4','#14b8a6','#3b82f6',
  '#a78bfa','#fb7185','#34d399','#fbbf24',
]

export default function UserEditDialog({ open, onClose, user, onSaved, usedColors = [] }: Props) {
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', role: 'viewer', color: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name ?? '',
        last_name:  user.last_name  ?? '',
        phone:      user.phone      ?? '',
        role:       user.role       ?? 'viewer',
        color:      user.color      ?? '',
      })
    }
    setDirty(false); setError('')
  }, [user])

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setDirty(true)
  }

  const handleColorPick = (hex: string) => {
    setForm(prev => ({ ...prev, color: hex }))
    setDirty(true)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      setSuccess(true); setDirty(false); onSaved?.()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  const isAgent = form.role === 'agent'

  return (
    <EntityEditDialog
      open={open} onClose={onClose}
      title={user ? `${user.first_name} ${user.last_name}`.trim() || user.email : 'Edit User'}
      subtitle={user?.role}
      icon='tabler-user-cog'
      onSave={handleSave} saving={saving} dirty={dirty}
      error={error} onClearError={() => setError('')}
      showSuccess={success} onClearSuccess={() => setSuccess(false)}
      successMessage='User updated!'
      entityId={user?.id}
      createdAt={user?.cre_dt}
      createdBy={user?.mod_by || undefined}
      modifiedAt={user?.mod_dt || undefined}
      modifiedBy={user?.mod_by}
      width='40vw' maxWidth={600} height='auto'
    >
      <SectionHeader icon='tabler-user'>User Profile</SectionHeader>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
        <CustomTextField fullWidth label='First Name' value={form.first_name} onChange={handleChange('first_name')} disabled={saving} autoFocus />
        <CustomTextField fullWidth label='Last Name'  value={form.last_name}  onChange={handleChange('last_name')}  disabled={saving} />
      </div>
      <div className='grid grid-cols-1 gap-4 mb-4'>
        <CustomTextField fullWidth label='Email' value={user?.email ?? ''} disabled InputProps={{ readOnly: true }} />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
        <CustomTextField fullWidth label='Phone' value={form.phone} onChange={handleChange('phone')} disabled={saving} />
        <CustomTextField fullWidth label='Role' value={form.role} onChange={handleChange('role')} disabled={saving} select SelectProps={{ native: true }}>
          <option value='admin'>Admin</option>
          <option value='agent'>Agent</option>
          <option value='advisor'>Advisor</option>
          <option value='viewer'>Viewer</option>
        </CustomTextField>
      </div>

      {/* Color swatch — shown for agents */}
      {isAgent && (
        <Box sx={{ mt: 1, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <i className='tabler-palette text-xl text-primary' />
            <Typography variant='h6' fontWeight={700}>Agent Color</Typography>
            {form.color && (
              <Box sx={{
                width: 22, height: 22, borderRadius: '50%',
                bgcolor: form.color, border: '2px solid white',
                boxShadow: `0 0 0 2px ${form.color}`, ml: 1,
              }} />
            )}
          </Box>
          <Typography variant='caption' color='text.secondary' sx={{ mb: 1.5, display: 'block' }}>
            This color is used for calendar event display and territory maps.
          </Typography>

          {/* Preset swatches */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {COLOR_PRESETS.map(hex => {
              const isCurrent = form.color === hex
              const isTaken   = !isCurrent && usedColors.map(c => c.toLowerCase()).includes(hex.toLowerCase())
              return (
                <Tooltip
                  key={hex}
                  title={isTaken ? 'Already assigned to another agent' : hex}
                >
                  <Box
                    onClick={() => !isTaken && handleColorPick(hex)}
                    sx={{
                      width: 30, height: 30, borderRadius: 1.5,
                      bgcolor: isTaken ? hex + '40' : hex,   // faded if taken
                      cursor: isTaken ? 'not-allowed' : 'pointer',
                      border: isCurrent ? '3px solid white' : '2px solid transparent',
                      boxShadow: isCurrent
                        ? `0 0 0 2px ${hex}, 0 2px 8px ${hex}80`
                        : isTaken ? 'none' : '0 1px 3px rgba(0,0,0,.2)',
                      transition: 'transform .1s, box-shadow .1s',
                      '&:hover': !isTaken ? { transform: 'scale(1.18)' } : {},
                      position: 'relative', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {isTaken && (
                      <i className='tabler-lock' style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', position: 'absolute' }} />
                    )}
                  </Box>
                </Tooltip>
              )
            })}
          </Box>

          {/* Custom hex input + native color picker */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component='input'
              type='color'
              value={form.color || '#6366f1'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleColorPick(e.target.value)}
              title='Pick custom color'
              sx={{
                width: 42, height: 42, border: 'none', cursor: 'pointer',
                borderRadius: 1, padding: 0, background: 'none',
                '&::-webkit-color-swatch-wrapper': { padding: 0 },
                '&::-webkit-color-swatch': { border: 'none', borderRadius: '6px' },
              }}
            />
            <CustomTextField
              label='Custom hex'
              value={form.color}
              onChange={handleChange('color')}
              placeholder='#6366f1'
              size='small'
              sx={{ maxWidth: 140 }}
              disabled={saving}
            />
            {form.color && (
              <Box
                onClick={() => handleColorPick('')}
                sx={{ cursor: 'pointer', opacity: 0.5, '&:hover': { opacity: 1 }, fontSize: 13, display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <i className='tabler-x' style={{ fontSize: 14 }} /> Clear
              </Box>
            )}
          </Box>
        </Box>
      )}
    </EntityEditDialog>
  )
}
