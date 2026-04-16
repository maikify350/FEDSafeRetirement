'use client'

/**
 * RateEditDialog — Edit/create/delete FEGLI rate rows.
 * Delete button (red trash can) appears to the left of "Save" for admin users.
 */

import { useState, useEffect } from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CustomTextField from '@core/components/mui/TextField'
import EntityEditDialog from '@/components/EntityEditDialog'
import ConfirmDialog from '@/components/ConfirmDialog'

interface FegliRate {
  id: string
  age_min: number
  age_max: number
  opt_a: number
  opt_b: number
  opt_c: number
  notes: string
  cre_by: string
  cre_dt: string
  mod_by: string
  mod_dt: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  rate: FegliRate | null  // null = new
  onSaved?: () => void
  isAdmin: boolean
}



export default function RateEditDialog({ open, onClose, rate, onSaved, isAdmin }: Props) {
  const [form, setForm] = useState({
    age_min: 0,
    age_max: 0,
    opt_a: 0,
    opt_b: 0,
    opt_c: 0,
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (rate) {
      setForm({
        age_min: rate.age_min,
        age_max: rate.age_max,
        opt_a: rate.opt_a,
        opt_b: rate.opt_b,
        opt_c: rate.opt_c,
        notes: rate.notes ?? '',
      })
    } else {
      setForm({ age_min: 0, age_max: 0, opt_a: 0, opt_b: 0, opt_c: 0, notes: '' })
    }
    setDirty(false)
    setError('')
  }, [rate, open])

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = field === 'notes' ? e.target.value : (parseFloat(e.target.value) || 0)
    setForm(prev => ({ ...prev, [field]: val }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const url = rate ? `/api/fegli-rates/${rate.id}` : '/api/fegli-rates'
      const method = rate ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      setSuccess(true); setDirty(false); onSaved?.()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!rate) return
    setDeleting(true); setError('')
    try {
      const res = await fetch(`/api/fegli-rates/${rate.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete'); return
      }
      setConfirmDelete(false)
      onSaved?.()
      onClose()
    } catch { setError('Network error') } finally { setDeleting(false) }
  }

  return (
    <>
      <EntityEditDialog
        open={open} onClose={onClose}
        title={rate ? `Edit Rate: Age ${rate.age_min}–${rate.age_max}` : 'New FEGLI Rate'}
        subtitle={rate ? `Age ${rate.age_min}–${rate.age_max}` : 'New'}
        icon='tabler-heart-rate-monitor'
        onSave={handleSave} saving={saving || deleting} dirty={dirty}
        error={error} onClearError={() => setError('')}
        showSuccess={success} onClearSuccess={() => setSuccess(false)}
        successMessage='Rate saved!'
        entityId={rate?.id}
        createdAt={rate?.cre_dt}
        createdBy={rate?.cre_by || undefined}
        modifiedAt={rate?.mod_dt || undefined}
        modifiedBy={rate?.mod_by}
        width='45vw' maxWidth={600} height='58vh'
      >

        <div className='grid grid-cols-2 gap-3 mb-2'>
          <CustomTextField
            fullWidth label='Age Min' type='number' value={form.age_min}
            onChange={handleChange('age_min')} disabled={saving || !isAdmin}
            inputProps={{ min: 0, max: 120 }}
          />
          <CustomTextField
            fullWidth label='Age Max' type='number' value={form.age_max}
            onChange={handleChange('age_max')} disabled={saving || !isAdmin}
            inputProps={{ min: 0, max: 120 }}
          />
        </div>
        <div className='grid grid-cols-3 gap-3 mb-2'>
          <CustomTextField
            fullWidth label='Option-A' type='number' value={form.opt_a}
            onChange={handleChange('opt_a')} disabled={saving || !isAdmin}
            inputProps={{ step: 0.001, min: 0 }}
            sx={{ '& input': { textAlign: 'right' } }}
          />
          <CustomTextField
            fullWidth label='Option-B' type='number' value={form.opt_b}
            onChange={handleChange('opt_b')} disabled={saving || !isAdmin}
            inputProps={{ step: 0.001, min: 0 }}
            sx={{ '& input': { textAlign: 'right' } }}
          />
          <CustomTextField
            fullWidth label='Option-C' type='number' value={form.opt_c}
            onChange={handleChange('opt_c')} disabled={saving || !isAdmin}
            inputProps={{ step: 0.001, min: 0 }}
            sx={{ '& input': { textAlign: 'right' } }}
          />
        </div>

        <div className='grid grid-cols-1 gap-3 mb-2'>
          <CustomTextField
            fullWidth label='Notes' value={form.notes}
            onChange={handleChange('notes')} disabled={saving || !isAdmin}
            multiline rows={3} placeholder='Optional notes or comments...'
          />
        </div>

        {/* Delete button — admin only, existing records only */}
        {isAdmin && rate && (
          <Box sx={{ mt: 1, pt: 2, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant='outlined'
              color='error'
              startIcon={<i className='tabler-trash' />}
              onClick={() => setConfirmDelete(true)}
              disabled={saving || deleting}
              sx={{ borderRadius: '8px' }}
            >
              Delete Rate
            </Button>
            <Typography variant='caption' color='text.secondary'>
              This action cannot be undone.
            </Typography>
          </Box>
        )}
      </EntityEditDialog>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title='Delete FEGLI Rate'
        message={`Are you sure you want to delete the rate for ages ${rate?.age_min}–${rate?.age_max}? This cannot be undone.`}
        confirmLabel='Delete'
        confirmColor='error'
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
