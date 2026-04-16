'use client'

/**
 * LeadFunnelView — Client-side grid for incoming lead funnel records.
 * Shows all webhook-received leads with status badges and ability to
 * mark records as imported so they don't get processed again.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import { createColumnHelper } from '@tanstack/react-table'

import EntityListView from '@/components/EntityListView'

interface LeadFunnelRow {
  id: string
  ext_appointment_id: number | null
  ext_lead_id: number | null
  event: string | null
  source: string | null
  lead_type: string | null
  status: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  cell_phone: string | null
  birth_year: number | null
  is_over_59: boolean | null
  agency: string | null
  years_employed: string | null
  city: string | null
  state: string | null
  zip: string | null
  marital_status: string | null
  fegli_options: string | null
  retirement_year: number | null
  tsp_value: number | null
  other_acct_value: number | null
  appointment_date: string | null
  ext_agent_id: number | null
  act_contact_id: string | null
  assigned_agent: string | null
  imported_at: string | null
  import_error: string | null
  notes: string | null
  processed: boolean
  cre_dt: string
}

const columnHelper = createColumnHelper<LeadFunnelRow>()

const formatDate = (v: string | null) => {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatDateTime = (v: string | null) => {
  if (!v) return '—'
  return new Date(v).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  })
}

const formatCurrency = (v: number | null) => {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

const statusColor = (status: string): 'warning' | 'success' | 'error' | 'default' | 'info' => {
  switch (status) {
    case 'pending': return 'warning'
    case 'imported': return 'success'
    case 'error': return 'error'
    case 'skipped': return 'default'
    default: return 'info'
  }
}

export default function LeadFunnelView() {
  const [leads, setLeads] = useState<LeadFunnelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/lead-funnel')
      const data = await res.json()
      if (Array.isArray(data)) setLeads(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const columns = useMemo(() => [
    columnHelper.accessor('status', {
      header: 'Status', size: 100,
      cell: ({ row }) => (
        <Chip
          label={row.original.status || 'pending'}
          color={statusColor(row.original.status)}
          size='small'
          variant='tonal'
        />
      ),
    }),
    columnHelper.accessor('first_name', {
      header: 'First Name', size: 120,
      cell: ({ row }) => <Typography className='font-semibold text-sm'>{row.original.first_name || '—'}</Typography>,
    }),
    columnHelper.accessor('last_name', {
      header: 'Last Name', size: 120,
      cell: ({ row }) => <Typography className='font-semibold text-sm'>{row.original.last_name || '—'}</Typography>,
    }),
    columnHelper.accessor('email', {
      header: 'Email', size: 220,
      cell: ({ row }) => <Typography className='text-sm'>{row.original.email || '—'}</Typography>,
    }),
    columnHelper.accessor('cell_phone', {
      header: 'Phone', size: 140,
      cell: ({ row }) => <Typography className='text-sm'>{row.original.cell_phone || row.original.phone || '—'}</Typography>,
    }),
    columnHelper.accessor('state', {
      header: 'State', size: 70,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'center' }}>{row.original.state || '—'}</Typography>,
    }),
    columnHelper.accessor('city', {
      header: 'City', size: 120,
      cell: ({ row }) => <Typography className='text-sm'>{row.original.city || '—'}</Typography>,
    }),
    columnHelper.accessor('agency', {
      header: 'Agency', size: 140,
      cell: ({ row }) => <Typography className='text-sm'>{row.original.agency || '—'}</Typography>,
    }),
    columnHelper.accessor('source', {
      header: 'Source', size: 100,
      cell: ({ row }) => <Typography className='text-sm'>{row.original.source || '—'}</Typography>,
    }),
    columnHelper.accessor('lead_type', {
      header: 'Type', size: 100,
      cell: ({ row }) => <Typography className='text-sm'>{row.original.lead_type || '—'}</Typography>,
    }),
    columnHelper.accessor('years_employed', {
      header: 'Yrs Employed', size: 110,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'center' }}>{row.original.years_employed || '—'}</Typography>,
    }),
    columnHelper.accessor('birth_year', {
      header: 'Birth Year', size: 100,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'center' }}>{row.original.birth_year || '—'}</Typography>,
    }),
    columnHelper.accessor('tsp_value', {
      header: 'TSP Value', size: 120,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'right' }}>{formatCurrency(row.original.tsp_value)}</Typography>,
    }),
    columnHelper.accessor('other_acct_value', {
      header: 'Other Acct', size: 120,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'right' }}>{formatCurrency(row.original.other_acct_value)}</Typography>,
    }),
    columnHelper.accessor('appointment_date', {
      header: 'Appt Date', size: 160,
      cell: ({ row }) => <Typography className='text-sm'>{formatDateTime(row.original.appointment_date)}</Typography>,
    }),
    columnHelper.accessor('assigned_agent', {
      header: 'Assigned To', size: 140,
      cell: ({ row }) => <Typography className='text-sm'>{row.original.assigned_agent || '—'}</Typography>,
    }),
    columnHelper.accessor('imported_at', {
      header: 'Imported', size: 140,
      cell: ({ row }) => <Typography className='text-sm'>{formatDate(row.original.imported_at)}</Typography>,
    }),
    columnHelper.accessor('cre_dt', {
      header: 'Received', size: 140,
      cell: ({ row }) => <Typography className='text-sm'>{formatDateTime(row.original.cre_dt)}</Typography>,
    }),
    columnHelper.accessor('notes', {
      header: 'Notes', size: 200,
      cell: ({ row }) => <Typography className='text-sm'>{row.original.notes || '—'}</Typography>,
    }),
    columnHelper.accessor('import_error', {
      header: 'Import Error', size: 200,
      cell: ({ row }) => (
        <Typography className='text-sm' color={row.original.import_error ? 'error' : 'inherit'}>
          {row.original.import_error || '—'}
        </Typography>
      ),
    }),
  ], [])

  const defaultColVisibility = {
    agency: false,
    lead_type: false,
    years_employed: false,
    birth_year: false,
    other_acct_value: false,
    assigned_agent: false,
    imported_at: false,
    notes: false,
    import_error: false,
  }

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  if (loading && leads.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}><CircularProgress /></Box>
  }

  return (
    <EntityListView<LeadFunnelRow>
      columns={columns as any}
      data={leads}
      storageKey='fs-lead-funnel'
      defaultColVisibility={defaultColVisibility}
      title='Lead Funnel'
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder='Search leads...'
      onExportCsv={(rows) => {
        const csv = ['Status,First,Last,Email,Phone,State,City,Source,ApptDate,TSP'].concat(
          rows.map(r => `${r.status},${r.first_name},${r.last_name},${r.email},${r.cell_phone || r.phone},${r.state},${r.city},${r.source},${r.appointment_date},${r.tsp_value}`)
        ).join('\n')
        downloadBlob(csv, 'lead_funnel.csv', 'text/csv')
      }}
      onExportJson={(rows) => downloadBlob(JSON.stringify(rows, null, 2), 'lead_funnel.json', 'application/json')}
      emptyMessage='No leads in the funnel yet. Leads will appear here when they arrive via webhook.'
      newButtonLabel=''
      onNewClick={() => {}}
    />
  )
}
