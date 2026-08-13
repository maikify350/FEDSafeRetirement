'use client'

import { useRef, useEffect } from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import CustomTextField from '@core/components/mui/TextField'
import { COLORS } from '../theme/designTokens'


export type PhoneEntry = {
  id?: string // UUID for existing, undefined for new
  number: string
  typeId: string // UUID reference to phone type lookup
  customLabel?: string
  isDefault: boolean
}

type LookupItem = { id: string; value: string; label: string; isDefault?: boolean }

interface MultiPhoneSectionProps {
  phones: PhoneEntry[]
  onChange: (phones: PhoneEntry[]) => void
  phoneTypes: LookupItem[]
  /** When true, prevents deleting the last phone entry (minimum children rule) */
  minRequired?: number
}

export default function MultiPhoneSection({ phones, onChange, phoneTypes, minRequired = 0 }: MultiPhoneSectionProps) {
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
    const typeId = phones.length === 0
      ? phoneTypes.find(t => t.isDefault)?.id || phoneTypes[0]?.id || ''
      : phoneTypes.find(t => t.value === 'Other')?.id || phoneTypes[0]?.id || ''

    onChange([
      ...phones,
      { number: '', typeId, isDefault: phones.length === 0 }
    ])
  }

  const handleRemove = (index: number) => {
    // Cannot delete if at or below minimum required
    if (minRequired > 0 && phones.length <= minRequired) return

    const updated = phones.filter((_, i) => i !== index)
    // If we removed the default, make the first one default
    if (phones[index].isDefault && updated.length > 0) {
      updated[0].isDefault = true
    }
    onChange(updated)
  }

  const handleChange = (index: number, field: keyof PhoneEntry, value: any) => {
    const updated = phones.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    )
    onChange(updated)
  }

  const handleSetDefault = (index: number) => {
    const updated = phones.map((p, i) => ({
      ...p,
      isDefault: i === index
    }))
    onChange(updated)
  }

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  return (
    <Box>
      {/* Section title with pill + Add */}
      <Box className='flex items-center justify-between mb-3'>
        <Typography variant='overline' color='text.secondary'>
          Phone Numbers ({phones.length})
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

      {phones.map((phone, index) => {
        const selectedType = phoneTypes.find(t => t.id === phone.typeId)
        const showCustomLabel = selectedType?.value === 'Other'

        return (
          <Box
            key={index}
            ref={index === phones.length - 1 ? lastAddedRef : undefined}
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
              sx={{ color: phone.isDefault ? COLORS.warning : 'action.disabled', p: '2px', flexShrink: 0 }}
            >
              <i className={`tabler-star${phone.isDefault ? '-filled' : ''} text-base`} />
            </IconButton>

            {/* Phone icon */}
            <Box sx={{ color: 'text.secondary', flexShrink: 0, lineHeight: 1, pt: '4px' }}>
              <i className='tabler-phone text-base' />
            </Box>

            {/* Phone number — flex 1 */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Number'
                value={phone.number}
                onChange={e => handleChange(index, 'number', e.target.value)}
                onBlur={e => handleChange(index, 'number', formatPhoneNumber(e.target.value))}
                placeholder='(301) 555-0100'
                autoFocus={justAddedRef.current && index === phones.length - 1}
              />
            </Box>

            {/* Type select — fixed width */}
            <Box sx={{ width: 110, flexShrink: 0 }}>
              <CustomTextField
                select
                fullWidth
                size='small'
                label='Type'
                value={phone.typeId}
                onChange={e => handleChange(index, 'typeId', e.target.value)}
              >
                {phoneTypes.map(type => (
                  <MenuItem key={type.id} value={type.id}>{type.label || type.value}</MenuItem>
                ))}
              </CustomTextField>
            </Box>

            {/* Trash — disabled when at minimum required */}
            <IconButton
              onClick={() => handleRemove(index)}
              color='error'
              disabled={minRequired > 0 && phones.length <= minRequired}
              sx={{ p: 1, flexShrink: 0, alignSelf: 'center' }}
              title={minRequired > 0 && phones.length <= minRequired ? `Cannot delete — at least ${minRequired} phone number required` : 'Remove'}
            >
              <i className='tabler-trash text-[22px]' />
            </IconButton>
          </Box>
        )
      })}
    </Box>
  )
}
