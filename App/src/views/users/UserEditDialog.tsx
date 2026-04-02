'use client'

/**
 * UserEditDialog — Uses EntityEditDialog shell for user management.
 */

import { useState, useEffect } from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import CustomTextField from '@core/components/mui/TextField'
import EntityEditDialog from '@/components/EntityEditDialog'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: string
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
}

const SectionHeader = ({ icon, children }: { icon: string; children: React.ReactNode }) => (
  <Box className='flex items-center gap-2 mb-4 mt-2'>
    <i className={`${icon} text-xl text-primary`} />
    <Typography variant='h6' fontWeight={700}>{children}</Typography>
  </Box>
)

export default function UserEditDialog({ open, onClose, user, onSaved }: Props) {
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', role: 'viewer' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        phone: user.phone ?? '',
        role: user.role ?? 'viewer',
      })
    }
    setDirty(false); setError('')
  }, [user])

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
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
      width='40vw' maxWidth={600} height='50vh'
    >
      <SectionHeader icon='tabler-user'>User Profile</SectionHeader>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
        <CustomTextField fullWidth label='First Name' value={form.first_name} onChange={handleChange('first_name')} disabled={saving} autoFocus />
        <CustomTextField fullWidth label='Last Name' value={form.last_name} onChange={handleChange('last_name')} disabled={saving} />
      </div>
      <div className='grid grid-cols-1 gap-4 mb-4'>
        <CustomTextField fullWidth label='Email' value={user?.email ?? ''} disabled InputProps={{ readOnly: true }} />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
        <CustomTextField fullWidth label='Phone' value={form.phone} onChange={handleChange('phone')} disabled={saving} />
        <CustomTextField fullWidth label='Role' value={form.role} onChange={handleChange('role')} disabled={saving} select SelectProps={{ native: true }}>
          <option value='admin'>Admin</option>
          <option value='advisor'>Advisor</option>
          <option value='viewer'>Viewer</option>
        </CustomTextField>
      </div>
    </EntityEditDialog>
  )
}
