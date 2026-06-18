'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { toast } from 'react-toastify'
import type { Company } from '@shared/contracts'
import { api } from '@/lib/api'

/**
 * Fleet management configuration editor (usage units, fuel units, measurement system).
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/configuration/FleetConfigEditor.tsx
 */
export default function FleetConfigEditor() {
  const qc = useQueryClient()

  // Fetch company data
  const { data: company, isLoading, error } = useQuery<Company>({
    queryKey: ['company'],
    queryFn: () => api.get('/api/company'),
    staleTime: 0,
  })

  // Local state for form fields
  const [usageUnit, setUsageUnit] = useState<'miles' | 'kilometers' | 'hours'>('miles')
  const [fuelVolumeUnit, setFuelVolumeUnit] = useState<'gallons_us' | 'gallons_uk' | 'liters'>('gallons_us')
  const [measurementSystem, setMeasurementSystem] = useState<'imperial' | 'metric'>('imperial')
  const [vehicleLabel, setVehicleLabel] = useState<'vehicle' | 'asset'>('vehicle')
  const [taxFreeLabor, setTaxFreeLabor] = useState(false)
  const [requiredFields, setRequiredFields] = useState<string[]>(['vehicleTypeId']) // name and vehicleTypeId are always required

  // Sync company data to local state
  useEffect(() => {
    if (company) {
      setUsageUnit(company.fleetDefaultUsageUnit || 'miles')
      setFuelVolumeUnit(company.fleetDefaultFuelVolumeUnit || 'gallons_us')
      setMeasurementSystem(company.fleetDefaultMeasurementSystem || 'imperial')
      setVehicleLabel(company.fleetVehicleSystemLabel || 'vehicle')
      setTaxFreeLabor(company.fleetTaxFreeLabor ?? false)
      setRequiredFields(company.fleetRequiredFields || ['vehicleTypeId'])
    }
  }, [company])

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Company>) => api.patch('/api/company', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company'] })
      toast.success('Fleet settings saved')
    },
    onError: () => toast.error('Failed to save fleet settings'),
  })

  // Auto-save on change
  const handleUpdate = (field: string, value: any) => {
    updateMutation.mutate({ [field]: value })
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !company) {
    return (
      <Alert severity='error' sx={{ m: 2 }}>
        Failed to load company settings. Please create a company record first.
      </Alert>
    )
  }

  return (
    <Box sx={{ maxWidth: 680 }}>
      <Typography variant='h6' fontWeight={700} sx={{ mb: 2 }}>
        General Settings
      </Typography>

      <Card>
        <CardContent sx={{ p: 3 }}>
          {/* Usage Unit */}
          <FormControl component='fieldset' sx={{ mb: 3 }}>
            <FormLabel component='legend' sx={{ fontWeight: 600, mb: 1 }}>
              Usage
            </FormLabel>
            <RadioGroup
              value={usageUnit}
              onChange={(e) => {
                const value = e.target.value as 'miles' | 'kilometers' | 'hours'
                setUsageUnit(value)
                handleUpdate('fleetDefaultUsageUnit', value)
              }}
            >
              <FormControlLabel value='miles' control={<Radio />} label='Miles' />
              <FormControlLabel value='kilometers' control={<Radio />} label='Kilometers' />
              <FormControlLabel value='hours' control={<Radio />} label='Hours' />
            </RadioGroup>
            <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5 }}>
              New vehicles will have this usage unit selected by default.
            </Typography>
          </FormControl>

          <Divider sx={{ my: 3 }} />

          {/* Fuel Volume */}
          <FormControl component='fieldset' sx={{ mb: 3 }}>
            <FormLabel component='legend' sx={{ fontWeight: 600, mb: 1 }}>
              Fuel volume
            </FormLabel>
            <RadioGroup
              value={fuelVolumeUnit}
              onChange={(e) => {
                const value = e.target.value as 'gallons_us' | 'gallons_uk' | 'liters'
                setFuelVolumeUnit(value)
                handleUpdate('fleetDefaultFuelVolumeUnit', value)
              }}
            >
              <FormControlLabel value='gallons_us' control={<Radio />} label='Gallons (US)' />
              <FormControlLabel value='gallons_uk' control={<Radio />} label='Gallons (UK)' />
              <FormControlLabel value='liters' control={<Radio />} label='Liters' />
            </RadioGroup>
            <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5 }}>
              New vehicles will have this volume unit selected by default.
            </Typography>
          </FormControl>

          <Divider sx={{ my: 3 }} />

          {/* System of Measurement */}
          <FormControl component='fieldset' sx={{ mb: 3 }}>
            <FormLabel component='legend' sx={{ fontWeight: 600, mb: 1 }}>
              System of Measurement
            </FormLabel>
            <RadioGroup
              value={measurementSystem}
              onChange={(e) => {
                const value = e.target.value as 'imperial' | 'metric'
                setMeasurementSystem(value)
                handleUpdate('fleetDefaultMeasurementSystem', value)
              }}
            >
              <FormControlLabel value='imperial' control={<Radio />} label='Imperial' />
              <FormControlLabel value='metric' control={<Radio />} label='Metric' />
            </RadioGroup>
            <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5 }}>
              New vehicles will use this system of measurement by default.
            </Typography>
          </FormControl>

          <Divider sx={{ my: 3 }} />

          {/* Vehicle System Label */}
          <FormControl component='fieldset' sx={{ mb: 3 }}>
            <FormLabel component='legend' sx={{ fontWeight: 600, mb: 1 }}>
              Vehicle System Label
            </FormLabel>
            <RadioGroup
              value={vehicleLabel}
              onChange={(e) => {
                const value = e.target.value as 'vehicle' | 'asset'
                setVehicleLabel(value)
                handleUpdate('fleetVehicleSystemLabel', value)
              }}
            >
              <FormControlLabel value='vehicle' control={<Radio />} label='Vehicle' />
              <FormControlLabel value='asset' control={<Radio />} label='Asset' />
            </RadioGroup>
            <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5 }}>
              Used to adjust the terminology used in the fleet system. For example, changing this to
              &quot;Asset&quot; will change all references to &quot;Vehicle&quot; to &quot;Asset&quot;.
            </Typography>
          </FormControl>
        </CardContent>
      </Card>

      {/* Tax Settings */}
      <Typography variant='h6' fontWeight={700} sx={{ mt: 4, mb: 2 }}>
        Tax Settings
      </Typography>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={taxFreeLabor}
                onChange={(e) => {
                  setTaxFreeLabor(e.target.checked)
                  handleUpdate('fleetTaxFreeLabor', e.target.checked)
                }}
              />
            }
            label='Tax Free Labor'
          />
        </CardContent>
      </Card>

      {/* Required Fields */}
      <Typography variant='h6' fontWeight={700} sx={{ mt: 4, mb: 2 }}>
        Required Fields
      </Typography>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            Select which fields are mandatory when creating or editing vehicles.
            Name and Vehicle Type are always required and cannot be disabled.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={<Checkbox checked disabled />}
              label='Name (always required)'
            />
            <FormControlLabel
              control={<Checkbox checked disabled />}
              label='Vehicle Type (always required)'
            />
            {[
              { field: 'vin', label: 'VIN / Serial Number' },
              { field: 'licensePlate', label: 'License Plate' },
              { field: 'year', label: 'Year' },
              { field: 'makeId', label: 'Make' },
              { field: 'model', label: 'Model' },
              { field: 'statusId', label: 'Status' },
              { field: 'assignedTo', label: 'Assigned To' },
              { field: 'inServiceDate', label: 'In-Service Date' },
            ].map(({ field, label }) => (
              <FormControlLabel
                key={field}
                control={
                  <Checkbox
                    checked={requiredFields.includes(field)}
                    onChange={(e) => {
                      const newFields = e.target.checked
                        ? [...requiredFields, field]
                        : requiredFields.filter(f => f !== field)
                      setRequiredFields(newFields)
                      handleUpdate('fleetRequiredFields', newFields)
                    }}
                  />
                }
                label={label}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      <Typography variant='caption' color='text.disabled' sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
        Changes are saved automatically
      </Typography>
    </Box>
  )
}
