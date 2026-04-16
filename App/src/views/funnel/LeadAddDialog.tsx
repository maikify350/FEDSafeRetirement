'use client'

/**
 * LeadAddDialog — Manual lead entry dialog for the Lead Funnel.
 */

import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC','PR','VI'
]

export default function LeadAddDialog({ open, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    cell_phone: '',
    city: '',
    state: '',
    zip: '',
    agency: '',
    birth_year: '',
    years_employed: '',
    tsp_value: '',
    source: 'manual',
    notes: '',
  })

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSave = async () => {
    if (!form.first_name && !form.last_name && !form.email) {
      setError('At least first name, last name, or email is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Build a flat payload that matches our webhook format
      const payload = {
        event: 'manual.entry',
        entry: {
          type: 'federal',
          source: form.source || 'manual',
          city: form.city,
          state: form.state,
          status: 'pending',
          lead: {
            firstName: form.first_name,
            lastName: form.last_name,
            email: form.email,
            cellPhone: form.cell_phone,
            city: form.city,
            state: form.state,
            zip: form.zip,
            agency: form.agency,
            birthYear: form.birth_year ? parseInt(form.birth_year) : null,
            yearsEmployed: form.years_employed,
            accounts: form.tsp_value ? [{ name: 'TSP', cashValue: form.tsp_value }] : [],
          },
          agent: {},
        }
      }

      const res = await fetch('/api/lead-funnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Failed to create lead')
        return
      }

      // Reset form and close
      setForm({
        first_name: '', last_name: '', email: '', cell_phone: '',
        city: '', state: '', zip: '', agency: '', birth_year: '',
        years_employed: '', tsp_value: '', source: 'manual', notes: '',
      })
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Unexpected error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Add Lead Manually</DialogTitle>
      <DialogContent>
        {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth label='First Name' value={form.first_name} onChange={handleChange('first_name')} size='small' />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth label='Last Name' value={form.last_name} onChange={handleChange('last_name')} size='small' />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth label='Email' type='email' value={form.email} onChange={handleChange('email')} size='small' />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth label='Cell Phone' value={form.cell_phone} onChange={handleChange('cell_phone')} size='small' />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField fullWidth label='City' value={form.city} onChange={handleChange('city')} size='small' />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField fullWidth select label='State' value={form.state} onChange={handleChange('state')} size='small'>
              <MenuItem value=''>—</MenuItem>
              {US_STATES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField fullWidth label='ZIP' value={form.zip} onChange={handleChange('zip')} size='small' />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth label='Agency' value={form.agency} onChange={handleChange('agency')} size='small' />
          </Grid>
          <Grid size={{ xs: 3 }}>
            <TextField fullWidth label='Birth Year' type='number' value={form.birth_year} onChange={handleChange('birth_year')} size='small' />
          </Grid>
          <Grid size={{ xs: 3 }}>
            <TextField fullWidth select label='Yrs Employed' value={form.years_employed} onChange={handleChange('years_employed')} size='small'>
              <MenuItem value=''>—</MenuItem>
              <MenuItem value='0-5'>0-5</MenuItem>
              <MenuItem value='5-10'>5-10</MenuItem>
              <MenuItem value='10-20'>10-20</MenuItem>
              <MenuItem value='20+'>20+</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth label='TSP Value ($)' type='number' value={form.tsp_value} onChange={handleChange('tsp_value')} size='small' />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth label='Source' value={form.source} onChange={handleChange('source')} size='small' />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth multiline rows={2} label='Notes' value={form.notes} onChange={handleChange('notes')} size='small' />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant='contained' disabled={saving}>
          {saving ? 'Saving...' : 'Add Lead'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
