'use client'

/**
 * AddUserDialog — minimal "create user record" form.
 *
 * Creates a user RECORD only (no portal login). Not every user needs portal
 * access; granting access (Invite) is a separate action on the edit screen.
 */

import { useState, useEffect } from 'react'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

import CustomTextField from '@core/components/mui/TextField'

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

const EMPTY = { first_name: '', last_name: '', email: '', phone: '', alternate_phone: '', role: 'viewer' }

export default function AddUserDialog({ open, onClose, onCreated }: Props) {
  const [form, setForm]     = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (open) { setForm({ ...EMPTY }); setError('') }
  }, [open])

  const change = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleCreate = async () => {
    const email = form.email.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('A valid email is required'); 

return }

    setSaving(true); setError('')

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, email }),
      })

      const data = await res.json()

      if (!res.ok) { setError(data.error || 'Failed to create user'); 

return }

      onCreated?.()
      onClose()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <i className='tabler-user-plus' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
        Add User
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ mt: 1 }} className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <CustomTextField fullWidth label='First Name' value={form.first_name} onChange={change('first_name')} disabled={saving} autoFocus />
          <CustomTextField fullWidth label='Last Name'  value={form.last_name}  onChange={change('last_name')}  disabled={saving} />
        </Box>
        <Box sx={{ mt: 2 }}>
          <CustomTextField fullWidth label='Email' type='email' value={form.email} onChange={change('email')} disabled={saving} placeholder='name@fedsaferetirement.com' />
        </Box>
        <Box sx={{ mt: 2 }} className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <CustomTextField fullWidth label='Personal Phone#' value={form.phone} onChange={change('phone')} disabled={saving} />
          <CustomTextField fullWidth label='Alternate Phone#' value={form.alternate_phone} onChange={change('alternate_phone')} disabled={saving} />
        </Box>
        <Box sx={{ mt: 2 }}>
          <CustomTextField fullWidth label='Role' value={form.role} onChange={change('role')} disabled={saving} select SelectProps={{ native: true }}>
            <option value='admin'>Admin</option>
            <option value='partner'>Partner</option>
            <option value='agent'>Agent</option>
            <option value='advisor'>Advisor</option>
            <option value='viewer'>Viewer</option>
          </CustomTextField>
        </Box>
        <Alert severity='info' variant='outlined' sx={{ mt: 3 }}>
          This creates a user record only. Portal login access can be granted later via Invite on the user’s edit screen.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant='contained'
          onClick={handleCreate}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-plus' />}
        >
          {saving ? 'Creating…' : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
