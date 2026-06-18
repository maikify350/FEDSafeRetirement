'use client'

import { useRef, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import CustomTextField from '@core/components/mui/TextField'
import AddressAutocomplete from './AddressAutocomplete'
import AddressWeatherDialog from './AddressWeatherDialog'
import { COLORS } from '../theme/designTokens'


export type AddressEntry = {
  id?: string
  addressTypeId: string
  street: string
  street2?: string
  city: string
  stateId: string | null
  zipCode: string
  countryId: string
  isDefault: boolean
}

type LookupItem = { id: string; value: string; label: string; isDefault?: boolean; abbreviation?: string }

/** Returns 'Province' for Canada, 'State' for all others */
const getStateLabel = (countryId: string, countries: LookupItem[]): string => {
  const country = countries.find(c => c.id === countryId)
  const v = country?.value ?? ''
  if (v === 'CA' || v === 'Canada') return 'Province'
  return 'State'
}

/** Returns 'ZIP' for US, 'Postal' for all others */
const getZipLabel = (countryId: string, countries: LookupItem[]): string => {
  const country = countries.find(c => c.id === countryId)
  const v = country?.value ?? ''
  if (v === 'US' || v === 'United States') return 'ZIP'
  return 'Postal'
}

/** Picks the right state/province list based on country ISO code */
const getStatesForCountry = (
  countryId: string,
  countries: LookupItem[],
  usStates: LookupItem[],
  canadianProvinces: LookupItem[],
  mexicanStates: LookupItem[]
): LookupItem[] => {
  const country = countries.find(c => c.id === countryId)
  const v = country?.value ?? ''
  if (v === 'CA' || v === 'Canada') return canadianProvinces
  if (v === 'MX' || v === 'Mexico') return mexicanStates
  return usStates // default: US
}

interface MultiAddressSectionProps {
  addresses: AddressEntry[]
  onChange: (addresses: AddressEntry[]) => void
  addressTypes: LookupItem[]
  usStates: LookupItem[]
  canadianProvinces: LookupItem[]
  mexicanStates: LookupItem[]
  countries: LookupItem[]
}

export default function MultiAddressSection({
  addresses,
  onChange,
  addressTypes,
  usStates,
  canadianProvinces,
  mexicanStates,
  countries
}: MultiAddressSectionProps) {
  // Track the index of the most recently added address for auto-focus + scroll
  const justAddedIndexRef = useRef<number | null>(null)
  const lastAddedRef = useRef<HTMLDivElement | null>(null)
  const [wxDialog, setWxDialog] = useState<{ query: string; label: string } | null>(null)

  useEffect(() => {
    if (justAddedIndexRef.current !== null && lastAddedRef.current) {
      lastAddedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  })

  const openWeather = (address: AddressEntry) => {
    const stateAbbr = usStates.find(s => s.id === address.stateId)?.abbreviation ||
                      usStates.find(s => s.id === address.stateId)?.value || ''
    const parts = [address.street, address.city, stateAbbr, address.zipCode].filter(Boolean)
    if (!parts.length) return
    setWxDialog({
      query: parts.join(' '),
      label: [address.city, stateAbbr].filter(Boolean).join(', ') || address.street || 'Address',
    })
  }

  const handleAdd = () => {
    const newIndex = addresses.length
    justAddedIndexRef.current = newIndex
    // First item gets default type, additional items get "Other"
    const addressTypeId = addresses.length === 0
      ? addressTypes.find(t => t.isDefault)?.id || addressTypes[0]?.id || ''
      : addressTypes.find(t => t.value === 'Other')?.id || addressTypes[0]?.id || ''

    const defaultCountryId = countries.find(c => c.value === 'US')?.id || countries[0]?.id || ''

    onChange([
      ...addresses,
      {
        addressTypeId,
        street: '',
        street2: '',
        city: '',
        stateId: null,
        zipCode: '',
        countryId: defaultCountryId,
        isDefault: addresses.length === 0
      }
    ])
  }

  const handleRemove = (index: number) => {
    const updated = addresses.filter((_, i) => i !== index)
    // If we removed the default, make the first one default
    if (addresses[index].isDefault && updated.length > 0) {
      updated[0].isDefault = true
    }
    onChange(updated)
  }

  const handleChange = (index: number, field: keyof AddressEntry, value: any) => {
    const updated = addresses.map((a, i) => {
      if (i !== index) return a

      // If country changed, clear stateId (state lists are country-specific)
      if (field === 'countryId' && value !== a.countryId) {
        return { ...a, [field]: value, stateId: null }
      }

      return { ...a, [field]: value }
    })
    onChange(updated)
  }

  const handleSetDefault = (index: number) => {
    const updated = addresses.map((a, i) => ({
      ...a,
      isDefault: i === index
    }))
    onChange(updated)
  }

  const handlePlaceSelected = (index: number, place: { street: string; street2: string; city: string; state: string; zipCode: string; country: string }) => {
    // Resolve country first (Google returns 2-letter code like 'US', 'CA', 'MX')
    const countryId = countries.find(c => c.value === place.country)?.id || addresses[index].countryId

    // Pick the right state list for the resolved country
    const stateList = getStatesForCountry(countryId, countries, usStates, canadianProvinces, mexicanStates)

    // Map state abbreviation → state lookup ID
    // Try: exact value match, then abbreviation field match, then label match
    const stateId = (
      stateList.find(s => s.value === place.state) ||
      stateList.find(s => s.abbreviation === place.state) ||
      stateList.find(s => s.label === place.state)
    )?.id || null

    const updated = addresses.map((a, i) =>
      i === index ? {
        ...a,
        street: place.street,
        city: place.city,
        stateId,
        zipCode: place.zipCode,
        countryId
      } : a
    )
    onChange(updated)
  }

  return (
    <Box>
      {/* Section title with pill + Add */}
      <Box className='flex items-center justify-between mb-3'>
        <Typography variant='overline' color='text.secondary'>
          Addresses ({addresses.length})
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

      <AddressWeatherDialog
        open={!!wxDialog}
        onClose={() => setWxDialog(null)}
        query={wxDialog?.query ?? ''}
        label={wxDialog?.label ?? ''}
      />

      {addresses.map((address, index) => (
        <Box
          key={index}
          ref={index === addresses.length - 1 ? lastAddedRef : undefined}
          sx={{ display: 'flex', flexDirection: 'column', gap: '2px', mb: '2px', p: '2px', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
        >
          {/* Header row: star + label + action icons */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconButton
                onClick={() => handleSetDefault(index)}
                sx={{ color: address.isDefault ? COLORS.warning : 'action.disabled', p: '4px', display: 'flex', alignItems: 'center' }}
              >
                <i className={`tabler-star${address.isDefault ? '-filled' : ''} text-[22px]`} />
              </IconButton>
              <Typography variant='caption' color='text.secondary'>
                Address {index + 1}{address.isDefault ? ' · Default' : ''}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconButton onClick={() => openWeather(address)} sx={{ p: '4px', display: 'flex', alignItems: 'center', '&:hover': { bgcolor: 'primary.main', color: 'common.white' } }}>
                <i className='tabler-cloud text-[22px]' />
              </IconButton>
              <IconButton onClick={() => { const p = [address.street, address.street2, address.city, address.zipCode].filter(Boolean); if (p.length) window.open(`https://www.google.com/maps/@?api=1&map_action=map&center=${encodeURIComponent(p.join(', '))}&zoom=18&basemap=satellite`, '_blank') }} sx={{ p: '4px', display: 'flex', alignItems: 'center', '&:hover': { bgcolor: 'primary.main', color: 'common.white' } }}>
                <i className='tabler-world text-[22px]' />
              </IconButton>
              <IconButton onClick={() => { const p = [address.street, address.street2, address.city, address.zipCode].filter(Boolean); if (p.length) window.open(`https://maps.google.com/?q=${encodeURIComponent(p.join(', '))}`, '_blank') }} sx={{ p: '4px', display: 'flex', alignItems: 'center', '&:hover': { bgcolor: 'primary.main', color: 'common.white' } }}>
                <i className='tabler-map-pin text-[22px]' />
              </IconButton>
              <IconButton onClick={() => handleRemove(index)} color='error' sx={{ p: '4px', display: 'flex', alignItems: 'center' }}>
                <i className='tabler-trash text-[22px]' />
              </IconButton>
            </Box>
          </Box>

          {/* Street + Type on same row */}
          <Box sx={{ display: 'flex', gap: '2px' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <AddressAutocomplete
                size='small'
                fullWidth
                label='Street Address'
                value={address.street}
                onChange={value => handleChange(index, 'street', value)}
                onPlaceSelected={place => handlePlaceSelected(index, place)}
                placeholder='Start typing address...'
                autoFocus={justAddedIndexRef.current === index}
              />
            </Box>
            <Box sx={{ width: 110, flexShrink: 0 }}>
              <CustomTextField select size='small' fullWidth label='Type' value={address.addressTypeId} onChange={e => handleChange(index, 'addressTypeId', e.target.value)}>
                {addressTypes.map(type => <MenuItem key={type.id} value={type.id}>{type.label || type.value}</MenuItem>)}
              </CustomTextField>
            </Box>
          </Box>

          {/* Street 2 */}
          <CustomTextField size='small' fullWidth label='Suite / Apt' value={address.street2 || ''} onChange={e => handleChange(index, 'street2', e.target.value)} placeholder='Suite 100' />

          {/* City | State | Zip */}
          <Box sx={{ display: 'flex', gap: '2px' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <CustomTextField size='small' fullWidth label='City' value={address.city} onChange={e => handleChange(index, 'city', e.target.value)} placeholder='Springfield' />
            </Box>
            <Box sx={{ width: 90, flexShrink: 0 }}>
              {(() => {
                const stateList = getStatesForCountry(address.countryId, countries, usStates, canadianProvinces, mexicanStates)
                return (
                  <CustomTextField select size='small' fullWidth label={getStateLabel(address.countryId, countries)} value={address.stateId || ''} onChange={e => handleChange(index, 'stateId', e.target.value || null)}>
                    <MenuItem value=''>—</MenuItem>
                    {stateList.map(state => <MenuItem key={state.id} value={state.id}>{state.abbreviation || state.value || state.label}</MenuItem>)}
                  </CustomTextField>
                )
              })()}
            </Box>
            <Box sx={{ width: 120, flexShrink: 0 }}>
              <CustomTextField size='small' fullWidth label={getZipLabel(address.countryId, countries)} value={address.zipCode} onChange={e => handleChange(index, 'zipCode', e.target.value)} placeholder='20901' />
            </Box>
          </Box>

          {/* Country */}
          <CustomTextField select size='small' fullWidth label='Country' value={address.countryId} onChange={e => handleChange(index, 'countryId', e.target.value)}>
            {countries.map(country => <MenuItem key={country.id} value={country.id}>{country.label || country.value}</MenuItem>)}
          </CustomTextField>
        </Box>
      ))}
    </Box>
  )
}
