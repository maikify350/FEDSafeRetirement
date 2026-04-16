'use client'

/**
 * BracketEditDialog — Edit/create/delete IRS tax bracket rows.
 * Delete button (red trash can) appears to the left of "Save" for admin users.
 */

import { useState, useEffect } from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CustomTextField from '@core/components/mui/TextField'
import EntityEditDialog from '@/components/EntityEditDialog'
import ConfirmDialog from '@/components/ConfirmDialog'

interface IrsBracket {
  id: string
  filing_status: string
  floor: number
  ceiling: number
  base_tax: number
  marginal_rate: number
  notes: string
  cre_by: string
  cre_dt: string
  mod_by: string
  mod_dt: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  bracket: IrsBracket | null  // null = new
  onSaved?: () => void
  isAdmin: boolean
}

export default function BracketEditDialog({ open, onClose, bracket, onSaved, isAdmin }: Props) {
  const [form, setForm] = useState({
    filing_status: 'Single',
    floor: 0,
    ceiling: 0,
    base_tax: 0,
    marginal_rate: 0,
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (bracket) {
      setForm({
        filing_status: bracket.filing_status,
        floor: bracket.floor,
        ceiling: bracket.ceiling,
        base_tax: bracket.base_tax,
        marginal_rate: bracket.marginal_rate,
        notes: bracket.notes ?? '',
      })
    } else {
      setForm({ filing_status: 'Single', floor: 0, ceiling: 0, base_tax: 0, marginal_rate: 0, notes: '' })
    }
    setDirty(false)
    setError('')
  }, [bracket, open])

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = (field === 'filing_status' || field === 'notes') ? e.target.value : (parseFloat(e.target.value) || 0)
    setForm(prev => ({ ...prev, [field]: val }))
    setDirty(true)
  }

  const handleSave = async () => {
    if (!form.filing_status.trim()) { setError('Filing status is required'); return }
    setSaving(true); setError('')
    try {
      const url = bracket ? `/api/irs-brackets/${bracket.id}` : '/api/irs-brackets'
      const method = bracket ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      setSuccess(true); setDirty(false); onSaved?.()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!bracket) return
    setDeleting(true); setError('')
    try {
      const res = await fetch(`/api/irs-brackets/${bracket.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete'); return
      }
      setConfirmDelete(false)
      onSaved?.()
      onClose()
    } catch { setError('Network error') } finally { setDeleting(false) }
  }

  const formatCurrency = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return (
    <>
      <EntityEditDialog
        open={open} onClose={onClose}
        title={bracket ? `Edit Bracket: ${bracket.filing_status}` : 'New Tax Bracket'}
        subtitle={bracket ? `${bracket.filing_status} · ${formatCurrency(bracket.floor)}–${formatCurrency(bracket.ceiling)}` : 'New'}
        icon='tabler-receipt-tax'
        onSave={handleSave} saving={saving || deleting} dirty={dirty}
        error={error} onClearError={() => setError('')}
        showSuccess={success} onClearSuccess={() => setSuccess(false)}
        successMessage='Bracket saved!'
        entityId={bracket?.id}
        createdAt={bracket?.cre_dt}
        createdBy={bracket?.cre_by || undefined}
        modifiedAt={bracket?.mod_dt || undefined}
        modifiedBy={bracket?.mod_by}
        width='45vw' maxWidth={600} height='68vh'
      >

        <div className='grid grid-cols-1 gap-3 mb-2'>
          <CustomTextField
            fullWidth label='Filing Status' value={form.filing_status}
            onChange={handleChange('filing_status')} disabled={saving || !isAdmin}
            select SelectProps={{ native: true }}
          >
            <option value='Single'>Single</option>
            <option value='Married'>Married</option>
          </CustomTextField>
        </div>
        <div className='grid grid-cols-2 gap-3 mb-2'>
          <CustomTextField
            fullWidth label='Income Floor ($)' type='number' value={form.floor}
            onChange={handleChange('floor')} disabled={saving || !isAdmin}
            inputProps={{ min: 0, step: 1 }}
            sx={{ '& input': { textAlign: 'right' } }}
          />
          <CustomTextField
            fullWidth label='Income Ceiling ($)' type='number' value={form.ceiling}
            onChange={handleChange('ceiling')} disabled={saving || !isAdmin}
            inputProps={{ min: 0, step: 1 }}
            sx={{ '& input': { textAlign: 'right' } }}
          />
        </div>
        <div className='grid grid-cols-2 gap-3 mb-2'>
          <CustomTextField
            fullWidth label='Base Tax Rate' type='number' value={form.base_tax}
            onChange={handleChange('base_tax')} disabled={saving || !isAdmin}
            inputProps={{ step: 0.001, min: 0, max: 1 }}
            helperText='e.g. 0.22 = 22%'
            sx={{ '& input': { textAlign: 'right' } }}
          />
          <CustomTextField
            fullWidth label='Marginal Rate' type='number' value={form.marginal_rate}
            onChange={handleChange('marginal_rate')} disabled={saving || !isAdmin}
            inputProps={{ step: 0.001, min: 0, max: 1 }}
            helperText='e.g. 0.138 = 13.8%'
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
        {isAdmin && bracket && (
          <Box sx={{ mt: 1, pt: 2, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant='outlined'
              color='error'
              startIcon={<i className='tabler-trash' />}
              onClick={() => setConfirmDelete(true)}
              disabled={saving || deleting}
              sx={{ borderRadius: '8px' }}
            >
              Delete Bracket
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
        title='Delete Tax Bracket'
        message={`Are you sure you want to delete the ${bracket?.filing_status} bracket for ${formatCurrency(bracket?.floor ?? 0)}–${formatCurrency(bracket?.ceiling ?? 0)}? This cannot be undone.`}
        confirmLabel='Delete'
        confirmColor='error'
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
