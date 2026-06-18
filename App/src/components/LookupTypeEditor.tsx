'use client'

/**
 * LookupTypeEditor — Generic, reusable lookup list editor.
 * Adapted from /web's LookupTypeEditor to use plain fetch() instead of react-query + api helper.
 * Features: drag-to-reorder, inline edit, add, delete with confirm, toggle active/default.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import { useTheme } from '@mui/material/styles'

// ─── Types ───────────────────────────────────────────────────────────────────
export interface LookupItem {
  id: string
  type: string
  value: string
  label: string
  sort_order: number
  is_default: boolean
  is_pinned: boolean
  is_active: boolean
  abbreviation?: string | null
  hex?: string | null
  rgb?: string | null
}

interface LookupTypeEditorProps {
  lookupType: string
  title: string
  toggleable?: boolean
  hasAbbreviation?: boolean
  readOnly?: boolean
  reservedValues?: string[]
}

// ─── Delete confirm dialog ────────────────────────────────────────────────────
function DeleteConfirmDialog({
  item,
  open,
  onConfirm,
  onCancel,
}: {
  item: LookupItem | null
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth='xs' fullWidth>
      <DialogTitle>Delete Item</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete <strong>&ldquo;{item?.value}&rdquo;</strong>? This cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color='inherit'>Cancel</Button>
        <Button onClick={onConfirm} color='error' variant='contained'>Delete</Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Sortable row ─────────────────────────────────────────────────────────────
function SortableRow({
  item,
  toggleable,
  hasAbbreviation,
  readOnly,
  reserved,
  onUpdate,
  onToggleActive,
  onToggleDefault,
  onRequestDelete,
}: {
  item: LookupItem
  toggleable: boolean
  hasAbbreviation: boolean
  readOnly: boolean
  reserved: boolean
  onUpdate: (id: string, patch: Partial<LookupItem>) => void
  onToggleActive: (id: string, val: boolean) => void
  onToggleDefault: (id: string, val: boolean) => void
  onRequestDelete: (item: LookupItem) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })
  const theme = useTheme()
  const [editing, setEditing] = useState(false)
  const [draftValue, setDraftValue] = useState(item.value)
  const [draftLabel, setDraftLabel] = useState(item.label)
  const [draftAbbr, setDraftAbbr] = useState(item.abbreviation ?? '')

  useEffect(() => {
    if (!editing) {
      setDraftValue(item.value)
      setDraftLabel(item.label)
      setDraftAbbr(item.abbreviation ?? '')
    }
  }, [item, editing])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? theme.palette.action.hover : theme.palette.background.paper,
    zIndex: isDragging ? 999 : 'auto' as any,
  }

  const handleEdit = () => {
    setDraftValue(item.value)
    setDraftLabel(item.label)
    setDraftAbbr(item.abbreviation ?? '')
    setEditing(true)
  }

  const handleSave = () => {
    if (!draftValue.trim()) return
    if (hasAbbreviation && draftAbbr.trim().length !== 2) return
    const patch: Partial<LookupItem> = {
      value: draftValue.trim(),
      label: draftLabel.trim() || draftValue.trim(),
    }
    if (hasAbbreviation) patch.abbreviation = draftAbbr.toUpperCase()
    onUpdate(item.id, patch)
    setEditing(false)
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        borderBottom: `1px solid ${theme.palette.divider}`,
        '&:last-child': { borderBottom: 'none' },
        bgcolor: editing ? 'action.hover' : 'background.paper',
      }}
    >
      {!editing && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5 }}>
          {!readOnly && (
            <Tooltip title='Drag to reorder'>
              <Box
                {...attributes}
                {...listeners}
                sx={{ cursor: 'grab', color: 'text.disabled', display: 'flex', alignItems: 'center', flexShrink: 0, '&:active': { cursor: 'grabbing' } }}
              >
                <i className='tabler-grip-vertical text-xl' />
              </Box>
            </Tooltip>
          )}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {hasAbbreviation && item.abbreviation ? (
                <>
                  <Chip
                    label={item.abbreviation}
                    size='small'
                    color='primary'
                    sx={{ fontSize: '0.7rem', height: 22, fontFamily: 'monospace', fontWeight: 700, minWidth: 36 }}
                  />
                  <Typography
                    variant='body2'
                    fontWeight={500}
                    sx={{
                      opacity: item.is_active ? 1 : 0.4,
                      flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label !== item.value ? item.label : item.value}
                  </Typography>
                </>
              ) : (
                <Typography
                  variant='body2'
                  fontWeight={500}
                  sx={{
                    opacity: item.is_active ? 1 : 0.4,
                    flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {item.value}
                </Typography>
              )}
            </Box>
            {!hasAbbreviation && item.label !== item.value && (
              <Typography variant='caption' color='text.disabled' noWrap>{item.label}</Typography>
            )}
          </Box>

          {item.is_default && (
            <Chip label='Default' size='small' color='primary' variant='tonal' sx={{ fontSize: '0.65rem', height: 20 }} />
          )}

          {!readOnly && (
            <>
              {toggleable && (
                <Tooltip title={item.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}>
                  <Switch
                    size='small'
                    checked={item.is_active !== false}
                    onChange={e => onToggleActive(item.id, e.target.checked)}
                    color='primary'
                  />
                </Tooltip>
              )}

              {reserved && (
                <Tooltip title='System reserved — cannot be edited or deleted'>
                  <Chip label='Reserved' size='small' color='warning' variant='tonal' sx={{ fontSize: '0.6rem', height: 20 }} />
                </Tooltip>
              )}

              {!reserved && (
                <Tooltip title='Edit'>
                  <IconButton size='small' onClick={handleEdit} sx={{ color: 'text.secondary' }}>
                    <i className='tabler-pencil text-sm' />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title={item.is_default ? 'Remove as default' : 'Set as default'}>
                <IconButton
                  size='small'
                  onClick={() => onToggleDefault(item.id, !item.is_default)}
                  sx={{ color: item.is_default ? 'primary.main' : 'action.disabled' }}
                >
                  <i className={item.is_default ? 'tabler-star-filled text-sm' : 'tabler-star text-sm'} />
                </IconButton>
              </Tooltip>

              {!reserved && (
                <Tooltip title='Delete'>
                  <IconButton
                    size='small'
                    onClick={() => onRequestDelete(item)}
                    sx={{ color: 'error.main', '&:hover': { bgcolor: 'error.lightOpacity' } }}
                  >
                    <i className='tabler-trash text-sm' />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
        </Box>
      )}

      {editing && (
        <Box sx={{ px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {hasAbbreviation && (
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'primary.lightOpacity', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant='caption' color='text.secondary'>Current abbreviation:</Typography>
              <Typography variant='body2' fontWeight={700} color='primary.main' fontFamily='monospace'>
                {draftAbbr || '—'}
              </Typography>
            </Box>
          )}
          <TextField
            size='small' label='Display value' value={draftValue}
            onChange={e => setDraftValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            fullWidth autoFocus
          />
          <TextField
            size='small' label='Description (optional)' value={draftLabel}
            onChange={e => setDraftLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
            multiline minRows={2} fullWidth placeholder='Enter a description…'
          />
          {hasAbbreviation && (
            <TextField
              size='small' label='Abbreviation (2 chars, e.g. CA)' value={draftAbbr}
              onChange={e => setDraftAbbr(e.target.value.toUpperCase().slice(0, 2))}
              inputProps={{ maxLength: 2 }} sx={{ width: 200 }}
            />
          )}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button size='small' variant='outlined' color='inherit' onClick={() => setEditing(false)}>Cancel</Button>
            <Button size='small' variant='contained' onClick={handleSave}>Save</Button>
          </Box>
        </Box>
      )}
    </Box>
  )
}

// ─── Add new row ──────────────────────────────────────────────────────────────
function AddRow({
  hasAbbreviation,
  onAdd,
}: {
  hasAbbreviation: boolean
  onAdd: (value: string, label: string, abbreviation?: string) => void
}) {
  const [value, setValue] = useState('')
  const [label, setLabel] = useState('')
  const [abbr, setAbbr] = useState('')

  const handleAdd = () => {
    if (!value.trim()) return
    if (hasAbbreviation && abbr.trim().length !== 2) return
    onAdd(value.trim(), label.trim() || value.trim(), hasAbbreviation ? abbr.toUpperCase() : undefined)
    setValue(''); setLabel(''); setAbbr('')
  }

  return (
    <Box sx={{ px: 2, py: 2, borderTop: '2px dashed', borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <i className='tabler-plus text-lg' style={{ color: 'var(--mui-palette-primary-main)', flexShrink: 0, marginTop: 8 }} />
      <TextField
        size='small' placeholder='Display value *' value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
        sx={{ flex: 1, minWidth: 140 }} autoComplete='off'
      />
      <TextField
        size='small' placeholder='Description (optional)' value={label}
        onChange={e => setLabel(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
        sx={{ flex: 1.5, minWidth: 160 }} autoComplete='off'
      />
      {hasAbbreviation && (
        <TextField
          size='small' placeholder='AB' value={abbr}
          onChange={e => setAbbr(e.target.value.toUpperCase().slice(0, 2))}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          inputProps={{ maxLength: 2 }} sx={{ width: 72 }}
        />
      )}
      <Button
        variant='contained' size='small'
        disabled={!value.trim() || (hasAbbreviation && abbr.trim().length !== 2)}
        onClick={handleAdd} sx={{ whiteSpace: 'nowrap', mt: 0.25 }}
      >
        Add
      </Button>
    </Box>
  )
}

// ─── Main editor ─────────────────────────────────────────────────────────────
export default function LookupTypeEditor({
  lookupType,
  title,
  toggleable = true,
  hasAbbreviation = false,
  readOnly = false,
  reservedValues = [],
}: LookupTypeEditorProps) {
  const reservedSet = new Set(reservedValues.map(v => v.toLowerCase()))
  const [items, setItems] = useState<LookupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<LookupItem | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/lookups/${lookupType}?activeOnly=false`)
      const data = await res.json()
      if (Array.isArray(data)) setItems(data)
      else setError(data.error || 'Failed to load')
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }, [lookupType])

  useEffect(() => { fetchItems() }, [fetchItems])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUpdate = useCallback(async (id: string, patch: Partial<LookupItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
    await fetch(`/api/lookups/item/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }, [])

  const handleToggleActive = useCallback(async (id: string, val: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_active: val } : i))
    await fetch(`/api/lookups/item/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: val }),
    })
  }, [])

  const handleToggleDefault = useCallback(async (id: string, val: boolean) => {
    setItems(prev => prev.map(i => ({
      ...i,
      is_default: i.id === id ? val : (val ? false : i.is_default),
    })))
    await fetch(`/api/lookups/item/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: val }),
    })
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    setItems(prev => prev.filter(i => i.id !== deleteTarget.id))
    await fetch(`/api/lookups/item/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleteTarget(null)
  }, [deleteTarget])

  const handleAdd = useCallback(async (value: string, label: string, abbreviation?: string) => {
    const res = await fetch(`/api/lookups/${lookupType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, label, abbreviation, sort_order: items.length, isActive: true, isDefault: false }),
    })
    const data = await res.json()
    if (data.id) setItems(prev => [...prev, data])
  }, [lookupType, items.length])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems(prev => {
      const oldIdx = prev.findIndex(i => i.id === active.id)
      const newIdx = prev.findIndex(i => i.id === over.id)
      const reordered = arrayMove(prev, oldIdx, newIdx)
      
      // Fire-and-forget single bulk reorder save
      const payload = reordered.map((item, idx) => ({ id: item.id, sort_order: idx }))
      fetch('/api/lookups/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      return reordered
    })
  }, [])

  // ── Computed ──────────────────────────────────────────────────────────────
  const visibleItems = toggleable && !showInactive
    ? items.filter(i => i.is_active !== false)
    : items
  const inactiveCount = items.filter(i => i.is_active === false).length
  const activeCount = items.length - inactiveCount

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity='error' sx={{ m: 2 }}>Failed to load {title}. {error}</Alert>
  }

  return (
    <Box>
      <DeleteConfirmDialog
        item={deleteTarget}
        open={!!deleteTarget}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant='caption' color='text.secondary' sx={{ flex: 1 }}>
          {readOnly
            ? `${items.length} items (read-only)`
            : toggleable
              ? `${activeCount} active · ${inactiveCount} inactive`
              : `${items.length} items`}
        </Typography>
        {!readOnly && toggleable && inactiveCount > 0 && (
          <Tooltip title={showInactive ? 'Hide inactive items' : 'Show inactive items'}>
            <IconButton size='small' onClick={() => setShowInactive(v => !v)}>
              <i className={showInactive ? 'tabler-eye text-sm' : 'tabler-eye-off text-sm'} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Items list */}
      {visibleItems.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color='text.secondary'>
            {!showInactive ? 'All items are disabled — toggle the filter above.' : 'No items yet. Add one below.'}
          </Typography>
        </Box>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {visibleItems.map(item => (
              <SortableRow
                key={item.id}
                item={item}
                toggleable={toggleable}
                hasAbbreviation={hasAbbreviation}
                readOnly={readOnly}
                reserved={reservedSet.has(item.value.toLowerCase())}
                onUpdate={handleUpdate}
                onToggleActive={handleToggleActive}
                onToggleDefault={handleToggleDefault}
                onRequestDelete={(item) => setDeleteTarget(item)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* Add row */}
      {!readOnly && (
        <AddRow hasAbbreviation={hasAbbreviation} onAdd={handleAdd} />
      )}

      {readOnly && (
        <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
          <Typography variant='caption' color='text.secondary'>
            This list is managed by the system and cannot be edited here.
          </Typography>
        </Box>
      )}
    </Box>
  )
}
