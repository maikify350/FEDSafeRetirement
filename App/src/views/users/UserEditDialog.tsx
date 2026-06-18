'use client'

/**
 * UserEditDialog — Uses EntityEditDialog shell for user management.
 * Includes:
 *  • Profile image uploader (Supabase Storage avatars bucket)
 *  • Rich-text Bio editor (Tiptap WYSIWYG)
 *  • Color swatch picker for agents
 */

import { useState, useEffect, useRef } from 'react'

import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'

import CustomTextField from '@core/components/mui/TextField'
import EntityEditDialog from '@/components/EntityEditDialog'
import RichTextEditor from '@/components/RichTextEditor'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  alternate_phone: string | null
  role: string
  color: string | null
  avatar_url: string | null
  bio: string | null
  bio_short: string | null
  bio_long: string | null
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

// ── Avatar uploader ──────────────────────────────────────────────────────────
function AvatarUploader({
  userId, currentUrl, displayName, color, disabled,
  onUploaded,
}: {
  userId: string; currentUrl: string | null; displayName: string; color: string | null
  disabled: boolean; onUploaded: (url: string) => void
}) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const [preview, setPreview]   = useState<string | null>(currentUrl)
  const [loading, setLoading]   = useState(false)
  const [error,   setError]     = useState('')
  const [hover,   setHover]     = useState(false)

  // Sync when a different user opens
  useEffect(() => { setPreview(currentUrl); setError('') }, [currentUrl])

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Must be an image file'); 

