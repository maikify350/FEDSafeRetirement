'use client'

/**
 * LeadFunnelView — Client-side grid for incoming lead funnel records.
 * Shows all webhook-received leads with status badges and ability to
 * mark records as imported so they don't get processed again.
 *
 * State is persisted via LeadFunnelDataProvider context so navigating
 * to other sections and returning does NOT trigger a fresh data fetch.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import { createColumnHelper } from '@tanstack/react-table'

import EntityListView from '@/components/EntityListView'
import LeadAddDialog from './LeadAddDialog'
import { useLeadFunnelData, type LeadFunnelRow } from '@/hooks/useLeadFunnelData'

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
  // ── Pull state from shared context (persists across navigation) ──────────
  const ctx = useLeadFunnelData()
  const {
    leads, loading, search,
    setSearch,
    fetchLeads,
    hasInitialized, markStaleCheckOnResume,
  } = ctx

  // ── Local-only UI state ──────────────────────────────────────────────────
  const [addNew, setAddNew] = useState(false)

  // ── Initial fetch: only if never initialized or stale ────────────────────
  const didMountRef = useRef(false)

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      if (markStaleCheckOnResume()) {
        fetchLeads()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    <>
      <EntityListView<LeadFunnelRow>
        columns={columns as any}
        data={leads}
        storageKey='fs-lead-funnel'
        defaultColVisibility={defaultColVisibility}
        title='Lead Funnel'
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder='Search leads...'
        newButtonLabel='Add Lead'
        onNewClick={() => setAddNew(true)}
        onExportCsv={(rows) => {
          const csv = ['Status,First,Last,Email,Phone,State,City,Source,ApptDate,TSP'].concat(
            rows.map(r => `${r.status},${r.first_name},${r.last_name},${r.email},${r.cell_phone || r.phone},${r.state},${r.city},${r.source},${r.appointment_date},${r.tsp_value}`)
          ).join('\n')
          downloadBlob(csv, 'lead_funnel.csv', 'text/csv')
        }}
        onExportJson={(rows) => downloadBlob(JSON.stringify(rows, null, 2), 'lead_funnel.json', 'application/json')}
        emptyMessage='No leads in the funnel yet. Leads will appear here when they arrive via webhook.'
      />

      <LeadAddDialog
        open={addNew}
        onClose={() => setAddNew(false)}
        onSaved={() => { setAddNew(false); fetchLeads() }}
      />
    </>
  )
}
