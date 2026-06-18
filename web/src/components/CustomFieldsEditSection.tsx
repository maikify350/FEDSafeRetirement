'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControlLabel from '@mui/material/FormControlLabel'
import Chip from '@mui/material/Chip'
import CustomTextField from '@core/components/mui/TextField'
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
  isRequired: boolean
  showInGrid: boolean
  showInCard: boolean
  sortOrder: number
  isActive: boolean
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
  entityType: string
  values: Record<string, any>
  onChange: (values: Record<string, any>) => void
  submitAttempted?: boolean
}

/**
 * Editable form section for user-defined custom fields with dynamic field type rendering.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/components/CustomFieldsEditSection.tsx
 */
export default function CustomFieldsEditSection({ entityType, values, onChange, submitAttempted = false }: Props) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // Quick-add dialog state
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState('text')
  const [newOptions, setNewOptions] = useState<string[]>([])
  const [newOption, setNewOption] = useState('')
  const [newRequired, setNewRequired] = useState(false)
  const [newRegexPattern, setNewRegexPattern] = useState('')
  const [newRegexHint, setNewRegexHint] = useState('')

  // Fetch field definitions
  const { data: fields = [] } = useQuery<CustomFieldDefinition[]>({
    queryKey: ['custom-fields', entityType],
    queryFn: () => api.get(`/api/custom-fields/${entityType}`),
  })

  const activeFields = useMemo(() => fields.filter(f => f.isActive), [fields])

  // Quick-add mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/custom-fields', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', entityType] })
      setAddDialogOpen(false)
      resetAddForm()
    },
  })

  const resetAddForm = () => {
    setNewLabel('')
    setNewType('text')
    setNewOptions([])
    setNewOption('')
    setNewRequired(false)
    setNewRegexPattern('')
    setNewRegexHint('')
  }

  const handleQuickAdd = () => {
    if (!newLabel.trim()) return
    createMutation.mutate({
      entityType,
      fieldLabel: newLabel.trim(),
      fieldType: newType,
      options: newType === 'dropdown' ? newOptions : [],
      isRequired: newRequired,
      regexPattern: newRegexPattern.trim() || null,
      regexHint: newRegexHint.trim() || null,
    })
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    onChange({ ...values, [fieldName]: value })
  }

  // Validation — compute errors per field
  const fieldErrors = useMemo(() => {
    if (!submitAttempted) return {} as Record<string, string>
    const errors: Record<string, string> = {}
    for (const field of activeFields) {
      const val = values[field.fieldName]
      // Required check
      if (field.isRequired) {
        if (field.fieldType === 'boolean') {
          // booleans are always valid (false is a valid value)
        } else if (val === undefined || val === null || val === '') {
          errors[field.fieldName] = `${field.fieldLabel} is required`
          continue
        }
      }
      // Regex check (only for text/textarea with a value)
      if (field.regexPattern && val && typeof val === 'string' && val.trim()) {
        try {
          const re = new RegExp(field.regexPattern)
          if (!re.test(val)) {
            errors[field.fieldName] = field.regexHint || `Does not match required format`
          }
        } catch {
          // Invalid regex in definition — skip validation
        }
      }
    }
    return errors
  }, [submitAttempted, activeFields, values])

  // Don't render at all if no fields defined
  if (activeFields.length === 0 && !addDialogOpen) {
    return (
      <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className='tabler-forms text-base' style={{ color: 'var(--mui-palette-text-secondary)' }} />
            <Typography variant='body2' color='text.secondary'>
              Custom Fields
            </Typography>
          </Box>
          <Button
            size='small'
            variant='outlined'
            startIcon={<i className='tabler-plus text-sm' />}
            onClick={() => setAddDialogOpen(true)}
            sx={{ fontSize: '0.7rem', py: 0.25, textTransform: 'none' }}
          >
            Add Custom Field
          </Button>
        </Box>
        {renderAddDialog()}
      </Box>
    )
  }

  function renderFieldInput(field: CustomFieldDefinition) {
    const value = values[field.fieldName]
    const error = fieldErrors[field.fieldName] || ''

    switch (field.fieldType) {
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={!!value}
                onChange={e => handleFieldChange(field.fieldName, e.target.checked)}
                size='small'
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant='body2'>{field.fieldLabel}</Typography>
                {field.isRequired && <Typography component='span' color='error.main'>*</Typography>}
              </Box>
            }
          />
        )

      case 'dropdown':
        return (
          <CustomTextField
            select
            fullWidth
            label={field.fieldLabel}
            required={field.isRequired}
            value={value || ''}
            onChange={e => handleFieldChange(field.fieldName, e.target.value)}
            error={!!error}
            helperText={error || ' '}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value=''>— Select —</MenuItem>
            {(field.options || []).map(opt => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </CustomTextField>
        )

      case 'date':
        return (
          <CustomTextField
            fullWidth
            type='date'
            label={field.fieldLabel}
            required={field.isRequired}
            value={value || ''}
            onChange={e => handleFieldChange(field.fieldName, e.target.value)}
            error={!!error}
            helperText={error || ' '}
            InputLabelProps={{ shrink: true }}
          />
        )

      case 'number':
        return (
          <CustomTextField
            fullWidth
            type='number'
            label={field.fieldLabel}
            required={field.isRequired}
            value={value ?? ''}
            onChange={e => handleFieldChange(field.fieldName, e.target.value ? Number(e.target.value) : '')}
            placeholder={field.placeholder || undefined}
            error={!!error}
            helperText={error || ' '}
          />
        )

      case 'textarea':
        return (
          <CustomTextField
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            label={field.fieldLabel}
            required={field.isRequired}
            value={value || ''}
            onChange={e => handleFieldChange(field.fieldName, e.target.value)}
            placeholder={field.placeholder || undefined}
            error={!!error}
            helperText={error || (field.regexPattern ? field.regexHint || '' : ' ')}
            inputProps={{ maxLength: field.maxLength || undefined }}
          />
        )

      // text, email, phone, url — all text inputs
      default:
        return (
          <CustomTextField
            fullWidth
            type={field.fieldType === 'email' ? 'email' : field.fieldType === 'url' ? 'url' : 'text'}
            label={field.fieldLabel}
            required={field.isRequired}
            value={value || ''}
            onChange={e => handleFieldChange(field.fieldName, e.target.value)}
            placeholder={field.placeholder || undefined}
            error={!!error}
            helperText={error || (field.regexPattern ? field.regexHint || '' : ' ')}
            inputProps={{ maxLength: field.maxLength || undefined }}
          />
        )
    }
  }

  function renderAddDialog() {
    return (
      <Dialog open={addDialogOpen} onClose={() => { setAddDialogOpen(false); resetAddForm() }} maxWidth='xs' fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className='tabler-forms text-xl' style={{ color: 'var(--mui-palette-primary-main)' }} />
            New Custom Field
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }}>
          <CustomTextField
            fullWidth
            label='Field Label'
            required
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder='e.g. PO Number, Gate Code'
            autoFocus
          />
          <CustomTextField
            select
            fullWidth
            label='Field Type'
            value={newType}
            onChange={e => setNewType(e.target.value)}
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

          {/* Dropdown options */}
          {newType === 'dropdown' && (
            <Box>
              <Typography variant='body2' fontWeight={600} sx={{ mb: 0.5 }}>Options</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {newOptions.map(opt => (
                  <Chip key={opt} label={opt} size='small' onDelete={() => setNewOptions(newOptions.filter(o => o !== opt))} sx={{ borderRadius: '8px' }} />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <CustomTextField
                  fullWidth size='small' placeholder='Add option...'
                  value={newOption}
                  onChange={e => setNewOption(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newOption.trim()) {
                      e.preventDefault()
                      if (!newOptions.includes(newOption.trim())) setNewOptions([...newOptions, newOption.trim()])
                      setNewOption('')
                    }
                  }}
                />
                <Button variant='outlined' size='small' onClick={() => {
                  if (newOption.trim() && !newOptions.includes(newOption.trim())) {
                    setNewOptions([...newOptions, newOption.trim()])
                    setNewOption('')
                  }
                }} disabled={!newOption.trim()}>Add</Button>
              </Box>
            </Box>
          )}

          {/* Regex for text */}
          {(newType === 'text' || newType === 'textarea') && (
            <>
              <CustomTextField
                fullWidth
                label='Regex Pattern'
                value={newRegexPattern}
                onChange={e => setNewRegexPattern(e.target.value)}
                placeholder='e.g. ^[A-Z]{2}-\d{4}$'
                helperText='Optional validation pattern'
              />
              {newRegexPattern && (
                <CustomTextField
                  fullWidth
                  label='Validation Hint'
                  value={newRegexHint}
                  onChange={e => setNewRegexHint(e.target.value)}
                  placeholder='e.g. Must match XX-1234'
                  helperText='Shown when validation fails'
                />
              )}
            </>
          )}

          <FormControlLabel
            control={<Switch checked={newRequired} onChange={e => setNewRequired(e.target.checked)} size='small' />}
            label={<Typography variant='body2'>Required field</Typography>}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => { setAddDialogOpen(false); resetAddForm() }} color='inherit' size='small'>Cancel</Button>
          <Button
            variant='contained'
            size='small'
            onClick={handleQuickAdd}
            disabled={!newLabel.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Custom Field'}
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  return (
    <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
      <Accordion
        expanded={expanded}
        onChange={(_, isExpanded) => setExpanded(isExpanded)}
        disableGutters
        elevation={0}
        sx={{
          bgcolor: 'transparent',
          '&:before': { display: 'none' },
          '&.Mui-expanded': { margin: 0 },
        }}
      >
        <AccordionSummary
          expandIcon={<i className='tabler-chevron-down text-base' />}
          sx={{
            minHeight: 36,
            px: 2,
            '&.Mui-expanded': { minHeight: 36 },
            '& .MuiAccordionSummary-content': {
              margin: '6px 0',
              '&.Mui-expanded': { margin: '6px 0' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className='tabler-forms text-base' style={{ color: 'var(--mui-palette-primary-main)' }} />
            <Typography variant='body2' fontWeight={600}>
              Custom Fields
            </Typography>
            {activeFields.length > 0 && (
              <Typography variant='caption' color='text.secondary'>({activeFields.length})</Typography>
            )}
          </Box>
          <Button
            size='small'
            variant='outlined'
            startIcon={<i className='tabler-plus text-sm' />}
            onClick={e => { e.stopPropagation(); setAddDialogOpen(true) }}
            sx={{ fontSize: '0.7rem', py: 0.25, mr: 1, textTransform: 'none' }}
          >
            Add Custom Field
          </Button>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2, pt: 0, pb: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {activeFields.map(field => (
              <Box key={field.id}>
                {renderFieldInput(field)}
              </Box>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      {renderAddDialog()}
    </Box>
  )
}
