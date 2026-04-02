'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Chip from '@mui/material/Chip'
import { api } from '@/lib/api'

interface CustomFieldDefinition {
  id: string
  fieldName: string
  fieldLabel: string
  fieldType: string
  options: string[]
  isActive: boolean
  sortOrder: number
}

interface Props {
  entityType: string
  customFields?: Record<string, any> | null
}

/**
 * Read-only display section for user-defined custom fields on an entity detail view.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/components/CustomFieldsDisplaySection.tsx
 */
export default function CustomFieldsDisplaySection({ entityType, customFields }: Props) {
  // Fetch field definitions to get labels and types
  const { data: fields = [] } = useQuery<CustomFieldDefinition[]>({
    queryKey: ['custom-fields', entityType],
    queryFn: () => api.get(`/api/custom-fields/${entityType}`),
  })

  const activeFields = useMemo(() => fields.filter(f => f.isActive), [fields])

  // Only show fields that have a value stored
  const fieldsWithValues = useMemo(() => {
    if (!customFields || !activeFields.length) return []
    return activeFields.filter(f => {
      const val = customFields[f.fieldName]
      return val !== undefined && val !== null && val !== ''
    })
  }, [activeFields, customFields])

  // Don't render if nothing to show
  if (fieldsWithValues.length === 0) return null

  function formatValue(field: CustomFieldDefinition, value: any): string {
    switch (field.fieldType) {
      case 'boolean':
        return value ? 'Yes' : 'No'
      case 'date':
        if (!value) return '—'
        try {
          return new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          })
        } catch {
          return value
        }
      case 'number':
        return value?.toString() || '—'
      default:
        return value?.toString() || '—'
    }
  }

  return (
    <Accordion
      defaultExpanded
      disableGutters
      elevation={0}
      sx={{
        bgcolor: 'transparent',
        '&:before': { display: 'none' },
        '&.Mui-expanded': { margin: 0 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px !important',
        overflow: 'hidden',
        mb: 1.5,
      }}
    >
      <AccordionSummary
        expandIcon={<i className='tabler-chevron-down text-base' />}
        sx={{
          minHeight: 36,
          px: 2,
          bgcolor: 'action.hover',
          '&.Mui-expanded': { minHeight: 36 },
          '& .MuiAccordionSummary-content': {
            margin: '6px 0',
            '&.Mui-expanded': { margin: '6px 0' },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className='tabler-forms text-base' style={{ color: 'var(--mui-palette-primary-main)' }} />
          <Typography variant='body2' fontWeight={600}>Custom Fields</Typography>
          <Chip label={fieldsWithValues.length} size='small' sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, py: 1.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {fieldsWithValues.map(field => {
            const value = customFields![field.fieldName]
            return (
              <Box
                key={field.id}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  py: 0.5,
                  '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider', pb: 1 },
                }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ minWidth: 120, flexShrink: 0, fontWeight: 500, pt: 0.25 }}
                >
                  {field.fieldLabel}:
                </Typography>
                <Typography variant='body2' fontWeight={500} sx={{ wordBreak: 'break-word' }}>
                  {field.fieldType === 'url' && value ? (
                    <a
                      href={value.startsWith('http') ? value : `https://${value}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      style={{ color: 'var(--mui-palette-primary-main)', textDecoration: 'none' }}
                    >
                      {value}
                    </a>
                  ) : field.fieldType === 'email' && value ? (
                    <a
                      href={`mailto:${value}`}
                      style={{ color: 'var(--mui-palette-primary-main)', textDecoration: 'none' }}
                    >
                      {value}
                    </a>
                  ) : field.fieldType === 'phone' && value ? (
                    <a
                      href={`tel:${value}`}
                      style={{ color: 'var(--mui-palette-primary-main)', textDecoration: 'none' }}
                    >
                      {value}
                    </a>
                  ) : field.fieldType === 'boolean' ? (
                    <Chip
                      label={value ? 'Yes' : 'No'}
                      size='small'
                      color={value ? 'success' : 'default'}
                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                    />
                  ) : (
                    formatValue(field, value)
                  )}
                </Typography>
              </Box>
            )
          })}
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}
