'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { toast } from 'react-toastify'

import { api } from '@/lib/api'
import { COLORS } from '../../theme/designTokens'


// ─── Types ───────────────────────────────────────────────────────────────────
export interface LookupItem {
  id: string
  type: string
  value: string
  label: string
  order: number
  isDefault: boolean
  isPinned: boolean
  isActive: boolean
  abbreviation?: string
  hex?: string
  rgb?: string
}

interface LookupTypeEditorProps {
  lookupType: string
  title: string
  toggleable?: boolean
  hasAbbreviation?: boolean
  isColorSwatch?: boolean
  readOnly?: boolean
  /** Values that cannot be edited or deleted (system-reserved items) */
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

// ─── Color picker (hex input + preview) ───────────────────────────────────────
function ColorPickerField({
  hex,
  onChange,
}: {
  hex: string
  onChange: (hex: string, rgb: string) => void
}) {
  const [draft, setDraft] = useState(hex)

  const hexToRgb = (h: string) => {
    const clean = h.startsWith('#') ? h : `#${h}`
    const r = parseInt(clean.slice(1, 3), 16)
    const g = parseInt(clean.slice(3, 5), 16)
    const b = parseInt(clean.slice(5, 7), 16)
    return `rgb(${r}, ${g}, ${b})`
  }

  const handleChange = (v: string) => {
    setDraft(v)
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
      onChange(v, hexToRgb(v))
    }
  }

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
      {/* Native color input */}
      <Box
        component='input'
        type='color'
        value={draft.startsWith('#') && draft.length === 7 ? draft : COLORS.white}
        onChange={e => {
          const v = e.target.value
          setDraft(v)
          onChange(v, hexToRgb(v))
        }}
        sx={{ width: 44, height: 36, border: 'none', borderRadius: 1, cursor: 'pointer', p: 0 }}
      />
      <TextField
        size='small'
        label='Hex value'
        value={draft}
        onChange={e => handleChange(e.target.value)}
        inputProps={{ maxLength: 7 }}
        sx={{ width: 120 }}
        helperText={/^#[0-9A-Fa-f]{6}$/.test(draft) ? hexToRgb(draft) : 'e.g. #F0F8FF'}
        error={draft.length > 1 && !/^#[0-9A-Fa-f]{6}$/.test(draft)}
      />
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          bgcolor: /^#[0-9A-Fa-f]{6}$/.test(draft) ? draft : 'action.disabled',
          border: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}
      />
    </Box>
  )
}

