'use client'

/**
 * LeadEditDialog — Lead-specific edit form using the global EntityEditDialog shell.
 *
 * This component only provides the form fields.
 * The dialog shell (draggable, header, footer, save/cancel) comes from EntityEditDialog.
 */

import { useState, useEffect } from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CustomTextField from '@core/components/mui/TextField'
import EntityEditDialog from '@/components/EntityEditDialog'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import FacilityMapDialog from '@/components/FacilityMapDialog'

// Required field label with bold red asterisk
const RequiredLabel = ({ children }: { children: string }) => (
  <span>{children}<span style={{ color: '#ef4444', fontWeight: 700, marginLeft: 2 }}>*</span></span>
)

// ── Types ───────────────────────────────────────────────────────────────────
interface Lead {
  id: string
  first_name: string
  last_name: string
  middle_initial: string | null
  occupation_title: string | null
  grade_level: string | null
  annual_salary: number | null
  hourly_rate: number | null
  facility_name: string | null
  facility_address: string | null
  facility_city: string | null
  facility_state: string | null
  facility_zip_code: string | null
  entered_on_duty_date: string | null
  years_of_service: number | null
  gender: string | null
  date_of_birth: string | null
  source_file: string | null
  is_favorite: boolean
  personal_address: string | null
  personal_city: string | null
  personal_state: string | null
  personal_zip: string | null
  personal_email: string | null
  personal_phone: string | null
  cre_dt: string | null
  cre_by: string | null
  mod_by: string | null
  mod_dt: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  lead: Lead | null
  onSaved?: (updated: Lead) => void
}

