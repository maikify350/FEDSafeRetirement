'use client'

import { useRef, useEffect } from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import CustomTextField from '@core/components/mui/TextField'
import { COLORS } from '../theme/designTokens'


export type EmailEntry = {
  id?: string
  address: string
  typeId: string
  customLabel?: string
  isDefault: boolean
}

type LookupItem = { id: string; value: string; label: string; isDefault?: boolean }

interface MultiEmailSectionProps {
  emails: EmailEntry[]
  onChange: (emails: EmailEntry[]) => void
  emailTypes: LookupItem[]
  /** When true, prevents deleting the last email entry (minimum children rule) */
  minRequired?: number
}

export default function MultiEmailSection({ emails, onChange, emailTypes, minRequired = 0 }: MultiEmailSectionProps) {
  const lastAddedRef = useRef<HTMLDivElement | null>(null)
  const justAddedRef = useRef(false)

  useEffect(() => {
    if (justAddedRef.current && lastAddedRef.current) {
      lastAddedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      justAddedRef.current = false
    }
  })

  const handleAdd = () => {
    justAddedRef.current = true
    // First item gets default type, additional items get "Other"
    const typeId = emails.length === 0
      ? emailTypes.find(t => t.isDefault)?.id || emailTypes[0]?.id || ''
      : emailTypes.find(t => t.value === 'Other')?.id || emailTypes[0]?.id || ''

    onChange([
      ...emails,
      { address: '', typeId, isDefault: emails.length === 0 }
    ])
  }

  const handleRemove = (index: number) => {
    // Cannot delete if at or below minimum required
    if (minRequired > 0 && emails.length <= minRequired) return

    const updated = emails.filter((_, i) => i !== index)
    // If we removed the default, make the first one default
    if (emails[index].isDefault && updated.length > 0) {
      updated[0].isDefault = true
    }
    onChange(updated)
  }

  const handleChange = (index: number, field: keyof EmailEntry, value: any) => {
    const updated = emails.map((e, i) =>
      i === index ? { ...e, [field]: value } : e
    )
    onChange(updated)
  }

  const handleSetDefault = (index: number) => {
    const updated = emails.map((e, i) => ({
      ...e,
      isDefault: i === index
    }))
    onChange(updated)
  }

  return (
    <Box>
      {/* Section title with pill + Add */}
      <Box className='flex items-center justify-between mb-3'>
        <Typography variant='overline' color='text.secondary'>
          Email Addresses ({emails.length})
        </Typography>
        <Chip
          label='+ Add'
          size='small'
          onClick={handleAdd}
          sx={{
            borderRadius: '999px',
            bgcolor: 'primary.lighter',
            color: 'primary.main',
            fontWeight: 600,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'primary.light' }
          }}
        />
      </Box>

      {emails.map((email, index) => {
        const selectedType = emailTypes.find(t => t.id === email.typeId)
        const showCustomLabel = selectedType?.value === 'Other'

        return (
          <Box
            key={index}
            ref={index === emails.length - 1 ? lastAddedRef : undefined}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              mb: '2px',
              p: '2px',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            {/* Star — default toggle */}
            <IconButton
              size='small'
              onClick={() => handleSetDefault(index)}
              sx={{ color: email.isDefault ? COLORS.warning : 'action.disabled', p: '2px', flexShrink: 0 }}
            >
              <i className={`tabler-star${email.isDefault ? '-filled' : ''} text-base`} />
            </IconButton>

            {/* Mail icon */}
            <Box sx={{ color: 'text.secondary', flexShrink: 0, lineHeight: 1, pt: '4px' }}>
              <i className='tabler-mail text-base' />
            </Box>

            {/* Email address — flex 1 */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <CustomTextField
                fullWidth
                size='small'
                type='email'
                label='Email'
                value={email.address}
                onChange={e => handleChange(index, 'address', e.target.value)}
                placeholder='john@example.com'
                autoFocus={justAddedRef.current && index === emails.length - 1}
              />
            </Box>

            {/* Type select — fixed width */}
            <Box sx={{ width: 110, flexShrink: 0 }}>
              <CustomTextField
                select
                fullWidth
                size='small'
                label='Type'
                value={email.typeId}
                onChange={e => handleChange(index, 'typeId', e.target.value)}
              >
                {emailTypes.map(type => (
                  <MenuItem key={type.id} value={type.id}>{type.label || type.value}</MenuItem>
                ))}
              </CustomTextField>
            </Box>

            {/* Trash — disabled when at minimum required */}
            <IconButton
              onClick={() => handleRemove(index)}
              color='error'
              disabled={minRequired > 0 && emails.length <= minRequired}
              sx={{ p: 1, flexShrink: 0, alignSelf: 'center' }}
              title={minRequired > 0 && emails.length <= minRequired ? `Cannot delete — at least ${minRequired} email address required` : 'Remove'}
            >
              <i className='tabler-trash text-[22px]' />
            </IconButton>
          </Box>
        )
      })}
    </Box>
  )
}
