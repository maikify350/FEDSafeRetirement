'use client'

import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import { toast } from 'react-toastify'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────
interface AddressFieldsConfig {
  street: boolean
  street2: boolean
  city: boolean
  state: boolean
  zipCode: boolean
  country: boolean
}

interface CompanyData {
  id: string
  addressFieldsConfig: AddressFieldsConfig | null
}

// ─── Default Config ──────────────────────────────────────────────────────────
const DEFAULT_CONFIG: AddressFieldsConfig = {
  street: true,      // Street address is required by default
  street2: false,    // Apt/Suite is optional
  city: true,        // City is required by default
  state: true,       // State/Province is required by default
  zipCode: true,     // ZIP/Postal code is required by default
  country: false,    // Country defaults to US, not required
}

// ─── Field Labels ────────────────────────────────────────────────────────────
const FIELD_LABELS: Record<keyof AddressFieldsConfig, { label: string; description: string }> = {
  street: { label: 'Street Address', description: 'Main address line (e.g., 123 Main St)' },
  street2: { label: 'Street Address 2', description: 'Apt, Suite, Unit, etc.' },
  city: { label: 'City', description: 'City name' },
  state: { label: 'State / Province', description: 'State or province' },
  zipCode: { label: 'ZIP / Postal Code', description: 'ZIP or postal code' },
  country: { label: 'Country', description: 'Country (defaults to US)' },
}

// ─── Component ───────────────────────────────────────────────────────────────
/**
 * Reusable address form fields editor (street, city, state, zip, country) with validation.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/configuration/AddressFieldsEditor.tsx
 */
export default function AddressFieldsEditor() {
  const queryClient = useQueryClient()
  const [config, setConfig] = useState<AddressFieldsConfig>(DEFAULT_CONFIG)
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch company data
  const { data: companyData, isLoading } = useQuery<CompanyData>({
    queryKey: ['company'],
    queryFn: async () => {
      const res = await api.get('/api/company')
      return res[0] // Company endpoint returns array with single item
    }
  })

  // Initialize config from company data
  useEffect(() => {
    if (companyData?.addressFieldsConfig) {
      setConfig(companyData.addressFieldsConfig)
    } else {
      setConfig(DEFAULT_CONFIG)
    }
    setHasChanges(false)
  }, [companyData])

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (newConfig: AddressFieldsConfig) => {
      if (!companyData?.id) throw new Error('Company ID not found')
      return api.patch(`/api/company/${companyData.id}`, {
        addressFieldsConfig: newConfig
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] })
      toast.success('Address fields configuration updated')
      setHasChanges(false)
    },
    onError: (error) => {
      console.error('Failed to update address fields config:', error)
      toast.error('Failed to update configuration')
    }
  })

  const handleToggle = (field: keyof AddressFieldsConfig) => {
    const newConfig = { ...config, [field]: !config[field] }
    setConfig(newConfig)
    setHasChanges(true)
    // Auto-save on toggle
    updateMutation.mutate(newConfig)
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
        Configure which address fields are required when entering addresses for clients, vendors, and jobs.
        Required fields will be marked with a red asterisk (*) in forms.
      </Typography>

      <Stack spacing={0} divider={<Divider />}>
        {(Object.keys(FIELD_LABELS) as Array<keyof AddressFieldsConfig>).map((field) => (
          <Box
            key={field}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2,
              px: 1.5,
              '&:hover': { bgcolor: 'action.hover' },
              borderRadius: 1,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant='body1' fontWeight={500}>
                {FIELD_LABELS[field].label}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {FIELD_LABELS[field].description}
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={config[field]}
                  onChange={() => handleToggle(field)}
                  disabled={updateMutation.isPending}
                  color='primary'
                />
              }
              label={config[field] ? 'Required' : 'Optional'}
              labelPlacement='start'
              sx={{
                ml: 2,
                mr: 0,
                '& .MuiFormControlLabel-label': {
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: config[field] ? 'primary.main' : 'text.secondary',
                  minWidth: 70,
                  textAlign: 'right',
                },
              }}
            />
          </Box>
        ))}
      </Stack>

      <Typography variant='caption' color='text.disabled' sx={{ mt: 3, display: 'block', textAlign: 'center' }}>
        Changes are saved automatically
      </Typography>
    </Box>
  )
}