return }

    if (file.size > 5 * 1024 * 1024)   { setError('Max file size is 5 MB'); 

return }

    setError('')
    setLoading(true)

    // Local preview
    const reader = new FileReader()

    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    const fd = new FormData()

    fd.append('file', file)

    try {
      const res  = await fetch(`/api/users/${userId}/avatar`, { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) { setError(data.error || 'Upload failed'); 

return }

      onUploaded(data.avatar_url)
    } catch {
      setError('Network error during upload')
    } finally {
      setLoading(false)
    }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]

    if (f) handleFile(f)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]

    if (f) handleFile(f)
  }

  const initials = displayName.trim()
    ? displayName.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, mb: 2 }}>
      {/* Drop zone / avatar */}
      <Box
        onMouseEnter={() => !disabled && setHover(true)}
        onMouseLeave={() => setHover(false)}
        onDragOver={(e) => { e.preventDefault(); !disabled && setHover(true) }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => { setHover(false); if (!disabled) onDrop(e) }}
        onClick={() => !disabled && !loading && inputRef.current?.click()}
        sx={{
          position: 'relative',
          width: 96, height: 96,
          borderRadius: '50%',
          cursor: disabled ? 'default' : 'pointer',
          flexShrink: 0,
        }}
      >
        <Avatar
          src={preview || undefined}
          sx={{
            width: 96, height: 96, fontSize: 28,
            bgcolor: color || 'primary.main',
            border: '3px solid',
            borderColor: hover ? 'primary.main' : 'divider',
            transition: 'border-color .2s',
          }}
        >
          {!preview && initials}
        </Avatar>

        {/* Hover overlay */}
        {!disabled && (
          <Box sx={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            bgcolor: 'rgba(0,0,0,0.45)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.25,
            opacity: hover ? 1 : 0,
            transition: 'opacity .2s',
          }}>
            {loading
              ? <CircularProgress size={22} sx={{ color: 'white' }} />
              : <>
                  <i className='tabler-camera' style={{ fontSize: 22, color: 'white' }} />
                  <Typography variant='caption' sx={{ color: 'white', fontSize: 10, lineHeight: 1 }}>
                    {preview ? 'Change' : 'Upload'}
                  </Typography>
                </>
            }
          </Box>
        )}
      </Box>

      <input
        ref={inputRef}
        type='file'
        accept='image/jpeg,image/png,image/webp,image/gif'
        style={{ display: 'none' }}
        onChange={onInputChange}
      />

      <Box sx={{ textAlign: 'center' }}>
        <Typography variant='caption' color='text.secondary'>
          Click or drag an image · JPG, PNG, WEBP, GIF · max 5 MB
        </Typography>
        {error && (
          <Typography variant='caption' color='error' sx={{ display: 'block', mt: 0.25 }}>
            {error}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

// ── Main dialog ──────────────────────────────────────────────────────────────
export default function UserEditDialog({ open, onClose, user, onSaved, usedColors = [] }: Props) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', alternate_phone: '',
    role: 'viewer', color: '', bio_short: '', bio_long: '',
  })

  const [tab,     setTab]     = useState(0)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [dirty,   setDirty]   = useState(false)

  // local avatar_url track (separate from form so image upload is instant)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // ── Password change ───────────────────────────────────────────────────────
  const { user: currentUser, isAdmin } = useCurrentUser()
  const isSelf         = !!currentUser && !!user && currentUser.id === user.id
  const canManagePw    = isAdmin || isSelf            // who may set this password
  const requireCurrent = isSelf && !isAdmin           // self-service confirms current pw

  const emptyPw = { current: '', next: '', confirm: '' }
  const [pwForm, setPwForm]       = useState(emptyPw)
  const [pwSaving, setPwSaving]   = useState(false)
  const [pwError, setPwError]     = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const handlePwChange = (field: keyof typeof emptyPw) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPwForm(prev => ({ ...prev, [field]: e.target.value }))
    setPwError(''); setPwSuccess(false)
  }

  const handleChangePassword = async () => {
    if (!user) return

    if (pwForm.next.length < 8)            { setPwError('Password must be at least 8 characters'); 

return }

    if (pwForm.next !== pwForm.confirm)    { setPwError('Passwords do not match'); 

return }

    if (requireCurrent && !pwForm.current) { setPwError('Current password is required'); 

return }

    setPwSaving(true); setPwError('')

    try {
      const res = await fetch(`/api/users/${user.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: pwForm.next,
          ...(requireCurrent ? { currentPassword: pwForm.current } : {}),
        }),
      })

      const data = await res.json()

      if (!res.ok) { setPwError(data.error || 'Failed to change password'); 

return }

      setPwSuccess(true); setPwForm(emptyPw)
    } catch { setPwError('Network error') } finally { setPwSaving(false) }
  }

  useEffect(() => {
    if (user) {
      setForm({
        first_name:      user.first_name ?? '',
        last_name:       user.last_name  ?? '',
        phone:           user.phone      ?? '',
        alternate_phone: user.alternate_phone ?? '',
        role:            user.role       ?? 'viewer',
        color:           user.color      ?? '',
        bio_short:       user.bio_short  ?? '',

        // fall back to the legacy single `bio` if long bio not set yet
        bio_long:        user.bio_long   ?? user.bio ?? '',
      })
      setAvatarUrl(user.avatar_url ?? null)
    }

    setTab(0); setDirty(false); setError('')
    setPwForm(emptyPw); setPwError(''); setPwSuccess(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setDirty(true)
  }

  const handleBioShortChange = (html: string) => {
    setForm(prev => ({ ...prev, bio_short: html }))
    setDirty(true)
  }

  const handleBioLongChange = (html: string) => {
    setForm(prev => ({ ...prev, bio_long: html }))
    setDirty(true)
  }

  const handleColorPick = (hex: string) => {
    setForm(prev => ({ ...prev, color: hex }))
    setDirty(true)
  }

  const handleAvatarUploaded = (url: string) => {
    setAvatarUrl(url)

    // avatar_url is saved immediately by the avatar API — no need to include in form PUT
    onSaved?.()   // refresh the grid so the new photo shows in the row
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

      if (!res.ok) { setError(data.error || 'Failed to save'); 

return }

      setSuccess(true); setDirty(false); onSaved?.()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  // Partners and agents both get a calendar/territory color.
  const isAgent = form.role === 'agent' || form.role === 'partner'
  const displayName = `${form.first_name} ${form.last_name}`.trim() || (user?.email ?? '')

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
      width='55vw' maxWidth={720} height='auto'
    >
      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label='General' icon={<i className='tabler-user' />} iconPosition='start' sx={{ minHeight: 48 }} />
        <Tab label='Bio'     icon={<i className='tabler-file-description' />} iconPosition='start' sx={{ minHeight: 48 }} />
        {canManagePw && (
          <Tab label='Security' icon={<i className='tabler-lock' />} iconPosition='start' sx={{ minHeight: 48 }} />
        )}
      </Tabs>

      {/* ════════════════════ GENERAL TAB ════════════════════════════════ */}
      <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
      {/* ── Profile image ───────────────────────────────────────────────── */}
      <SectionHeader icon='tabler-camera'>Profile Photo</SectionHeader>
      {user && (
        <AvatarUploader
          userId={user.id}
          currentUrl={avatarUrl}
          displayName={displayName}
          color={form.color}
          disabled={saving}
          onUploaded={handleAvatarUploaded}
        />
      )}

      {/* ── Name / contact ──────────────────────────────────────────────── */}
      <SectionHeader icon='tabler-user'>User Profile</SectionHeader>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
        <CustomTextField fullWidth label='First Name' value={form.first_name} onChange={handleChange('first_name')} disabled={saving} autoFocus />
        <CustomTextField fullWidth label='Last Name'  value={form.last_name}  onChange={handleChange('last_name')}  disabled={saving} />
      </div>
      <div className='grid grid-cols-1 gap-4 mb-4'>
        <CustomTextField fullWidth label='Email' value={user?.email ?? ''} disabled InputProps={{ readOnly: true }} />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
        <CustomTextField fullWidth label='Personal Phone#' value={form.phone} onChange={handleChange('phone')} disabled={saving} />
        <CustomTextField fullWidth label='Alternate Phone#' value={form.alternate_phone} onChange={handleChange('alternate_phone')} disabled={saving} />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
        <CustomTextField fullWidth label='Role' value={form.role} onChange={handleChange('role')} disabled={saving} select SelectProps={{ native: true }}>
          <option value='admin'>Admin</option>
          <option value='partner'>Partner</option>
          <option value='agent'>Agent</option>
          <option value='advisor'>Advisor</option>
          <option value='viewer'>Viewer</option>
        </CustomTextField>
      </div>

      {/* ── Agent Color ─────────────────────────────────────────────────── */}
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
                <Tooltip key={hex} title={isTaken ? 'Already assigned to another agent' : hex}>
                  <Box
                    onClick={() => !isTaken && handleColorPick(hex)}
                    sx={{
                      width: 30, height: 30, borderRadius: 1.5,
                      bgcolor: isTaken ? hex + '40' : hex,
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
      </Box>{/* end General tab */}

      {/* ════════════════════ BIO TAB ════════════════════════════════════ */}
      <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
        <SectionHeader icon='tabler-text-caption'>Short Bio</SectionHeader>
        <Typography variant='caption' color='text.secondary' sx={{ mb: 1.5, display: 'block' }}>
          A one or two line summary shown under the partner’s photo on the website.
        </Typography>
        <Box sx={{ mb: 4 }}>
          <RichTextEditor
            value={form.bio_short}
            onChange={handleBioShortChange}
            disabled={saving}
            minimal
            placeholder='Short summary…'
            minHeight={72}
          />
        </Box>

        <SectionHeader icon='tabler-file-description'>Long Bio</SectionHeader>
        <Typography variant='caption' color='text.secondary' sx={{ mb: 1.5, display: 'block' }}>
          The full biography shown when the partner’s photo is clicked.
        </Typography>
        <Box sx={{ mb: 2 }}>
          <RichTextEditor
            value={form.bio_long}
            onChange={handleBioLongChange}
            disabled={saving}
            minimal
            placeholder='Full biography…'
            minHeight={280}
          />
        </Box>
      </Box>{/* end Bio tab */}

      {/* ════════════════════ SECURITY TAB ═══════════════════════════════ */}
      {canManagePw && (
        <Box sx={{ display: tab === 2 ? 'block' : 'none' }}>
          <SectionHeader icon='tabler-lock'>
            {isSelf ? 'Change Your Password' : 'Set Password'}
          </SectionHeader>
          <Typography variant='caption' color='text.secondary' sx={{ mb: 2, display: 'block' }}>
            {isSelf
              ? 'Enter your current password and choose a new one (at least 8 characters).'
              : `As an admin you can set a new password for ${displayName || 'this user'} without their current password. The user must already have portal access.`}
          </Typography>

          {pwError   && <Alert severity='error'   sx={{ mb: 2 }} onClose={() => setPwError('')}>{pwError}</Alert>}
          {pwSuccess && <Alert severity='success' sx={{ mb: 2 }} onClose={() => setPwSuccess(false)}>Password updated successfully.</Alert>}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 420 }}>
            {requireCurrent && (
              <CustomTextField
                fullWidth type='password' label='Current Password'
                autoComplete='current-password'
                value={pwForm.current} onChange={handlePwChange('current')} disabled={pwSaving}
              />
            )}
            <CustomTextField
              fullWidth type='password' label='New Password'
              autoComplete='new-password'
              value={pwForm.next} onChange={handlePwChange('next')} disabled={pwSaving}
              InputProps={{ endAdornment: <InputAdornment position='end'><i className='tabler-key text-textSecondary' /></InputAdornment> }}
            />
            <CustomTextField
              fullWidth type='password' label='Confirm New Password'
              autoComplete='new-password'
              value={pwForm.confirm} onChange={handlePwChange('confirm')} disabled={pwSaving}
            />
            <Box>
              <Button
                variant='contained'
                onClick={handleChangePassword}
                disabled={pwSaving || !pwForm.next || !pwForm.confirm || (requireCurrent && !pwForm.current)}
                startIcon={pwSaving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-lock-check' />}
              >
                {pwSaving ? 'Updating…' : 'Update Password'}
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </EntityEditDialog>
  )
}
