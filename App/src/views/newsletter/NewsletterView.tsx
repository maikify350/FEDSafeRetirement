'use client'

/**
 * NewsletterView — Grid for managing newsletter subscribers.
 *
 * Uses EntityListView for the data grid with:
 *   - Edit dialog on double-click or pencil icon
 *   - +Add button for manual entry
 *   - Red trash-can delete with confirmation dialog
 *   - CSV / JSON export
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import { createColumnHelper } from '@tanstack/react-table'

import EntityListView from '@/components/EntityListView'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NewsletterSubscriber {
  id: string
  first_name: string
  last_name: string
  cell_phone: string
  personal_email: string
  source_page: string | null
  referrer: string | null
  ip_address: string | null
  user_agent: string | null
  sms_consent: boolean
  status: string
  raw_payload: Record<string, unknown> | null
  cre_dt: string
  cre_by: string
  mod_dt: string
  mod_by: string
  version_no: number
}

type SubscriberWithAction = NewsletterSubscriber & { action?: string }

const columnHelper = createColumnHelper<SubscriberWithAction>()

const formatDateTime = (v: string | null) => {
  if (!v) return '—'
  return new Date(v).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

const statusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'active':        return 'success'
    case 'unsubscribed':  return 'warning'
    case 'bounced':       return 'error'
    default:              return 'default'
  }
}

// ── Add / Edit Dialog ─────────────────────────────────────────────────────────

function SubscriberDialog({
  subscriber,
  open,
  onClose,
  onSaved,
}: {
  subscriber: NewsletterSubscriber | null   // null = add mode
  open: boolean
  onClose: () => void
  onSaved: (row: NewsletterSubscriber) => void
}) {
  const isEdit = !!subscriber

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    cell_phone: '',
    personal_email: '',
    status: 'active',
    sms_consent: true,
    source_page: '',
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  // Fetch fresh data from the API when opening in edit mode
  useEffect(() => {
    if (!open) return

    if (subscriber) {
      // Edit mode — always fetch fresh copy from API (app rule: all reads via endpoint)
      setLoading(true)
      setError('')
      fetch(`/api/newsletter/${subscriber.id}`)
        .then(res => res.json())
        .then((data: NewsletterSubscriber) => {
          setForm({
            first_name:     data.first_name || '',
            last_name:      data.last_name || '',
            cell_phone:     data.cell_phone || '',
            personal_email: data.personal_email || '',
            status:         data.status || 'active',
            sms_consent:    data.sms_consent ?? true,
            source_page:    data.source_page || '',
          })
        })
        .catch(() => setError('Failed to load subscriber data'))
        .finally(() => setLoading(false))
    } else {
      // Add mode — reset form
      setForm({
        first_name: '', last_name: '', cell_phone: '',
        personal_email: '', status: 'active', sms_consent: true, source_page: '',
      })
      setError('')
    }
  }, [subscriber?.id, open])

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSave = async () => {
    if (!form.first_name.trim()) { setError('First name is required'); return }
    if (!form.last_name.trim())  { setError('Last name is required');  return }
    if (!form.cell_phone.trim()) { setError('Cell phone is required'); return }
    if (!form.personal_email.trim()) { setError('Personal email is required'); return }

    setSaving(true)
    setError('')

    try {
      const url = isEdit ? `/api/newsletter/${subscriber!.id}` : '/api/newsletter'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Failed to save')
        return
      }

      onSaved(result)
    } catch (err: any) {
      setError(err.message || 'Unexpected error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <i className={isEdit ? 'tabler-edit' : 'tabler-user-plus'} style={{ fontSize: 20, color: '#6366f1' }} />
          <Typography variant='subtitle1' fontWeight={700}>
            {isEdit ? 'Edit Subscriber' : 'Add Subscriber'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <>
            {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size='small' label='First Name *'
              value={form.first_name} onChange={handleChange('first_name')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size='small' label='Last Name *'
              value={form.last_name} onChange={handleChange('last_name')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size='small' label='Cell Phone *'
              value={form.cell_phone} onChange={handleChange('cell_phone')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size='small' label='Personal Email *' type='email'
              value={form.personal_email} onChange={handleChange('personal_email')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth select size='small' label='Status'
              value={form.status} onChange={handleChange('status')}>
              <MenuItem value='active'>Active</MenuItem>
              <MenuItem value='unsubscribed'>Unsubscribed</MenuItem>
              <MenuItem value='bounced'>Bounced</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.sms_consent}
                  onChange={e => setForm(prev => ({ ...prev, sms_consent: e.target.checked }))}
                  size='small'
                />
              }
              label='SMS Consent'
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size='small' label='Source Page'
              value={form.source_page} onChange={handleChange('source_page')}
              placeholder='e.g. https://fedsaferetirement.com/newsletter' />
          </Grid>
        </Grid>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving || loading}>Cancel</Button>
        <Button
          variant='contained'
          onClick={handleSave}
          disabled={saving || loading}
          startIcon={saving ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-device-floppy' />}
        >
          {isEdit ? 'Save' : 'Add Subscriber'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Main View ─────────────────────────────────────────────────────────────────

export default function NewsletterView() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  // Dialog states
  const [addOpen, setAddOpen]             = useState(false)
  const [editRow, setEditRow]             = useState<NewsletterSubscriber | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<NewsletterSubscriber | null>(null)
  const [deleting, setDeleting]           = useState(false)

  const fetchSubscribers = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/newsletter')
      const data = await res.json()

      setSubscribers(Array.isArray(data) ? data : [])
    } catch {
      setSubscribers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSubscribers() }, [fetchSubscribers])

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)

    try {
      await fetch(`/api/newsletter/${confirmDelete.id}`, { method: 'DELETE' })
      setSubscribers(prev => prev.filter(s => s.id !== confirmDelete.id))
    } finally {
      setConfirmDelete(null)
      setDeleting(false)
    }
  }

  const handleSaved = (row: NewsletterSubscriber) => {
    setSubscribers(prev => {
      const idx = prev.findIndex(s => s.id === row.id)

      if (idx >= 0) {
        const next = [...prev]

        next[idx] = row

        return next
      }

      return [row, ...prev]
    })
    setEditRow(null)
    setAddOpen(false)
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns = useMemo(() => [
    columnHelper.accessor('status', {
      header: 'Status', size: 110,
      cell: ({ row }) => (
        <Chip
          label={row.original.status || 'active'}
          color={statusColor(row.original.status)}
          size='small'
          variant='tonal'
        />
      ),
    }),
    columnHelper.accessor('first_name', {
      header: 'First Name', size: 130,
      cell: ({ row }) => (
        <Typography className='font-semibold text-sm'>{row.original.first_name || '—'}</Typography>
      ),
    }),
    columnHelper.accessor('last_name', {
      header: 'Last Name', size: 130,
      cell: ({ row }) => (
        <Typography className='font-semibold text-sm'>{row.original.last_name || '—'}</Typography>
      ),
    }),
    columnHelper.accessor('personal_email', {
      header: 'Email', size: 220,
      cell: ({ row }) => (
        <Typography className='text-sm'>{row.original.personal_email || '—'}</Typography>
      ),
    }),
    columnHelper.accessor('cell_phone', {
      header: 'Cell Phone', size: 140,
      cell: ({ row }) => (
        <Typography className='text-sm'>{row.original.cell_phone || '—'}</Typography>
      ),
    }),
    columnHelper.accessor('sms_consent', {
      header: 'SMS Consent', size: 110,
      cell: ({ row }) => (
        <Chip
          label={row.original.sms_consent ? 'Yes' : 'No'}
          color={row.original.sms_consent ? 'success' : 'default'}
          size='small'
          variant='outlined'
          sx={{ fontSize: 11 }}
        />
      ),
    }),
    columnHelper.accessor('source_page', {
      header: 'Source', size: 180,
      cell: ({ row }) => (
        <Typography className='text-sm' noWrap>{row.original.source_page || '—'}</Typography>
      ),
    }),
    columnHelper.accessor('cre_dt', {
      header: 'Subscribed', size: 160,
      cell: ({ row }) => (
        <Typography className='text-sm'>{formatDateTime(row.original.cre_dt)}</Typography>
      ),
    }),
    columnHelper.accessor('cre_by', {
      header: 'Created By', size: 140,
      cell: ({ row }) => (
        <Typography className='text-sm'>{row.original.cre_by || '—'}</Typography>
      ),
    }),
    columnHelper.accessor('mod_dt', {
      header: 'Modified', size: 160,
      cell: ({ row }) => (
        <Typography className='text-sm'>{formatDateTime(row.original.mod_dt)}</Typography>
      ),
    }),
    // Delete action column
    columnHelper.display({
      id: 'delete',
      header: '',
      size: 50,
      enableSorting: false,
      enableColumnFilter: false,
      enableHiding: false,
      enableResizing: false,
      cell: ({ row }) => (
        <Tooltip title='Delete subscriber'>
          <IconButton
            size='small'
            onClick={(e) => {
              e.stopPropagation()
              setConfirmDelete(row.original)
            }}
            sx={{
              color: '#ef4444',
              p: '4px',
              '&:hover': { color: '#b91c1c', background: '#fee2e2' },
              transition: 'all 0.15s',
            }}
          >
            <i className='tabler-trash' style={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      ),
    }),
  ], [])

  const defaultColVisibility = {
    source_page: false,
    cre_by: false,
    mod_dt: false,
  }

  // ── Export helpers ─────────────────────────────────────────────────────────

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading && subscribers.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <EntityListView<SubscriberWithAction>
        columns={columns as any}
        data={subscribers}
        storageKey='fs-newsletter'
        defaultColVisibility={defaultColVisibility}
        title='Newsletter Subscribers'
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder='Search subscribers...'
        newButtonLabel='Add Subscriber'
        onNewClick={() => setAddOpen(true)}
        onRowEdit={(row) => setEditRow(row)}
        onRowDoubleClick={(row) => setEditRow(row)}
        onExportCsv={(rows) => {
          const csv = ['Status,First Name,Last Name,Email,Cell Phone,SMS Consent,Source,Subscribed'].concat(
            rows.map(r =>
              `${r.status},${r.first_name},${r.last_name},${r.personal_email},${r.cell_phone},${r.sms_consent},${r.source_page || ''},${r.cre_dt}`
            )
          ).join('\n')
          downloadBlob(csv, 'newsletter_subscribers.csv', 'text/csv')
        }}
        onExportJson={(rows) =>
          downloadBlob(JSON.stringify(rows, null, 2), 'newsletter_subscribers.json', 'application/json')
        }
        emptyMessage='No newsletter subscribers yet. They will appear here when users sign up on the website.'
      />

      {/* Add / Edit Dialog */}
      <SubscriberDialog
        subscriber={editRow}
        open={addOpen || !!editRow}
        onClose={() => { setAddOpen(false); setEditRow(null) }}
        onSaved={handleSaved}
      />

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <Dialog open onClose={() => setConfirmDelete(null)} maxWidth='xs' fullWidth>
          <DialogTitle>Delete subscriber?</DialogTitle>
          <DialogContent>
            <Typography variant='body2'>
              This will permanently remove{' '}
              <strong>
                {[confirmDelete.first_name, confirmDelete.last_name].filter(Boolean).join(' ') || confirmDelete.personal_email}
              </strong>{' '}
              from the newsletter list. This cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</Button>
            <Button
              color='error'
              variant='contained'
              onClick={handleDelete}
              disabled={deleting}
              startIcon={deleting ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-trash' />}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}