// ── Section Header ──────────────────────────────────────────────────────────
const SectionHeader = ({ icon, children, action }: { icon: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <Box className='flex items-center gap-2 mb-4 mt-2'>
    <i className={`${icon} text-xl text-primary`} />
    <Typography variant='h6' fontWeight={700} color='text.primary' sx={{ flex: 1 }}>{children}</Typography>
    {action}
  </Box>
)

// ── US States (loaded from lookups API) ─────────────────────────────────────
interface StateLookup { value: string; label: string }

export default function LeadEditDialog({ open, onClose, lead, onSaved }: Props) {
  // ── US States from lookups ────────────────────────────────────────────────
  const [usStates, setUsStates] = useState<StateLookup[]>([])
  useEffect(() => {
    fetch('/api/lookups/usState?activeOnly=true')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsStates(data.map((d: any) => ({ value: d.value || '', label: d.label || '' })))
        }
      })
      .catch(() => {})
  }, [])

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    middle_initial: '',
    gender: '',
    date_of_birth: '',
    occupation_title: '',
    grade_level: '',
    annual_salary: '',
    hourly_rate: '',
    facility_name: '',
    facility_address: '',
    facility_city: '',
    facility_state: '',
    facility_zip_code: '',
    entered_on_duty_date: '',
    years_of_service: '',
    personal_address: '',
    personal_city: '',
    personal_state: '',
    personal_zip: '',
    personal_email: '',
    personal_phone: '',
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [localFavorite, setLocalFavorite] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [mapPersonalOpen, setMapPersonalOpen] = useState(false)

  // Sync local favorite state with lead data
  useEffect(() => {
    if (lead) setLocalFavorite(lead.is_favorite ?? false)
  }, [lead])

  // ── Fetch full lead record (includes cre_dt, mod_dt, cre_by, mod_by) ────
  const [fullLead, setFullLead] = useState<Lead | null>(null)
  useEffect(() => {
    if (open && lead?.id) {
      fetch(`/api/leads/${lead.id}`)
        .then(r => r.json())
        .then(data => { if (data?.id) setFullLead(data) })
        .catch(() => {})
    } else {
      setFullLead(null)
    }
  }, [open, lead?.id])

  // ── Populate form when lead changes ───────────────────────────────────────
  useEffect(() => {
    if (lead) {
      setForm({
        first_name: lead.first_name ?? '',
        last_name: lead.last_name ?? '',
        middle_initial: lead.middle_initial ?? '',
        gender: lead.gender ?? '',
        date_of_birth: lead.date_of_birth ?? '',
        occupation_title: lead.occupation_title ?? '',
        grade_level: lead.grade_level ?? '',
        annual_salary: lead.annual_salary?.toString() ?? '',
        hourly_rate: lead.hourly_rate?.toString() ?? '',
        facility_name: lead.facility_name ?? '',
        facility_address: lead.facility_address ?? '',
        facility_city: lead.facility_city ?? '',
        facility_state: lead.facility_state ?? '',
        facility_zip_code: lead.facility_zip_code ?? '',
        entered_on_duty_date: lead.entered_on_duty_date ?? '',
        years_of_service: lead.years_of_service?.toString() ?? '',
        personal_address: lead.personal_address ?? '',
        personal_city: lead.personal_city ?? '',
        personal_state: lead.personal_state ?? '',
        personal_zip: lead.personal_zip ?? '',
        personal_email: lead.personal_email ?? '',
        personal_phone: lead.personal_phone ?? '',
      })
      setDirty(false)
      setError('')
    }
  }, [lead])

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setDirty(true)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!lead) return
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First Name and Last Name are required')
      return
    }
    if (!form.facility_state.trim()) {
      setError('Facility State is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        ...form,
        annual_salary: form.annual_salary ? parseFloat(form.annual_salary) : null,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
        years_of_service: form.years_of_service ? parseInt(form.years_of_service) : null,
        middle_initial: form.middle_initial || null,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        occupation_title: form.occupation_title || null,
        grade_level: form.grade_level || null,
        facility_name: form.facility_name || null,
        facility_address: form.facility_address || null,
        facility_city: form.facility_city || null,
        facility_state: form.facility_state || null,
        facility_zip_code: form.facility_zip_code || null,
        entered_on_duty_date: form.entered_on_duty_date || null,
        personal_address: form.personal_address || null,
        personal_city: form.personal_city || null,
        personal_state: form.personal_state || null,
        personal_zip: form.personal_zip || null,
        personal_email: form.personal_email || null,
        personal_phone: form.personal_phone || null,
      }

      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to save')
        return
      }

      setSuccess(true)
      setDirty(false)
      onSaved?.(data)
    } catch (err) {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <EntityEditDialog
      open={open}
      onClose={onClose}
      title={lead ? `${lead.first_name} ${lead.last_name}` : 'Edit Lead'}
      subtitle={lead?.grade_level || undefined}
      icon='tabler-user-edit'
      onSave={handleSave}
      saving={saving}
      dirty={dirty}
      error={error}
      onClearError={() => setError('')}
      showSuccess={success}
      onClearSuccess={() => setSuccess(false)}
      successMessage='Lead saved successfully!'
      entityId={lead?.id}
      sourceInfo={lead?.source_file || undefined}
      createdAt={fullLead?.cre_dt || lead?.cre_dt || undefined}
      createdBy={fullLead?.cre_by || lead?.cre_by || undefined}
      modifiedAt={fullLead?.mod_dt || lead?.mod_dt || undefined}
      modifiedBy={fullLead?.mod_by || lead?.mod_by || undefined}
      isFavorite={localFavorite}
      onToggleFavorite={lead?.id ? async () => {
        const newVal = !localFavorite
        setLocalFavorite(newVal)
        try {
          await fetch(`/api/leads/${lead.id}/favorite`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_favorite: newVal }),
          })
        } catch { setLocalFavorite(!newVal) }
      } : undefined}
    >
      {/* ── Personal Information ─────────────────────────────────────────── */}
      <SectionHeader icon='tabler-user'>Personal Information</SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 16, marginBottom: 16 }}>
        <CustomTextField
          fullWidth label={<RequiredLabel>First Name</RequiredLabel>}
          value={form.first_name} onChange={handleChange('first_name')}
          disabled={saving} autoFocus
        />
        <CustomTextField
          fullWidth label='MI'
          value={form.middle_initial} onChange={handleChange('middle_initial')}
          disabled={saving}
          slotProps={{ htmlInput: { maxLength: 2 } }}
        />
        <CustomTextField
          fullWidth label={<RequiredLabel>Last Name</RequiredLabel>}
          value={form.last_name} onChange={handleChange('last_name')}
          disabled={saving}
        />
      </div>

      {/* Personal Address row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 8 }}>
        <AddressAutocomplete
          value={form.personal_address}
          onChange={(v) => { setForm(prev => ({ ...prev, personal_address: v })); setDirty(true) }}
          onPlaceSelected={(place) => {
            setForm(prev => ({
              ...prev,
              personal_address: place.street,
              personal_city: place.city,
              personal_state: place.state,
              personal_zip: place.zipCode,
            }))
            setDirty(true)
          }}
          label='Home Address'
          placeholder='Start typing to search...'
          size='medium'
        />
        <CustomTextField
          fullWidth label='City'
          value={form.personal_city} onChange={handleChange('personal_city')}
          disabled={saving}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 8 }}>
        <CustomTextField
          fullWidth label='State'
          value={form.personal_state} onChange={handleChange('personal_state')}
          disabled={saving}
        />
        <CustomTextField
          fullWidth label='Zip'
          value={form.personal_zip} onChange={handleChange('personal_zip')}
          disabled={saving}
        />
        {(form.personal_address || form.personal_city || form.personal_state || form.personal_zip) && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title='View on Google Maps'>
              <IconButton
                size='small'
                onClick={() => setMapPersonalOpen(true)}
                sx={{
                  color: '#4285F4',
                  bgcolor: 'rgba(66,133,244,0.08)',
                  border: '1px solid rgba(66,133,244,0.3)',
                  borderRadius: 1.5,
                  p: '4px 10px',
                  gap: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  '&:hover': { bgcolor: 'rgba(66,133,244,0.15)', borderColor: '#4285F4' },
                  transition: 'all 0.15s',
                }}
              >
                <i className='tabler-map-pin' style={{ fontSize: 15 }} />
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Map</span>
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
        <CustomTextField
          fullWidth label='Gender' value={form.gender} onChange={handleChange('gender')}
          disabled={saving} select SelectProps={{ native: true }}
        >
          <option value=''>Unknown</option>
          <option value='M'>Male</option>
          <option value='F'>Female</option>
        </CustomTextField>
        <CustomTextField
          fullWidth label='Date of Birth' type='date'
          value={form.date_of_birth} onChange={handleChange('date_of_birth')}
          disabled={saving}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </div>

      <Divider sx={{ my: 3 }} />

      {/* ── Employment Information ────────────────────────────────────────── */}
      <SectionHeader icon='tabler-briefcase'>Employment Information</SectionHeader>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
        <CustomTextField
          fullWidth label='Occupation Title'
          value={form.occupation_title} onChange={handleChange('occupation_title')}
          disabled={saving}
        />
        <CustomTextField
          fullWidth label='Grade Level'
          value={form.grade_level} onChange={handleChange('grade_level')}
          disabled={saving}
        />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
        <CustomTextField
          fullWidth label='Annual Salary' type='number'
          value={form.annual_salary} onChange={handleChange('annual_salary')}
          disabled={saving}
          slotProps={{
            input: { startAdornment: <Typography sx={{ mr: 0.5, color: 'text.secondary' }}>$</Typography> }
          }}
        />
        <CustomTextField
          fullWidth label='Hourly Rate' type='number'
          value={form.hourly_rate} onChange={handleChange('hourly_rate')}
          disabled={saving}
          slotProps={{
            input: { startAdornment: <Typography sx={{ mr: 0.5, color: 'text.secondary' }}>$</Typography> }
          }}
        />
        <CustomTextField
          fullWidth label='Years of Service' type='number'
          value={form.years_of_service} onChange={handleChange('years_of_service')}
          disabled={saving}
        />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
        <CustomTextField
          fullWidth label='Entered on Duty Date' type='date'
          value={form.entered_on_duty_date} onChange={handleChange('entered_on_duty_date')}
          disabled={saving}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </div>

      <Divider sx={{ my: 3 }} />

      {/* ── Facility Information ──────────────────────────────────────────── */}
      <SectionHeader
        icon='tabler-building'
        action={
          (form.facility_address || form.facility_city || form.facility_state || form.facility_zip_code) ? (
            <Tooltip title='View on Google Maps'>
              <IconButton
                size='small'
                onClick={() => setMapOpen(true)}
                sx={{
                  color: '#4285F4',
                  bgcolor: 'rgba(66,133,244,0.08)',
                  border: '1px solid rgba(66,133,244,0.3)',
                  borderRadius: 1.5,
                  p: '4px 8px',
                  gap: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: 'rgba(66,133,244,0.15)',
                    borderColor: '#4285F4',
                  },
                  transition: 'all 0.15s',
                }}
              >
                <i className='tabler-map-pin' style={{ fontSize: 15 }} />
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Map</span>
              </IconButton>
            </Tooltip>
          ) : null
        }
      >Facility Information</SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
        <CustomTextField
          fullWidth label='Facility Name'
          value={form.facility_name} onChange={handleChange('facility_name')}
          disabled={saving}
        />
        <AddressAutocomplete
          value={form.facility_address}
          onChange={(v) => { setForm(prev => ({ ...prev, facility_address: v })); setDirty(true) }}
          onPlaceSelected={(place) => {
            setForm(prev => ({
              ...prev,
              facility_address: place.street,
              facility_city: place.city,
              facility_state: place.state,
              facility_zip_code: place.zipCode,
            }))
            setDirty(true)
          }}
          label='Facility Address'
          placeholder='Start typing to search...'
          size='medium'
        />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
        <CustomTextField
          fullWidth label='City'
          value={form.facility_city} onChange={handleChange('facility_city')}
          disabled={saving}
        />
        <CustomTextField
          fullWidth label={<RequiredLabel>State</RequiredLabel>}
          value={form.facility_state} onChange={handleChange('facility_state')}
          disabled={saving} select SelectProps={{ native: true }}
        >
          <option value=''>Select State</option>
          {usStates.map(st => <option key={st.value} value={st.value}>{st.value} — {st.label}</option>)}
        </CustomTextField>
        <CustomTextField
          fullWidth label='Zip Code'
          value={form.facility_zip_code} onChange={handleChange('facility_zip_code')}
          disabled={saving}
        />
      </div>

      {/* Facility map dialog */}
      <FacilityMapDialog
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        facilityName={form.facility_name || null}
        address={form.facility_address || null}
        city={form.facility_city || null}
        state={form.facility_state || null}
        zip={form.facility_zip_code || null}
      />

      {/* Personal address map dialog */}
      <FacilityMapDialog
        open={mapPersonalOpen}
        onClose={() => setMapPersonalOpen(false)}
        facilityName={`${form.first_name} ${form.last_name}`.trim() || null}
        address={form.personal_address || null}
        city={form.personal_city || null}
        state={form.personal_state || null}
        zip={form.personal_zip || null}
      />
    </EntityEditDialog>
  )
}
