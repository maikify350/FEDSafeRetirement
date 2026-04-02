'use client'

/**
 * ExportFieldPickerDialog — Reusable dialog for selecting and ordering fields before CSV/JSON export.
 *
 * Features:
 *   • Checkbox to include/exclude each field
 *   • Drag-to-reorder fields (priority top-to-bottom)
 *   • Persists selections per storageKey to localStorage
 *   • Select All / Deselect All
 *   • Export format selector (CSV, JSON)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'

export interface ExportField {
  key: string      // field accessor key (e.g. 'first_name')
  label: string    // display label (e.g. 'First Name')
}

interface ExportFieldPickerDialogProps {
  open: boolean
  onClose: () => void
  storageKey: string               // e.g. 'fs-leads' — persists under this key
  availableFields: ExportField[]   // all possible fields
  rows: any[]                      // data rows to export
  onExport: (rows: any[], selectedFieldKeys: string[], format: 'csv' | 'json') => void
}

const STORAGE_PREFIX = 'export-fields-'

export default function ExportFieldPickerDialog({
  open,
  onClose,
  storageKey,
  availableFields,
  rows,
  onExport,
}: ExportFieldPickerDialogProps) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [orderedFields, setOrderedFields] = useState<ExportField[]>([])
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const dragIdx = useRef<number | null>(null)

  // Load persisted selections or default to all selected
  useEffect(() => {
    if (!open) return
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { keys: string[]; order: string[] }
        // Merge: keep stored order but add new fields at the end
        const storedOrder = parsed.order || []
        const allKeys = availableFields.map(f => f.key)
        const ordered = storedOrder.filter((k: string) => allKeys.includes(k))
        const newKeys = allKeys.filter(k => !ordered.includes(k))
        const fullOrder = [...ordered, ...newKeys]
        setOrderedFields(fullOrder.map(k => availableFields.find(f => f.key === k)!).filter(Boolean))
        setSelectedKeys(parsed.keys?.length ? parsed.keys.filter((k: string) => allKeys.includes(k)) : allKeys)
      } catch {
        resetToDefaults()
      }
    } else {
      resetToDefaults()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, storageKey])

  const resetToDefaults = () => {
    setOrderedFields([...availableFields])
    setSelectedKeys(availableFields.map(f => f.key))
  }

  // Persist on change
  const persist = useCallback((keys: string[], order: ExportField[]) => {
    localStorage.setItem(
      `${STORAGE_PREFIX}${storageKey}`,
      JSON.stringify({ keys, order: order.map(f => f.key) })
    )
  }, [storageKey])

  const toggleField = (key: string) => {
    setSelectedKeys(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      persist(next, orderedFields)
      return next
    })
  }

  const selectAll = () => {
    const all = orderedFields.map(f => f.key)
    setSelectedKeys(all)
    persist(all, orderedFields)
  }

  const deselectAll = () => {
    setSelectedKeys([])
    persist([], orderedFields)
  }

  const handleDragStart = (idx: number) => { dragIdx.current = idx }
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  const handleDrop = (toIdx: number) => {
    const fromIdx = dragIdx.current
    if (fromIdx === null || fromIdx === toIdx) return
    setOrderedFields(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      persist(selectedKeys, next)
      return next
    })
    dragIdx.current = null
  }

  const handleExport = () => {
    // Build ordered selected keys
    const exportKeys = orderedFields.filter(f => selectedKeys.includes(f.key)).map(f => f.key)
    if (exportKeys.length === 0) return
    onExport(rows, exportKeys, format)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'primary.lighter', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className='tabler-columns-3 text-xl' style={{ color: 'var(--mui-palette-primary-main)' }} />
        </Box>
        <Box>
          <Typography variant='h6' fontWeight={700}>Export Fields</Typography>
          <Typography variant='caption' color='text.secondary'>
            {rows.length} {rows.length === 1 ? 'record' : 'records'} • Drag to reorder
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Quick actions */}
        <Box className='flex items-center gap-2 mb-3'>
          <Chip label='Select All' size='small' variant='outlined' onClick={selectAll} />
          <Chip label='Deselect All' size='small' variant='outlined' onClick={deselectAll} />
          <Box sx={{ flex: 1 }} />
          <Chip
            label='CSV' size='small'
            variant={format === 'csv' ? 'filled' : 'outlined'}
            color={format === 'csv' ? 'primary' : 'default'}
            onClick={() => setFormat('csv')}
            icon={<i className='tabler-file-type-csv' />}
          />
          <Chip
            label='JSON' size='small'
            variant={format === 'json' ? 'filled' : 'outlined'}
            color={format === 'json' ? 'primary' : 'default'}
            onClick={() => setFormat('json')}
            icon={<i className='tabler-braces' />}
          />
        </Box>

        <Divider sx={{ mb: 1 }} />

        {/* Field list */}
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {orderedFields.map((field, idx) => (
            <Box
              key={field.key}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(idx)}
              sx={{
                display: 'flex', alignItems: 'center', py: 0.5, px: 1,
                cursor: 'grab', userSelect: 'none',
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
                opacity: selectedKeys.includes(field.key) ? 1 : 0.5,
              }}
            >
              <i className='tabler-grip-vertical text-textDisabled text-base mr-1' style={{ cursor: 'grab', flexShrink: 0 }} />
              <Typography variant='caption' color='text.secondary' sx={{ width: 24, textAlign: 'center', mr: 0.5, fontWeight: 600 }}>
                {selectedKeys.includes(field.key) ? orderedFields.filter(f => selectedKeys.includes(f.key)).indexOf(field) + 1 : ''}
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    size='small'
                    checked={selectedKeys.includes(field.key)}
                    onChange={() => toggleField(field.key)}
                  />
                }
                label={<Typography variant='body2'>{field.label}</Typography>}
                sx={{ flex: 1, m: 0 }}
              />
            </Box>
          ))}
        </Box>

        <Divider sx={{ mt: 1 }} />
        <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
          {selectedKeys.length} of {orderedFields.length} fields selected • Preferences are saved automatically
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant='outlined' onClick={onClose} sx={{ borderRadius: '8px' }}>
          Cancel
        </Button>
        <Button
          variant='contained'
          onClick={handleExport}
          disabled={selectedKeys.length === 0}
          startIcon={<i className='tabler-download' />}
          sx={{ borderRadius: '8px', minWidth: 120 }}
        >
          Export {format.toUpperCase()}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
