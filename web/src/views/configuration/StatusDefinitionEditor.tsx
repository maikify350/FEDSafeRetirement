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
import Checkbox from '@mui/material/Checkbox'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import FormControlLabel from '@mui/material/FormControlLabel'
import { useTheme } from '@mui/material/styles'
import { toast } from 'react-toastify'

import Chip from '@mui/material/Chip'
import { api } from '@/lib/api'

// ─── Reserved status rules ──────────────────────────────────────────────────
/** Status values that are system-reserved and cannot be deleted or have certain flags changed */
const RESERVED_STATUS_RULES: Record<string, { preventDelete: boolean; preventEdit: boolean; lockedFlags: string[] }> = {
  'un-scheduled': { preventDelete: true, preventEdit: true, lockedFlags: ['enabledForJob'] },
}

function getReservedRule(statusName: string) {
  return RESERVED_STATUS_RULES[statusName.toLowerCase()] ?? null
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface StatusDefinition {
  id: string
  status: string
  description: string | null
  enabledForRequest: boolean
  enabledForQuote: boolean
  enabledForJob: boolean
  enabledForInvoice: boolean
  enabledForPurchaseOrder: boolean
  order: number
  creAt: string
  modAt: string
  creBy: string
  modBy: string
}

// ─── Delete confirm ──────────────────────────────────────────────────────────
function DeleteConfirmDialog({
  item,
  open,
  onConfirm,
  onCancel,
}: {
  item: StatusDefinition | null
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth='xs' fullWidth>
      <DialogTitle>Delete Status</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete <strong>&ldquo;{item?.status}&rdquo;</strong>? This cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color='inherit'>Cancel</Button>
        <Button onClick={onConfirm} color='error' variant='contained'>Delete</Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Sortable row ────────────────────────────────────────────────────────────
const ENTITY_FLAGS = [
  { key: 'enabledForRequest' as const, label: 'Request', short: 'R' },
  { key: 'enabledForQuote' as const, label: 'Quote', short: 'Q' },
  { key: 'enabledForJob' as const, label: 'Job', short: 'J' },
  { key: 'enabledForInvoice' as const, label: 'Invoice', short: 'I' },
  { key: 'enabledForPurchaseOrder' as const, label: 'PO', short: 'PO' },
]

function SortableRow({
  item,
  onUpdate,
  onToggle,
  onRequestDelete,
}: {
  item: StatusDefinition
  onUpdate: (id: string, patch: Partial<StatusDefinition>) => void
  onToggle: (id: string, field: string) => void
  onRequestDelete: (item: StatusDefinition) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })
  const theme = useTheme()
  const [editing, setEditing] = useState(false)
  const [draftStatus, setDraftStatus] = useState(item.status)
  const [draftDescription, setDraftDescription] = useState(item.description || '')

  useEffect(() => {
    if (!editing) {
      setDraftStatus(item.status)
      setDraftDescription(item.description || '')
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
    setDraftStatus(item.status)
    setDraftDescription(item.description || '')
    setEditing(true)
  }

  const handleSave = () => {
    if (!draftStatus.trim()) { toast.error('Status name cannot be empty'); return }
    onUpdate(item.id, { status: draftStatus.trim(), description: draftDescription.trim() || null } as any)
    setEditing(false)
  }

  const rule = getReservedRule(item.status)

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
      {/* ── View row ──────────────────────────────────────────────── */}
      {!editing && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5 }}>
          {/* Drag handle */}
          <Tooltip title='Drag to reorder'>
            <Box
              {...attributes}
              {...listeners}
              sx={{ cursor: 'grab', color: 'text.disabled', display: 'flex', alignItems: 'center', flexShrink: 0, width: 20, justifyContent: 'center', '&:active': { cursor: 'grabbing' } }}
            >
              <i className='tabler-grip-vertical text-xl' />
            </Box>
          </Tooltip>

          {/* Status name + description */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant='body2' fontWeight={500} noWrap>{item.status}</Typography>
              {rule && (
                <Chip label='Reserved' size='small' color='warning' variant='outlined' sx={{ fontSize: '0.6rem', height: 18 }} />
              )}
            </Box>
            {item.description && (
              <Typography variant='caption' color='text.disabled' noWrap>{item.description}</Typography>
            )}
          </Box>

          {/* Entity checkboxes */}
          {ENTITY_FLAGS.map(flag => {
            const locked = rule?.lockedFlags.includes(flag.key)
            return (
              <Tooltip key={flag.key} title={locked ? `${flag.label} is locked for this status` : `${item[flag.key] ? 'Disable' : 'Enable'} for ${flag.label}`}>
                <Box
                  sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    width: 30, flexShrink: 0,
                    cursor: locked ? 'not-allowed' : 'pointer',
                    opacity: item[flag.key] ? 1 : 0.3,
                  }}
                  onClick={() => { if (!locked) onToggle(item.id, flag.key) }}
                >
                  <Checkbox size='small' checked={item[flag.key]} disabled={locked} sx={{ p: 0 }} readOnly tabIndex={-1} />
                  <Typography variant='caption' sx={{ fontSize: '0.6rem', lineHeight: 1, mt: 0.25 }}>{flag.short}</Typography>
                </Box>
              </Tooltip>
            )
          })}

          {/* Edit + Delete (wrapped to match toolbar spacer as single flex child) */}
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            {!rule?.preventEdit && (
              <Tooltip title='Edit'>
                <IconButton size='small' onClick={handleEdit} sx={{ color: 'text.secondary' }}>
                  <i className='tabler-pencil text-sm' />
                </IconButton>
              </Tooltip>
            )}
            {!rule?.preventDelete && (
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
          </Box>
        </Box>
      )}

      {/* ── Edit form ─────────────────────────────────────────────── */}
      {editing && (
        <Box sx={{ px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            size='small'
            label='Status Name'
            value={draftStatus}
            onChange={e => setDraftStatus(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            fullWidth
            autoFocus
          />
          <TextField
            size='small'
            label='Description (optional)'
            value={draftDescription}
            onChange={e => setDraftDescription(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
            multiline
            minRows={2}
            fullWidth
            placeholder='Enter a description…'
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {ENTITY_FLAGS.map(flag => (
              <FormControlLabel
                key={flag.key}
                control={<Checkbox size='small' checked={item[flag.key]} onChange={() => onToggle(item.id, flag.key)} />}
                label={flag.label}
                sx={{ '& .MuiTypography-root': { fontSize: '0.8rem' } }}
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button size='small' variant='outlined' color='inherit' onClick={() => setEditing(false)}>Cancel</Button>
            <Button size='small' variant='contained' onClick={handleSave}>Save</Button>
          </Box>
        </Box>
      )}
    </Box>
  )
}

// ─── Add new row ─────────────────────────────────────────────────────────────
function AddRow({ onAdd }: { onAdd: (status: string, description: string) => void }) {
  const [status, setStatus] = useState('')
  const [description, setDescription] = useState('')

  const handleAdd = () => {
    if (!status.trim()) return
    onAdd(status.trim(), description.trim())
    setStatus('')
    setDescription('')
  }

  return (
    <Box sx={{ px: 2, py: 2, borderTop: '2px dashed', borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <i className='tabler-plus text-lg' style={{ color: 'var(--mui-palette-primary-main)', flexShrink: 0, marginTop: 8 }} />
      <TextField
        size='small'
        placeholder='Status name *'
        value={status}
        onChange={e => setStatus(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
        sx={{ flex: 1, minWidth: 140 }}
        autoComplete='off'
      />
      <TextField
        size='small'
        placeholder='Description (optional)'
        value={description}
        onChange={e => setDescription(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
        sx={{ flex: 1.5, minWidth: 160 }}
        autoComplete='off'
      />
      <Button
        variant='contained'
        size='small'
        disabled={!status.trim()}
        onClick={handleAdd}
        sx={{ whiteSpace: 'nowrap', mt: 0.25 }}
      >
        Add
      </Button>
    </Box>
  )
}

// ─── Main editor ─────────────────────────────────────────────────────────────
export default function StatusDefinitionEditor() {
  const qc = useQueryClient()
  const [items, setItems] = useState<StatusDefinition[]>([])
  const prevDataRef = useRef<StatusDefinition[] | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<StatusDefinition | null>(null)
  const [entityFilter, setEntityFilter] = useState<string>('all')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const queryKey = ['status-definitions']

  const { isLoading, error, data: queryData } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get<{ data: StatusDefinition[] }>('/api/status-definitions')
      return (res as any).data || res
    },
    staleTime: 0,
  })

  useEffect(() => {
    if (queryData && queryData !== prevDataRef.current) {
      prevDataRef.current = queryData as any
      setItems(Array.isArray(queryData) ? queryData : [])
    }
  }, [queryData])

  // Filtered items based on entity filter
  const filteredItems = entityFilter === 'all'
    ? items
    : items.filter(item => (item as any)[`enabledFor${entityFilter.charAt(0).toUpperCase() + entityFilter.slice(1)}`])

  const invalidate = () => qc.invalidateQueries({ queryKey })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, any> }) =>
      api.patch(`/api/status-definitions/${id}`, payload),
    onSuccess: invalidate,
    onError: () => toast.error('Failed to update'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, recordType }: { id: string; recordType: string }) =>
      api.post(`/api/status-definitions/${id}/toggle/${recordType}`, {}),
    onSuccess: invalidate,
    onError: () => toast.error('Failed to toggle'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/status-definitions/${id}`),
    onMutate: id => setItems(prev => prev.filter(i => i.id !== id)),
    onSuccess: () => { toast.success('Deleted'); invalidate() },
    onError: () => { toast.error('Failed to delete'); invalidate() },
  })

  const createMutation = useMutation({
    mutationFn: ({ status, description }: { status: string; description: string }) =>
      api.post('/api/status-definitions', {
        status,
        description: description || undefined,
        enabledForRequest: true,
        enabledForQuote: true,
        enabledForJob: true,
        enabledForInvoice: true,
        enabledForPurchaseOrder: false,
        order: items.length,
      }),
    onSuccess: () => { toast.success('Added'); invalidate() },
    onError: () => toast.error('Failed to add'),
  })

  const reorderMutation = useMutation({
    mutationFn: (reordered: StatusDefinition[]) =>
      api.post('/api/status-definitions/reorder', {
        items: reordered.map((item, idx) => ({ id: item.id, order: idx })),
      }),
    onError: () => toast.error('Failed to save order'),
  })

  // Map flag key to record type for toggle API
  const flagToRecordType: Record<string, string> = {
    enabledForRequest: 'request',
    enabledForQuote: 'quote',
    enabledForJob: 'job',
    enabledForInvoice: 'invoice',
    enabledForPurchaseOrder: 'purchaseOrder',
  }

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

  const handleUpdate = useCallback((id: string, patch: Partial<StatusDefinition>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
    updateMutation.mutate({ id, payload: patch })
  }, [updateMutation])

  const handleToggle = useCallback((id: string, field: string) => {
    const recordType = flagToRecordType[field]
    if (!recordType) return
    // Optimistic update
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: !(i as any)[field] } : i))
    toggleMutation.mutate({ id, recordType })
  }, [toggleMutation])

  const handleRequestDelete = useCallback((item: StatusDefinition) => {
    setDeleteTarget(item)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
    setDeleteTarget(null)
  }, [deleteTarget, deleteMutation])

  const handleAdd = useCallback((status: string, description: string) => {
    createMutation.mutate({ status, description })
  }, [createMutation])

  // Entity filter config
  const ENTITY_FILTER_CHIPS = [
    { key: 'all', label: 'All', icon: 'tabler-list' },
    { key: 'request', label: 'Request', icon: 'tabler-clipboard-text', short: 'R' },
    { key: 'quote', label: 'Quote', icon: 'tabler-file-text', short: 'Q' },
    { key: 'job', label: 'Job', icon: 'tabler-tool', short: 'J' },
    { key: 'invoice', label: 'Invoice', icon: 'tabler-receipt', short: 'I' },
    { key: 'purchaseOrder', label: 'PO', icon: 'tabler-shopping-cart', short: 'PO' },
  ]

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
        Failed to load Status Definitions. Check your backend connection.
      </Alert>
    )
  }

  return (
    <Box>
      <DeleteConfirmDialog
        item={deleteTarget}
        open={!!deleteTarget}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Entity filter chips */}
      <Box sx={{ display: 'flex', gap: 0.75, px: 2, pt: 2, pb: 1, flexWrap: 'wrap' }}>
        {ENTITY_FILTER_CHIPS.map(chip => {
          const isActive = entityFilter === chip.key
          const count = chip.key === 'all'
            ? items.length
            : items.filter(i => (i as any)[`enabledFor${chip.key.charAt(0).toUpperCase() + chip.key.slice(1)}`]).length
          return (
            <Button
              key={chip.key}
              size='small'
              variant={isActive ? 'contained' : 'outlined'}
              color={isActive ? 'primary' : 'inherit'}
              onClick={() => setEntityFilter(chip.key)}
              startIcon={<i className={`${chip.icon} text-sm`} />}
              sx={{
                borderRadius: '999px',
                textTransform: 'none',
                fontSize: '0.75rem',
                fontWeight: isActive ? 700 : 400,
                px: 1.5,
                py: 0.25,
                minHeight: 28,
              }}
            >
              {chip.label} ({count})
            </Button>
          )
        })}
      </Box>

      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        {/* Spacer matching drag handle width */}
        <Box sx={{ width: 20, flexShrink: 0 }} />
        <Typography variant='caption' color='text.secondary' sx={{ flex: 1 }}>
          {filteredItems.length} status definition{filteredItems.length !== 1 ? 's' : ''}
          {entityFilter !== 'all' && ` for ${ENTITY_FILTER_CHIPS.find(c => c.key === entityFilter)?.label}`}
        </Typography>
        {/* Column headers - must match row checkbox widths exactly (width:30, no mx) */}
        {ENTITY_FLAGS.map(flag => (
          <Typography key={flag.key} variant='caption' sx={{ fontSize: '0.6rem', width: 30, flexShrink: 0, textAlign: 'center', color: 'text.disabled' }}>
            {flag.short}
          </Typography>
        ))}
        {/* Spacer matching the edit+delete button wrapper width */}
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, visibility: 'hidden' }}>
          <IconButton size='small' tabIndex={-1}><i className='tabler-pencil text-sm' /></IconButton>
          <IconButton size='small' tabIndex={-1}><i className='tabler-trash text-sm' /></IconButton>
        </Box>
      </Box>

      {/* Items list */}
      {filteredItems.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color='text.secondary'>
            {entityFilter !== 'all'
              ? `No statuses enabled for ${ENTITY_FILTER_CHIPS.find(c => c.key === entityFilter)?.label}. Toggle checkboxes to enable.`
              : 'No status definitions yet. Add one below.'}
          </Typography>
        </Box>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {filteredItems.map(item => (
              <SortableRow
                key={item.id}
                item={item}
                onUpdate={handleUpdate}
                onToggle={handleToggle}
                onRequestDelete={handleRequestDelete}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* Add row */}
      <AddRow onAdd={handleAdd} />
    </Box>
  )
}
