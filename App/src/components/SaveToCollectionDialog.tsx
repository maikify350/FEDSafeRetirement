'use client'

/**
 * SaveToCollectionDialog
 *
 * Lets the user snapshot the current active filters into a collection.
 * - Pick an existing collection  → PUTs filter_criteria to it
 * - Create a new collection      → POSTs with filter_criteria pre-filled
 */

import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'

export interface FilterCriteria {
  state: string
  gender: string
  favorite: boolean
  search: string
  columnFilters: any[]
  sorting: any[]
}

interface Props {
  open: boolean
  onClose: () => void
  filterCriteria: FilterCriteria
  filterSummary: string[]   // array of human-readable filter chips
  totalLeads: number
  collections: { id: string; name: string }[]
  onSaved: (collection: { id: string; name: string; isNew: boolean }) => void
}

export default function SaveToCollectionDialog({
  open,
  onClose,
  filterCriteria,
  filterSummary,
  totalLeads,
  collections,
  onSaved,
}: Props) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [selectedId, setSelectedId] = useState('')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    if (mode === 'existing' && !selectedId) { setError('Please select a collection.'); return }
    if (mode === 'new' && !newName.trim()) { setError('Please enter a collection name.'); return }

    setSaving(true)
    try {
      if (mode === 'existing') {
        const res = await fetch(`/api/collections/${selectedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filter_criteria: filterCriteria }),
        })
        if (!res.ok) throw new Error('Failed to update collection')
        const data = await res.json()
        onSaved({ id: data.id, name: data.name, isNew: false })
      } else {
        const res = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newName.trim(),
            description: newDesc.trim(),
            filter_criteria: filterCriteria,
          }),
        })
        if (!res.ok) throw new Error('Failed to create collection')
        const data = await res.json()
        onSaved({ id: data.id, name: data.name, isNew: true })
      }
      handleClose()
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setMode('existing')
    setSelectedId('')
    setNewName('')
    setNewDesc('')
    setError('')
    onClose()
  }

  const hasFilters = filterSummary.length > 0

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <i className='tabler-bookmark-plus text-2xl text-primary' />
          <div>
            <Typography variant='h6' fontWeight={600}>Save Filters to Collection</Typography>
            <Typography variant='body2' color='text.secondary'>
              Snapshot your current filters so you can reload them later
            </Typography>
          </div>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>

        {/* ── Filter summary ───────────────────────────────────────────────── */}
        <Box sx={{
          p: 1.5, mb: 2, borderRadius: 1.5,
          bgcolor: 'primary.lightOpacity',
          border: '1px solid var(--mui-palette-primary-light)',
        }}>
          <Typography variant='caption' sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'primary.main', display: 'block', mb: 0.75 }}>
            Active Filters
          </Typography>
          {hasFilters ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {filterSummary.map((f, i) => (
                <Chip key={i} label={f} size='small' color='primary' variant='tonal' />
              ))}
            </Box>
          ) : (
            <Typography variant='body2' color='text.secondary' fontStyle='italic'>
              No filters active — all leads will be in scope
            </Typography>
          )}
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.75 }}>
            Matches <strong>{totalLeads.toLocaleString()}</strong> leads
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* ── Mode toggle ──────────────────────────────────────────────────── */}
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => { if (v) setMode(v) }}
          size='small'
          fullWidth
          sx={{ mb: 2 }}
        >
          <ToggleButton value='existing'>
            <i className='tabler-folder-open mr-1.5 text-base' />
            Save to existing
          </ToggleButton>
          <ToggleButton value='new'>
            <i className='tabler-folder-plus mr-1.5 text-base' />
            Create new
          </ToggleButton>
        </ToggleButtonGroup>

        {/* ── Existing collection picker ───────────────────────────────────── */}
        {mode === 'existing' && (
          <FormControl fullWidth size='small'>
            <InputLabel>Collection</InputLabel>
            <Select
              value={selectedId}
              label='Collection'
              onChange={e => setSelectedId(e.target.value)}
            >
              {collections.length === 0 && (
                <MenuItem disabled><em>No collections yet</em></MenuItem>
              )}
              {collections.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* ── New collection form ──────────────────────────────────────────── */}
        {mode === 'new' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label='Collection Name'
              value={newName}
              onChange={e => setNewName(e.target.value)}
              size='small'
              fullWidth
              required
              autoFocus
              placeholder='e.g. TX Postal Workers'
            />
            <TextField
              label='Description (optional)'
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              size='small'
              fullWidth
              multiline
              rows={2}
              placeholder='What is this collection for?'
            />
          </Box>
        )}

        {error && (
          <Typography color='error' variant='caption' sx={{ display: 'block', mt: 1.5 }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button variant='outlined' color='secondary' onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant='contained'
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : <i className='tabler-bookmark-check' />}
        >
          {saving ? 'Saving…' : 'Save Collection'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
