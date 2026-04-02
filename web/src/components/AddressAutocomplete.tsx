'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import MuiAutocomplete from '@mui/material/Autocomplete'
import CircularProgress from '@mui/material/CircularProgress'
import CustomTextField from '@core/components/mui/TextField'

type Prediction = {
  place_id: string
  description: string
}

type PlaceResult = {
  street: string
  street2: string
  city: string
  state: string   // abbreviation: "MD", "CA"
  zipCode: string
  country: string // code: "US", "CA"
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelected: (place: PlaceResult) => void
  label?: string
  placeholder?: string
  size?: 'small' | 'medium'
  fullWidth?: boolean
  autoFocus?: boolean
  sx?: Record<string, any>
}

/**
 * Detects if input looks like a PO Box address.
 * Matches: "PO BOX", "P.O. BOX", "P O BOX", "POBOX", "POST OFFICE BOX"
 */
function isPOBox(input: string): boolean {
  const normalized = input.trim().toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ')
  return (
    normalized.startsWith('PO BOX') ||
    normalized.startsWith('P O BOX') ||
    normalized.startsWith('POBOX') ||
    normalized.startsWith('POST OFFICE BOX')
  )
}

/**
 * Address autocomplete using Google Places REST API (via server-side proxy).
 * No Google Maps JavaScript SDK required — avoids HTTP referrer key restrictions.
 *
 * Flow:
 *   user types → debounce 300ms → GET /api/places/autocomplete?input=...
 *             → user picks suggestion → GET /api/places/details?placeId=...
 *             → onPlaceSelected(parsedAddress)
 *
 * PO Box handling: Autocomplete is disabled for PO Box addresses (manual entry only)
 */
export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  label = 'Street Address',
  placeholder = '123 Main St',
  size = 'small',
  fullWidth = true,
  autoFocus = false,
  sx: sxProp
}: AddressAutocompleteProps) {
  const [options, setOptions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [isPOBoxDetected, setIsPOBoxDetected] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep inputValue in sync when parent value changes (e.g. after place selected)
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Auto-focus when prop set (new address block added)
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [autoFocus])

  const fetchSuggestions = useCallback((input: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    // Detect PO Box — disable autocomplete for manual entry
    const poBoxDetected = isPOBox(input)
    setIsPOBoxDetected(poBoxDetected)

    if (input.length < 3 || poBoxDetected) {
      setOptions([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`)
        const data = await res.json()
        setOptions(data.predictions ?? [])
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  const handleSelect = useCallback(async (prediction: Prediction | null) => {
    if (!prediction) return
    // Update the text field immediately with the selected description
    onChange(prediction.description)
    setInputValue(prediction.description)
    setOptions([])

    // Fetch full address details
    try {
      const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(prediction.place_id)}`)
      const place: PlaceResult = await res.json()
      // Override street with the short form (e.g. "123 Main St" not full description)
      if (place.street) onChange(place.street)
      setInputValue(place.street || prediction.description)
      onPlaceSelected(place)
    } catch {
      // If details fail, still keep the typed text — don't lose what user selected
    }
  }, [onChange, onPlaceSelected])

  return (
    <MuiAutocomplete
      freeSolo
      filterOptions={x => x} // server-side filtering — disable client-side filter
      options={options}
      getOptionLabel={(option) =>
        typeof option === 'string' ? option : option.description
      }
      inputValue={inputValue}
      onInputChange={(_, newInput, reason) => {
        if (reason === 'input') {
          setInputValue(newInput)
          onChange(newInput)
          fetchSuggestions(newInput)
        }
      }}
      onChange={(_, newValue) => {
        if (newValue && typeof newValue !== 'string') {
          handleSelect(newValue as Prediction)
        }
      }}
      loading={loading}
      noOptionsText={
        isPOBoxDetected
          ? 'PO Box detected — autocomplete disabled (manual entry)'
          : inputValue.length >= 3
            ? 'No addresses found'
            : 'Type to search...'
      }
      renderInput={(params) => (
        <CustomTextField
          {...params}
          inputRef={inputRef}
          size={size}
          fullWidth={fullWidth}
          label={label}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading && <CircularProgress size={14} sx={{ mr: 1 }} />}
                {params.InputProps.endAdornment}
              </>
            ),
            autoComplete: 'new-password',
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.place_id}>
          <i className='tabler-map-pin text-textSecondary text-[16px] mr-2 flex-shrink-0' />
          {option.description}
        </li>
      )}
      sx={{ width: fullWidth ? '100%' : undefined, ...sxProp }}
    />
  )
}
