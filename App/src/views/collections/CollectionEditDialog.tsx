'use client'

/**
 * CollectionEditDialog — Uses EntityEditDialog shell for collection CRUD.
 */

import { useState, useEffect } from 'react'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CustomTextField from '@core/components/mui/TextField'
import EntityEditDialog from '@/components/EntityEditDialog'

function filterSummaryChips(fc: any): string[] {
  if (!fc || typeof fc !== 'object') return []
  const chips: string[] = []
  if (fc.state && fc.state !== 'all') chips.push(`State: ${fc.state}`)
  if (fc.gender && fc.gender !== 'all') chips.push(`Gender: ${fc.gender === 'M' ? 'Male' : 'Female'}`)
  if (fc.favorite === true) chips.push('Favorites only')
  if (fc.search?.trim()) chips.push(`Search: "${fc.search.trim()}"`)
  if (Array.isArray(fc.columnFilters)) {
    const opLabel: Record<string, string> = {
      contains: 'contains', notContains: 'not contains',
      startsWith: 'starts with', endsWith: 'ends with',
      equals: 'equals', notEquals: 'not equals',
      isEmpty: 'is empty', isNotEmpty: 'is not empty',
    }
    for (const cf of fc.columnFilters) {
      const conds = cf?.value?.conditions?.filter((c: any) =>
        c.op === 'isEmpty' || c.op === 'isNotEmpty' || c.value?.trim()
      ) ?? []
      for (const cond of conds) {
        const col = cf.id?.replace(/_/g, ' ')
        const label = cond.op === 'isEmpty' || cond.op === 'isNotEmpty'
          ? `${col} ${opLabel[cond.op] ?? cond.op}`
          : `${col} ${opLabel[cond.op] ?? cond.op} "${cond.value}"`
        chips.push(label)
      }
    }
  }
  return chips
}

interface Collection {
  id: string
  name: string
  description: string | null
  status: string
  tags: string[] | null
  filter_criteria: any
  cre_dt: string
  cre_by: string
  mod_by: string
  mod_dt: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  collection: Collection | null  // null = new
  onSaved?: () => void
}

const SectionHeader = ({ icon, children }: { icon: string; children: React.ReactNode }) => (
  <Box className='flex items-center gap-2 mb-4 mt-2'>
    <i className={`${icon} text-xl text-primary`} />
    <Typography variant='h6' fontWeight={700}>{children}</Typography>
  </Box>
)

export default function CollectionEditDialog({ open, onClose, collection, onSaved }: Props) {
  const [form, setForm] = useState({ name: '', description: '', status: 'active', tagsInput: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (collection) {
      setForm({
        name: collection.name ?? '',
        description: collection.description ?? '',
        status: collection.status ?? 'active',
        tagsInput: (collection.tags || []).join(', '),
      })
    } else {
      setForm({ name: '', description: '', status: 'active', tagsInput: '' })
    }
    setDirty(false)
    setError('')
  }, [collection, open])

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setDirty(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      const tags = form.tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      const payload = { name: form.name, description: form.description, status: form.status, tags }
      const url = collection ? `/api/collections/${collection.id}` : '/api/collections'
      const method = collection ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      setSuccess(true); setDirty(false); onSaved?.()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  return (
    <EntityEditDialog
      open={open} onClose={onClose}
      title={collection ? collection.name : 'New Collection'}
      subtitle={collection?.status}
      icon='tabler-folder-plus'
      onSave={handleSave} saving={saving} dirty={dirty}
      error={error} onClearError={() => setError('')}
      showSuccess={success} onClearSuccess={() => setSuccess(false)}
      successMessage='Collection saved!'
      entityId={collection?.id}
      createdAt={collection?.cre_dt}
      createdBy={collection?.cre_by || undefined}
      modifiedAt={collection?.mod_dt || undefined}
      modifiedBy={collection?.mod_by}
      width='45vw' maxWidth={700} height='60vh'
    >
      <SectionHeader icon='tabler-folder'>Collection Details</SectionHeader>
      <div className='grid grid-cols-1 gap-4 mb-4'>
        <CustomTextField fullWidth label='Name' value={form.name} onChange={handleChange('name')} required disabled={saving} autoFocus />
        <CustomTextField fullWidth label='Description' value={form.description} onChange={handleChange('description')} disabled={saving} multiline rows={3} />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
        <CustomTextField fullWidth label='Status' value={form.status} onChange={handleChange('status')} disabled={saving} select SelectProps={{ native: true }}>
          <option value='active'>Active</option>
          <option value='draft'>Draft</option>
          <option value='archived'>Archived</option>
        </CustomTextField>
        <CustomTextField fullWidth label='Tags (comma-separated)' value={form.tagsInput} onChange={handleChange('tagsInput')} disabled={saving} placeholder='e.g. campaign-q1, high-value' />
      </div>

      {/* ── Saved filter criteria (read-only) ─────────────────────── */}
      {collection && (() => {
        const chips = filterSummaryChips(collection.filter_criteria)
        return (
          <>
            <Divider sx={{ my: 2 }} />
            <SectionHeader icon='tabler-filter'>Saved Filters</SectionHeader>
            {chips.length === 0 ? (
              <Typography variant='body2' color='text.secondary' fontStyle='italic'>
                No filters saved yet. Apply filters in Leads and click the bookmark button to save them here.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                {chips.map((chip, i) => (
                  <Chip key={i} label={chip} size='small' color='primary' variant='tonal'
                    sx={{ fontSize: 11, height: 24 }} />
                ))}
              </Box>
            )}
            <Typography variant='caption' color='text.secondary'>
              Applied automatically when this collection is selected in the Leads grid.
              Use the <strong>🔖 bookmark button</strong> in Leads to update these filters.
            </Typography>
          </>
        )
      })()}
    </EntityEditDialog>
  )
}
