'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControlLabel from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Autocomplete from '@mui/material/Autocomplete'
import CustomTextField from '@core/components/mui/TextField'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '@/lib/api'

interface CustomFieldDefinition {
  id: string
  entityType: string
  fieldName: string
  fieldLabel: string
  fieldType: string
  options: string[]
  defaultValue: string | null
  placeholder: string | null
  maxLength: number | null
  regexPattern: string | null
  regexHint: string | null
  description: string | null
  isRequired: boolean
  showInGrid: boolean
  showInCard: boolean
  sortOrder: number
  isActive: boolean
  isSystem: boolean
  creAt: string
  modAt: string
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: 'tabler-forms' },
  { value: 'number', label: 'Number', icon: 'tabler-123' },
  { value: 'date', label: 'Date', icon: 'tabler-calendar' },
  { value: 'boolean', label: 'Yes / No', icon: 'tabler-toggle-left' },
  { value: 'dropdown', label: 'Dropdown', icon: 'tabler-list' },
  { value: 'textarea', label: 'Long Text', icon: 'tabler-align-left' },
  { value: 'email', label: 'Email', icon: 'tabler-mail' },
  { value: 'phone', label: 'Phone', icon: 'tabler-phone' },
  { value: 'url', label: 'URL', icon: 'tabler-link' },
]

interface Props {
  entityType?: string
  entityLabel?: string
}

// --- Sortable Row Component ---
function SortableFieldRow({ field, index, totalActive, onEdit, onToggle, onDelete }: {
  field: CustomFieldDefinition
  index: number
  totalActive: number
  onEdit: (field: CustomFieldDefinition) => void
  onToggle: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1.5,
        px: 2,
        borderRadius: 1,
        bgcolor: isDragging ? 'action.selected' : 'transparent',
        '&:hover': { bgcolor: 'action.hover' },
        borderBottom: index < totalActive - 1 ? '1px solid' : 'none',
        borderColor: 'divider',
      }}
    >
      {/* Drag handle */}
      <Box
        {...attributes}
        {...listeners}
        sx={{ color: 'text.disabled', width: 20, display: 'flex', justifyContent: 'center', cursor: 'grab', '&:active': { cursor: 'grabbing' }, touchAction: 'none' }}
      >
        <i className='tabler-grip-vertical text-base' />
      </Box>

      {/* Type icon */}
      <Tooltip title={FIELD_TYPES.find(t => t.value === field.fieldType)?.label || field.fieldType}>
        <Box sx={{ color: 'primary.main' }}>
          <i className={`${FIELD_TYPES.find(t => t.value === field.fieldType)?.icon || 'tabler-forms'} text-xl`} />
        </Box>
      </Tooltip>

      {/* Label & meta */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant='body2' fontWeight={600} noWrap>
          {field.fieldLabel}
          {field.isRequired && (
            <Typography component='span' color='error.main' sx={{ ml: 0.5 }}>*</Typography>
          )}
          {field.isSystem && (
            <Chip label='System' size='small' color='default' variant='outlined' sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />
          )}
        </Typography>
        <Typography variant='caption' color='text.secondary' noWrap>
          {[
            `Key: ${field.fieldName}`,
            field.fieldType === 'dropdown' && field.options?.length > 0 ? `${field.options.length} options` : null,
            field.maxLength ? `max ${field.maxLength} chars` : null,
            field.regexPattern ? `regex validation` : null,
          ].filter(Boolean).join(' · ')}
        </Typography>
      </Box>

      {/* Badges */}
      {field.showInGrid && (
        <Chip label='Grid' size='small' variant='outlined' color='primary' sx={{ fontSize: '0.65rem', height: 20 }} />
      )}
      {field.showInCard && (
        <Chip label='Card' size='small' variant='outlined' color='secondary' sx={{ fontSize: '0.65rem', height: 20 }} />
      )}

      {/* Description tooltip */}
      {field.description && (
        <Tooltip title={field.description} arrow>
          <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
            <i className='tabler-info-circle text-base' />
          </Box>
        </Tooltip>
      )}

      {/* Actions */}
      <Tooltip title='Edit'>
        <IconButton size='small' onClick={() => onEdit(field)}>
          <i className='tabler-pencil text-base' />
        </IconButton>
      </Tooltip>
      <Tooltip title='Deactivate'>
        <Switch
          size='small'
          checked={field.isActive}
          onChange={() => onToggle(field.id, false)}
        />
      </Tooltip>
      {!field.isSystem ? (
        <Tooltip title='Delete'>
          <IconButton size='small' color='error' onClick={() => onDelete(field.id)}>
            <i className='tabler-trash text-base' />
          </IconButton>
        </Tooltip>
      ) : (
        <IconButton size='small' disabled sx={{ opacity: 0 }}>
          <i className='tabler-trash text-base' />
        </IconButton>
      )}
    </Box>
  )
}