// ─── Sortable row ─────────────────────────────────────────────────────────────
function SortableRow({
  item,
  toggleable,
  hasAbbreviation,
  isColorSwatch,
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
  isColorSwatch: boolean
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

  // Draft state — mirrors both value + label (same as mobile)
  const [draftValue, setDraftValue] = useState(item.value)
  const [draftLabel, setDraftLabel] = useState(item.label)
  const [draftAbbr, setDraftAbbr] = useState(item.abbreviation ?? '')
  const [draftHex, setDraftHex] = useState(item.hex ?? COLORS.white)
  const [draftRgb, setDraftRgb] = useState(item.rgb ?? 'rgb(255, 255, 255)')

  // Reset drafts when item updates from server
  useEffect(() => {
    if (!editing) {
      setDraftValue(item.value)
      setDraftLabel(item.label)
      setDraftAbbr(item.abbreviation ?? '')
      setDraftHex(item.hex ?? COLORS.white)
      setDraftRgb(item.rgb ?? 'rgb(255, 255, 255)')
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
    setDraftHex(item.hex ?? COLORS.white)
    setDraftRgb(item.rgb ?? 'rgb(255, 255, 255)')
    setEditing(true)
  }

  const handleSave = () => {
    if (!draftValue.trim()) { toast.error('Value cannot be empty'); return }
    if (hasAbbreviation && draftAbbr.trim().length !== 2) {
      toast.error('Abbreviation must be exactly 2 characters')
      return
    }
    const patch: Partial<LookupItem> = {
      value: draftValue.trim(),
      label: draftLabel.trim() || draftValue.trim(),
    }
    if (hasAbbreviation) patch.abbreviation = draftAbbr.toUpperCase()
    if (isColorSwatch) { patch.hex = draftHex; patch.rgb = draftRgb }
    onUpdate(item.id, patch)
    setEditing(false)
  }

  const handleCancel = () => {
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
      {/* ── View row ──────────────────────────────────────────────────── */}
      {!editing && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5 }}>
          {/* Drag handle */}
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

          {/* Color swatch circle */}
          {isColorSwatch && item.hex && (
            <Box
              sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                bgcolor: item.hex,
                border: `1px solid ${theme.palette.divider}`,
                flexShrink: 0,
              }}
            />
          )}

          {/* Label + value + abbreviation */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant='body2'
                fontWeight={500}
                sx={{
                  opacity: item.isActive ? 1 : 0.4,
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.value}
              </Typography>
              {hasAbbreviation && item.abbreviation && (
                <Chip
                  label={item.abbreviation}
                  size='small'
                  color='primary'
                  sx={{ fontSize: '0.65rem', height: 20, fontFamily: 'monospace', fontWeight: 700 }}
                />
              )}
            </Box>
            {item.label !== item.value && (
              <Typography variant='caption' color='text.disabled' noWrap>
                {item.label}
              </Typography>
            )}
          </Box>

          {/* Default badge */}
          {item.isDefault && (
            <Chip label='Default' size='small' color='primary' variant='tonal' sx={{ fontSize: '0.65rem', height: 20 }} />
          )}

          {!readOnly && (
            <>
              {/* Active toggle */}
              {toggleable && (
                <Tooltip title={item.isActive ? 'Active — click to deactivate' : 'Inactive — click to activate'}>
                  <Switch
                    size='small'
                    checked={item.isActive !== false}
                    onChange={e => onToggleActive(item.id, e.target.checked)}
                    color='primary'
                  />
                </Tooltip>
              )}

              {/* Reserved badge */}
              {reserved && (
                <Tooltip title='System reserved — cannot be edited or deleted'>
                  <Chip label='Reserved' size='small' color='warning' variant='tonal' sx={{ fontSize: '0.6rem', height: 20 }} />
                </Tooltip>
              )}

              {/* Edit */}
              {!reserved && (
                <Tooltip title='Edit'>
                  <IconButton size='small' onClick={handleEdit} sx={{ color: 'text.secondary' }}>
                    <i className='tabler-pencil text-sm' />
                  </IconButton>
                </Tooltip>
              )}

              {/* Set default */}
              <Tooltip title={item.isDefault ? 'Remove as default' : 'Set as default'}>
                <IconButton
                  size='small'
                  onClick={() => onToggleDefault(item.id, !item.isDefault)}
                  sx={{ color: item.isDefault ? 'primary.main' : 'action.disabled' }}
                >
                  <i className={item.isDefault ? 'tabler-star-filled text-sm' : 'tabler-star text-sm'} />
                </IconButton>
              </Tooltip>

              {/* Delete — triggers confirm dialog (matches mobile) */}
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

      {/* ── Edit form (expands in-place, same as mobile) ───────────────── */}
      {editing && (
        <Box sx={{ px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Abbreviated preview banner (same as mobile's top abbr display) */}
          {hasAbbreviation && (
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'primary.lightOpacity', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant='caption' color='text.secondary'>Current abbreviation:</Typography>
              <Typography variant='body2' fontWeight={700} color='primary.main' fontFamily='monospace'>
                {draftAbbr || '—'}
              </Typography>
            </Box>
          )}

          {/* Value (internal key) */}
          <TextField
            size='small'
            label='Display value'
            value={draftValue}
            onChange={e => setDraftValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
            fullWidth
            autoFocus
          />

          {/* Label (description) */}
          <TextField
            size='small'
            label='Description (optional)'
            value={draftLabel}
            onChange={e => setDraftLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') handleCancel() }}
            multiline
            minRows={2}
            fullWidth
            placeholder='Enter a description…'
          />

          {/* Abbreviation field (states/provinces) */}
          {hasAbbreviation && (
            <TextField
              size='small'
              label='Abbreviation (2 chars, e.g. CA)'
              value={draftAbbr}
              onChange={e => setDraftAbbr(e.target.value.toUpperCase().slice(0, 2))}
              inputProps={{ maxLength: 2 }}
              sx={{ width: 200 }}
            />
          )}

          {/* Color picker (color swatches) */}
          {isColorSwatch && (
            <Box>
              <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>Color</Typography>
              <ColorPickerField
                hex={draftHex}
                onChange={(hex, rgb) => { setDraftHex(hex); setDraftRgb(rgb) }}
              />
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button size='small' variant='outlined' color='inherit' onClick={handleCancel}>Cancel</Button>
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
    setValue('')
    setLabel('')
    setAbbr('')
  }

  return (
    <Box sx={{ px: 2, py: 2, borderTop: '2px dashed', borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <i className='tabler-plus text-lg' style={{ color: 'var(--mui-palette-primary-main)', flexShrink: 0, marginTop: 8 }} />
      <TextField
        size='small'
        placeholder='Display value *'
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
        sx={{ flex: 1, minWidth: 140 }}
        autoComplete='off'
      />
      <TextField
        size='small'
        placeholder='Description (optional)'
        value={label}
        onChange={e => setLabel(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
        sx={{ flex: 1.5, minWidth: 160 }}
        autoComplete='off'
      />
      {hasAbbreviation && (
        <TextField
          size='small'
          placeholder='AB'
          value={abbr}
          onChange={e => setAbbr(e.target.value.toUpperCase().slice(0, 2))}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          inputProps={{ maxLength: 2 }}
          sx={{ width: 72 }}
        />
      )}
      <Button
        variant='contained'
        size='small'
        disabled={!value.trim() || (hasAbbreviation && abbr.trim().length !== 2)}
        onClick={handleAdd}
        sx={{ whiteSpace: 'nowrap', mt: 0.25 }}
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
  isColorSwatch = false,
  readOnly = false,
  reservedValues = [],
}: LookupTypeEditorProps) {
  const reservedSet = new Set(reservedValues.map(v => v.toLowerCase()))
  const qc = useQueryClient()
  const [items, setItems] = useState<LookupItem[]>([])
  const prevDataRef = useRef<LookupItem[] | undefined>(undefined)
  const [showInactive, setShowInactive] = useState(true)

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<LookupItem | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const queryKey = ['lookups', lookupType]

  const { isLoading, error, data: queryData } = useQuery({
    queryKey,
    queryFn: () => api.get<LookupItem[]>(`/api/lookups/${lookupType}?activeOnly=false`),
    staleTime: 0, // Always refetch on mount, same as mobile
  })

  // Sync query data → local state. Uses ref guard to avoid unnecessary re-renders
  // (same pattern as mobile's prevApiLookupsRef)
  useEffect(() => {
    if (queryData && queryData !== prevDataRef.current) {
      prevDataRef.current = queryData
      setItems(queryData)
    }
  }, [queryData])

  const invalidate = () => qc.invalidateQueries({ queryKey })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<LookupItem> }) =>
      api.patch(`/api/lookups/${id}`, payload),
    onSuccess: invalidate,
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/lookups/${id}`),
    onMutate: id => setItems(prev => prev.filter(i => i.id !== id)), // optimistic
    onSuccess: () => { toast.success('Deleted'); invalidate() },
    onError: () => { toast.error('Failed to delete'); invalidate() },
  })

  const createMutation = useMutation({
    mutationFn: ({ value, label, abbreviation }: { value: string; label: string; abbreviation?: string }) =>
      api.post('/api/lookups', {
        type: lookupType,
        value,
        label,
        abbreviation,
        isActive: true,
        isDefault: false,
        order: items.length,
      }),
    onSuccess: () => { toast.success('Added'); invalidate() },
    onError: () => toast.error('Failed to add'),
  })

  const reorderMutation = useMutation({
    mutationFn: (reordered: LookupItem[]) =>
      api.post('/api/lookups/reorder', {
        items: reordered.map((item, idx) => ({ id: item.id, order: idx })),
      }),
    onError: () => toast.error('Failed to save order'),
  })

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems(prev => {
      const oldIdx = prev.findIndex(i => i.id === active.id)
      const newIdx = prev.findIndex(i => i.id === over.id)
      const reordered = arrayMove(prev, oldIdx, newIdx)
      reorderMutation.mutate(reordered)
      return reordered
    })
  }, [reorderMutation])

  const handleUpdate = useCallback((id: string, patch: Partial<LookupItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
    updateMutation.mutate({ id, payload: patch })
  }, [updateMutation])

  const handleToggleActive = useCallback((id: string, val: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, isActive: val } : i))
    updateMutation.mutate({ id, payload: { isActive: val } })
  }, [updateMutation])

  const handleToggleDefault = useCallback((id: string, val: boolean) => {
    setItems(prev => prev.map(i => ({
      ...i,
      isDefault: i.id === id ? val : (val ? false : i.isDefault),
    })))
    updateMutation.mutate({ id, payload: { isDefault: val } })
  }, [updateMutation])

  // Delete: show confirm dialog first (matches mobile Alert.alert pattern)
  const handleRequestDelete = useCallback((item: LookupItem) => {
    setDeleteTarget(item)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
    setDeleteTarget(null)
  }, [deleteTarget, deleteMutation])

  const handleAdd = useCallback((value: string, label: string, abbreviation?: string) => {
    createMutation.mutate({ value, label, abbreviation })
  }, [createMutation])

  // ── Computed ──────────────────────────────────────────────────────────────
  const visibleItems = toggleable && !showInactive
    ? items.filter(i => i.isActive !== false)
    : items
  const inactiveCount = items.filter(i => i.isActive === false).length
  const activeCount = items.length - inactiveCount

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity='error' sx={{ m: 2 }}>
        Failed to load {title}. Check your backend connection.
      </Alert>
    )
  }

  return (
    <Box>
      {/* Delete confirmation dialog — matches mobile's Alert.alert confirm */}
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
                isColorSwatch={isColorSwatch}
                readOnly={readOnly}
                reserved={reservedSet.has(item.value.toLowerCase())}
                onUpdate={handleUpdate}
                onToggleActive={handleToggleActive}
                onToggleDefault={handleToggleDefault}
                onRequestDelete={handleRequestDelete}
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