const ENTITY_OPTIONS = [
  { value: 'client', label: 'Client', icon: 'tabler-users' },
  { value: 'request', label: 'Request', icon: 'tabler-inbox' },
  { value: 'quote', label: 'Quote', icon: 'tabler-file-description' },
  { value: 'job', label: 'Job', icon: 'tabler-briefcase' },
  { value: 'invoice', label: 'Invoice', icon: 'tabler-file-invoice' },
  { value: 'vendor', label: 'Vendor', icon: 'tabler-building-store' },
  { value: 'purchase_order', label: 'Purchase Order', icon: 'tabler-clipboard-list' },
  { value: 'solution', label: 'Solution', icon: 'tabler-bulb' },
  { value: 'fleet', label: 'Fleet', icon: 'tabler-car' },
  { value: 'team', label: 'Team', icon: 'tabler-users-group' },
]

/**
 * Admin editor for custom field definitions with drag-to-reorder and field type configuration.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/configuration/CustomFieldsEditor.tsx
 */
export default function CustomFieldsEditor({ entityType: initialEntityType }: Props) {
  const queryClient = useQueryClient()
  const [selectedEntity, setSelectedEntity] = useState(initialEntityType || 'client')
  const selectedLabel = ENTITY_OPTIONS.find(e => e.value === selectedEntity)?.label || selectedEntity
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Form state
  const [fieldLabel, setFieldLabel] = useState('')
  const [fieldType, setFieldType] = useState('text')
  const [placeholder, setPlaceholder] = useState('')
  const [defaultValue, setDefaultValue] = useState('')
  const [maxLength, setMaxLength] = useState<string>('')
  const [regexPattern, setRegexPattern] = useState('')
  const [regexHint, setRegexHint] = useState('')
  const [description, setDescription] = useState('')
  const [isRequired, setIsRequired] = useState(false)
  const [showInGrid, setShowInGrid] = useState(false)
  const [showInCard, setShowInCard] = useState(false)
  const [options, setOptions] = useState<string[]>([])
  const [newOption, setNewOption] = useState('')

  // Fetch field definitions for selected entity
  const { data: fields = [], isLoading } = useQuery<CustomFieldDefinition[]>({
    queryKey: ['custom-fields', selectedEntity],
    queryFn: () => api.get(`/api/custom-fields/${selectedEntity}`),
    enabled: !!selectedEntity,
  })

  // Fetch counts for ALL entities (for the dropdown badges)
  const { data: allFieldCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ['custom-fields-counts'],
    queryFn: async () => {
      const counts: Record<string, number> = {}
      for (const ent of ENTITY_OPTIONS) {
        try {
          const fields = await api.get<CustomFieldDefinition[]>(`/api/custom-fields/${ent.value}`)
          counts[ent.value] = fields.length
        } catch { counts[ent.value] = 0 }
      }
      return counts
    },
    staleTime: 30000,
  })

  // Fetch validation patterns for autocomplete
  const { data: validationPatterns = [] } = useQuery<any[]>({
    queryKey: ['validation-patterns'],
    queryFn: () => api.get('/api/validation-patterns'),
    staleTime: Infinity,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/custom-fields', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', selectedEntity] })
      queryClient.invalidateQueries({ queryKey: ['custom-fields-counts'] })
      handleCloseDialog()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/api/custom-fields/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', selectedEntity] })
      handleCloseDialog()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/custom-fields/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', selectedEntity] })
      queryClient.invalidateQueries({ queryKey: ['custom-fields-counts'] })
      setDeleteConfirmId(null)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/api/custom-fields/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', selectedEntity] })
    },
  })

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.put('/api/custom-fields/reorder', { orderedIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', selectedEntity] })
    },
  })

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = activeFields.findIndex(f => f.id === active.id)
    const newIndex = activeFields.findIndex(f => f.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(activeFields, oldIndex, newIndex)
    reorderMutation.mutate(reordered.map(f => f.id))
  }

  const handleOpenCreate = () => {
    setEditingField(null)
    setFieldLabel('')
    setFieldType('text')
    setPlaceholder('')
    setDefaultValue('')
    setMaxLength('')
    setRegexPattern('')
    setRegexHint('')
    setDescription('')
    setIsRequired(false)
    setShowInGrid(false)
    setShowInCard(false)
    setOptions([])
    setNewOption('')
    setDialogOpen(true)
  }

  const handleOpenEdit = (field: CustomFieldDefinition) => {
    setEditingField(field)
    setFieldLabel(field.fieldLabel)
    setFieldType(field.fieldType)
    setPlaceholder(field.placeholder || '')
    setDefaultValue(field.defaultValue || '')
    setMaxLength(field.maxLength?.toString() || '')
    setRegexPattern(field.regexPattern || '')
    setRegexHint(field.regexHint || '')
    setDescription(field.description || '')
    setIsRequired(field.isRequired)
    setShowInGrid(field.showInGrid)
    setShowInCard(field.showInCard)
    setOptions(field.options || [])
    setNewOption('')
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingField(null)
  }

  const handleSave = () => {
    if (!fieldLabel.trim()) return

    const data = {
      entityType: selectedEntity,
      fieldLabel: fieldLabel.trim(),
      fieldType,
      placeholder: placeholder.trim() || null,
      defaultValue: defaultValue.trim() || null,
      maxLength: maxLength ? parseInt(maxLength) : null,
      regexPattern: regexPattern.trim() || null,
      regexHint: regexHint.trim() || null,
      description: description.trim() || null,
      isRequired,
      showInGrid,
      showInCard,
      options: fieldType === 'dropdown' ? options : [],
    }

    if (editingField) {
      updateMutation.mutate({ id: editingField.id, ...data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleAddOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()])
      setNewOption('')
    }
  }

  const handleRemoveOption = (opt: string) => {
    setOptions(options.filter(o => o !== opt))
  }

  const handleMoveOption = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === options.length - 1) return
    const newOptions = [...options]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const temp = newOptions[index]
    newOptions[index] = newOptions[targetIndex]
    newOptions[targetIndex] = temp
    setOptions(newOptions)
  }

  const activeFields = fields.filter(f => f.isActive)
  const inactiveFields = fields.filter(f => !f.isActive)

  return (
    <Box sx={{ p: 3 }}>
      {/* Entity Selector */}
      <Box sx={{ mb: 3 }}>
        <CustomTextField
          select
          fullWidth
          label='Entity Type'
          value={selectedEntity}
          onChange={e => setSelectedEntity(e.target.value)}
          helperText='Select which entity to configure custom fields for'
        >
          {ENTITY_OPTIONS.map(ent => (
            <MenuItem key={ent.value} value={ent.value}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <i className={`${ent.icon} text-base`} />
                {ent.label}
                {(allFieldCounts[ent.value] ?? 0) > 0 && (
                  <Chip label={allFieldCounts[ent.value]} size='small' color='primary' sx={{ ml: 'auto', height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                )}
              </Box>
            </MenuItem>
          ))}
        </CustomTextField>
      </Box>

      {/* Header + Add button */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant='body2' color='text.secondary'>
            Define custom fields that will appear in {selectedLabel} records. These fields use flexible JSONB storage — no database migrations needed.
          </Typography>
        </Box>
        <Button
          variant='contained'
          size='small'
          startIcon={<i className='tabler-plus text-base' />}
          onClick={handleOpenCreate}
          sx={{ flexShrink: 0 }}
        >
          Add Field
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : fields.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <i className='tabler-forms text-5xl mb-2' style={{ display: 'block' }} />
          <Typography variant='body1' fontWeight={500}>No custom fields defined yet</Typography>
          <Typography variant='body2'>Click "Add Field" to create your first custom field for {selectedLabel.toLowerCase()} records.</Typography>
        </Box>
      ) : (
        <>
          {/* Active fields — sortable via DnD */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={activeFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              {activeFields.map((field, index) => (
                <SortableFieldRow
                  key={field.id}
                  field={field}
                  index={index}
                  totalActive={activeFields.length}
                  onEdit={handleOpenEdit}
                  onToggle={(id, isActive) => toggleMutation.mutate({ id, isActive })}
                  onDelete={(id) => setDeleteConfirmId(id)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Inactive fields */}
          {inactiveFields.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>
                Inactive Fields ({inactiveFields.length})
              </Typography>
              {inactiveFields.map(field => (
                <Box
                  key={field.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 1,
                    px: 2,
                    opacity: 0.5,
                    borderRadius: 1,
                    '&:hover': { opacity: 0.8, bgcolor: 'action.hover' },
                  }}
                >
                  <Box sx={{ width: 20 }} />
                  <Box sx={{ color: 'text.disabled' }}>
                    <i className={`${FIELD_TYPES.find(t => t.value === field.fieldType)?.icon || 'tabler-forms'} text-xl`} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant='body2' color='text.disabled'>{field.fieldLabel}</Typography>
                  </Box>
                  <Tooltip title='Re-activate'>
                    <Switch
                      size='small'
                      checked={false}
                      onChange={() => toggleMutation.mutate({ id: field.id, isActive: true })}
                    />
                  </Tooltip>
                  {!field.isSystem && (
                    <Tooltip title='Delete'>
                      <IconButton size='small' color='error' onClick={() => setDeleteConfirmId(field.id)}>
                        <i className='tabler-trash text-base' />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              ))}
            </>
          )}
        </>
      )}

      {/* ── Create/Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth='sm' fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingField ? 'Edit Custom Field' : 'New Custom Field'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3 }}>
          {/* Label */}
          <CustomTextField
            fullWidth
            label='Field Label'
            required
            disabled={editingField?.isSystem}
            value={fieldLabel}
            onChange={e => setFieldLabel(e.target.value)}
            placeholder='e.g. PO Number, Gate Code, Contract ID'
            helperText='This is the label users will see'
          />

          {/* Type */}
          <CustomTextField
            select
            fullWidth
            label='Field Type'
            disabled={editingField?.isSystem}
            value={fieldType}
            onChange={e => setFieldType(e.target.value)}
          >
            {FIELD_TYPES.map(t => (
              <MenuItem key={t.value} value={t.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <i className={`${t.icon} text-base`} />
                  {t.label}
                </Box>
              </MenuItem>
            ))}
          </CustomTextField>

          {/* Dropdown Options */}
          {fieldType === 'dropdown' && (
            <Box>
              <Typography variant='body2' fontWeight={600} sx={{ mb: 1 }}>Dropdown Options</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                {options.length === 0 && (
                  <Typography variant='body2' color='text.secondary'>No options added yet.</Typography>
                )}
                {options.map((opt, index) => (
                  <Box key={opt} sx={{ display: 'flex', alignItems: 'center', p: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant='body2' sx={{ flex: 1, ml: 1 }}>{opt}</Typography>
                    <IconButton size='small' disabled={index === 0} onClick={() => handleMoveOption(index, 'up')}>
                      <i className='tabler-arrow-up text-base' />
                    </IconButton>
                    <IconButton size='small' disabled={index === options.length - 1} onClick={() => handleMoveOption(index, 'down')}>
                      <i className='tabler-arrow-down text-base' />
                    </IconButton>
                    <IconButton size='small' color='error' onClick={() => handleRemoveOption(opt)}>
                      <i className='tabler-trash text-base' />
                    </IconButton>
                  </Box>
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  placeholder='Add option...'
                  value={newOption}
                  onChange={e => setNewOption(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption() } }}
                />
                <Button variant='outlined' size='small' onClick={handleAddOption} disabled={!newOption.trim()}>
                  Add
                </Button>
              </Box>
            </Box>
          )}

          {/* Placeholder */}
          <CustomTextField
            fullWidth
            label='Placeholder'
            disabled={editingField?.isSystem}
            value={placeholder}
            onChange={e => setPlaceholder(e.target.value)}
            placeholder='e.g. Enter PO number...'
            helperText='Hint text shown when the field is empty'
          />

          {/* Default Value */}
          <CustomTextField
            fullWidth
            label='Default Value'
            disabled={editingField?.isSystem}
            value={defaultValue}
            onChange={e => setDefaultValue(e.target.value)}
            placeholder='Optional'
            helperText='Pre-filled value for new records'
          />

          {/* Max Length (for text types) */}
          {(fieldType === 'text' || fieldType === 'textarea' || fieldType === 'email' || fieldType === 'phone') && (
            <CustomTextField
              fullWidth
              label='Max Length'
              type='number'
              value={maxLength}
              onChange={e => setMaxLength(e.target.value)}
              placeholder='Unlimited'
              helperText='Leave empty for no limit'
            />
          )}

          {/* Regex Pattern (for text types) */}
          {(fieldType === 'text' || fieldType === 'textarea') && (
            <>
              <Autocomplete
                freeSolo
                options={validationPatterns}
                getOptionLabel={(option: any) => typeof option === 'string' ? option : `${option.label} (${option.regex})`}
                value={regexPattern}
                onChange={(_, newValue: any) => {
                  if (typeof newValue === 'string') {
                    setRegexPattern(newValue)
                  } else if (newValue && newValue.regex) {
                    setRegexPattern(newValue.regex)
                    if (!regexHint) setRegexHint(`Must match: ${newValue.label}`)
                  } else {
                    setRegexPattern('')
                  }
                }}
                onInputChange={(_, newInputValue) => {
                  setRegexPattern(newInputValue)
                }}
                renderInput={(params) => (
                  <CustomTextField
                    {...params}
                    label='Regex Pattern'
                    placeholder='e.g. ^[A-Z]{2}-\d{4}$'
                    helperText='Optional regular expression to validate input format'
                  />
                )}
              />
              {regexPattern && (
                <CustomTextField
                  fullWidth
                  label='Validation Hint'
                  value={regexHint}
                  onChange={e => setRegexHint(e.target.value)}
                  placeholder='e.g. Must match format: XX-1234'
                  helperText='User-friendly message shown when validation fails'
                />
              )}
            </>
          )}

          {/* Description (purpose) */}
          <CustomTextField
            fullWidth
            label='Description / Purpose'
            disabled={editingField?.isSystem}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder='e.g. Used to track HOA permit numbers for subdivision work'
            helperText='Optional — explains what this field is for and how to use it'
            multiline
            minRows={2}
          />

          <Divider />

          {/* Toggles row */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={<Switch checked={isRequired} onChange={e => setIsRequired(e.target.checked)} disabled={editingField?.isSystem} />}
              label={
                <Box>
                  <Typography variant='body2' fontWeight={600}>Required</Typography>
                  <Typography variant='caption' color='text.secondary'>Users must fill this in</Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={<Switch checked={showInGrid} onChange={e => setShowInGrid(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant='body2' fontWeight={600}>Show in Grid</Typography>
                  <Typography variant='caption' color='text.secondary'>Appears as column in list</Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={<Switch checked={showInCard} onChange={e => setShowInCard(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant='body2' fontWeight={600}>Show on Card</Typography>
                  <Typography variant='caption' color='text.secondary'>Visible on mobile cards</Typography>
                </Box>
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDialog} color='inherit'>Cancel</Button>
          <Button
            variant='contained'
            onClick={handleSave}
            disabled={!fieldLabel.trim() || createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingField ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm Dialog ──────────────────────────────────────── */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} maxWidth='xs'>
        <DialogTitle>Delete Custom Field</DialogTitle>
        <DialogContent>
          <Alert severity='warning' sx={{ mb: 2 }}>
            This will permanently remove this field definition. Existing data stored in this field on records will remain but won't be visible.
          </Alert>
          <Typography variant='body2'>Are you sure you want to delete this field?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)} color='inherit'>Cancel</Button>
          <Button
            variant='contained'
            color='error'
            onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
