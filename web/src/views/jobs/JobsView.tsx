'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Button from '@mui/material/Button'

import { createColumnHelper } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import type { FilterFn } from '@tanstack/react-table'

import EntityListView, { type FlashRow } from '@/components/EntityListView'
import JobCardGrid from './JobCardGrid'
import JobFullPageDetail from './JobFullPageDetail'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { fmtStatus } from '@/utils/formatStatus'
import type { AISearchAction } from '@components/AISearchButton'
import type { Job } from '@shared/contracts'

// ─── Constants ───────────────────────────────────────────────────────────────
const JOB_STATUSES = ['unscheduled', 'scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const

const STATUS_COLORS: Record<string, 'warning' | 'info' | 'error' | 'success' | 'secondary'> = {
  unscheduled: 'error', scheduled: 'info', in_progress: 'warning', on_hold: 'error', completed: 'success', cancelled: 'secondary',
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const fmtMoney = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

const downloadBlob = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.setAttribute('download', filename)
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}

const exportToCSV = (jobs: Job[]) => {
  const headers = ['Job #', 'Title', 'Client', 'Status', 'Priority', 'Scheduled', 'Total', 'Assigned To']
  const rows = jobs.map(j => [
    j.jobNumber, j.title,
    j.client ? `${j.client.firstName} ${j.client.lastName}` : '',
    j.status, j.priority, j.scheduledDate || '', String(j.total ?? ''), j.assignedTo?.name || '',
  ])
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join('\n')
  downloadBlob(csv, `jobs_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;')
}

const exportToJSON = (jobs: Job[]) => {
  downloadBlob(
    JSON.stringify(jobs.map(j => ({ id: j.id, jobNumber: j.jobNumber, title: j.title, status: j.status, priority: j.priority, scheduledDate: j.scheduledDate, total: j.total, assignedTo: j.assignedTo?.name, clientId: j.clientId })), null, 2),
    `jobs_${new Date().toISOString().split('T')[0]}.json`, 'application/json'
  )
}

type JobWithAction = Job & { action?: string }
const columnHelper = createColumnHelper<JobWithAction>()

const fuzzyFilter: FilterFn<JobWithAction> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

interface FieldDef { fieldName: string; fieldLabel: string; showInGrid: boolean; isActive: boolean }

// ─── Main View ────────────────────────────────────────────────────────────────
/**
 * Jobs list view with grid/card toggle, advanced filters, and batch actions.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/jobs/JobsView.tsx
 */
export default function JobsView() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const { rows: rtJobs, flashing } = useRealtimeTable({ table: 'job', data: jobs })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [initialClientId, setInitialClientId] = useState<string | null>(null)
  const [initialQuoteId, setInitialQuoteId] = useState<string | null>(null)
  const [initialRequestId, setInitialRequestId] = useState<string | null>(null)
  const [initialTaxCodeId, setInitialTaxCodeId] = useState<string | null>(null)
  const [highlightedJobId, setHighlightedJobId] = useState<string | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>([])
  const searchParams = useSearchParams()

  useEffect(() => {
    fetch(`${BACKEND}/api/custom-fields/job?includeSystem=true`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setFieldDefs(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setCreateOpen(true)
      const clientId = searchParams.get('clientId')
      if (clientId) setInitialClientId(clientId)
      const quoteId = searchParams.get('quoteId')
      if (quoteId) setInitialQuoteId(quoteId)
      const requestId = searchParams.get('requestId')
      if (requestId) setInitialRequestId(requestId)
      const taxCodeId = searchParams.get('taxCodeId')
      if (taxCodeId) setInitialTaxCodeId(taxCodeId)
    }
    const editId = searchParams.get('edit')
    if (editId) {
      const job = jobs.find(j => j.id === editId)
      if (job) { setSelectedJob(job); setDetailOpen(true) }
    }
  }, [searchParams, jobs])
  useEffect(() => { const s = searchParams.get('status'); if (s) setStatusFilter(s) }, [searchParams])

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${BACKEND}/api/jobs`)
      if (!res.ok) throw new Error('Failed to load jobs')
      const data = await res.json()
      setJobs(Array.isArray(data) ? data : data.data ?? [])
      setError(null)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Unknown error') } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const filteredJobs = useMemo(() => {
    if (highlightedJobId) return rtJobs.filter(j => j.id === highlightedJobId)
    let result = rtJobs
    if (statusFilter !== 'all') result = result.filter(j => j.status === statusFilter)
    if (globalFilter) {
      const q = globalFilter.toLowerCase()
      result = result.filter(j =>
        [j.jobNumber, j.title, j.description, j.status, j.priority, j.client?.firstName, j.client?.lastName, j.client?.company, j.assignedTo?.name]
          .some(val => val?.toLowerCase().includes(q))
      )
    }
    return result
  }, [rtJobs, statusFilter, globalFilter, highlightedJobId])

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: jobs.length }
    jobs.forEach(j => { c[j.status] = (c[j.status] || 0) + 1 })
    return c
  }, [jobs])

  const handleAIResult = useCallback((result: AISearchAction) => {
    if (result.action === 'filter') {
      if (result.filters.status) setStatusFilter(result.filters.status); else setStatusFilter('all')
      const terms = Object.entries(result.filters).filter(([k]) => k !== 'status').map(([, v]) => v).join(' ')
      if (terms) setGlobalFilter(terms)
    } else if (result.action === 'open_edit') {
      const q = result.search.toLowerCase()
      const found = jobs.find(j => j.jobNumber?.toLowerCase().includes(q) || j.title?.toLowerCase().includes(q))
      if (found) { setHighlightedJobId(found.id); setGlobalFilter(''); setSelectedJob(found); setDetailOpen(true) }
      else setGlobalFilter(result.search)
    }
  }, [jobs])

  const handlePrint = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPrintingId(id)
    try {
      const response = await fetch(`${BACKEND}/api/reports/job/${id}?format=pdf`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jm_token')}` }
      })
      if (!response.ok) throw new Error('Failed to generate report')
      const blob = await response.blob()
      window.open(window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })), '_blank')
    } catch (error) {
      console.error('Print failed:', error)
      alert('Failed to generate report.')
    } finally {
      setPrintingId(null)
    }
  }

  // ── Renderer map: every Job field ──────────────────────────────────────────
  const rendererMap = useMemo(() => ({
    jobNumber: columnHelper.accessor('jobNumber', { header: 'Job #', size: 100,
      cell: ({ row }) => <Typography variant='body2' fontWeight={600} color='primary'>{row.original.jobNumber}</Typography>
    }),
    title: columnHelper.accessor('title', { header: 'Title', size: 220,
      cell: ({ row }) => <Typography variant='body2'>{row.original.title}</Typography>
    }),
    client: columnHelper.accessor((row: JobWithAction) => row.client ? `${row.client.firstName} ${row.client.lastName}${row.client.company ? ` (${row.client.company})` : ''}` : '', {
      id: 'client', header: 'Client', size: 180,
      cell: ({ row }) => row.original.client ? (
        <Typography variant='body2'>{row.original.client.firstName} {row.original.client.lastName}
          {row.original.client.company && <Typography component='span' variant='caption' color='text.secondary'> · {row.original.client.company}</Typography>}
        </Typography>
      ) : null
    }),
    status: columnHelper.accessor('status', { header: 'Status', size: 120,
      cell: ({ row }) => {
        const isUnscheduled = row.original.status === 'scheduled' && !row.original.scheduledDate
        return <Chip variant='tonal' size='small' label={isUnscheduled ? 'Unscheduled' : fmtStatus(row.original.status)} color={isUnscheduled ? 'error' : (STATUS_COLORS[row.original.status] || 'default')} />
      }
    }),
    priority: columnHelper.accessor('priority', { header: 'Priority', size: 100,
      cell: ({ row }) => <Chip variant='outlined' size='small' label={row.original.priority} className='capitalize'
        color={({ low: 'default', normal: 'info', high: 'warning', urgent: 'error' } as any)[row.original.priority] || 'default'} />
    }),
    scheduledDate: columnHelper.accessor('scheduledDate', { header: 'Scheduled', size: 130,
      cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.scheduledDate)}</Typography>
    }),
    neededBy: columnHelper.accessor('neededBy', { header: 'Needed By', size: 130,
      cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.neededBy)}</Typography>
    }),
    startedAt: columnHelper.accessor('startedAt', { header: 'Started At', size: 130,
      cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.startedAt)}</Typography>
    }),
    completedAt: columnHelper.accessor('completedAt', { header: 'Completed', size: 130,
      cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.completedAt)}</Typography>
    }),
    inspectionDate: columnHelper.accessor('inspectionDate', { header: 'Inspection Date', size: 140,
      cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.inspectionDate)}</Typography>
    }),
    holdReason: columnHelper.accessor('holdReason', { header: 'Hold Reason', size: 160,
      cell: ({ row }) => <Typography variant='body2'>{row.original.holdReason || '—'}</Typography>
    }),
    description: columnHelper.accessor('description', { header: 'Description', size: 200,
      cell: ({ row }) => <Typography variant='body2' noWrap>{row.original.description || '—'}</Typography>
    }),
    propertyName: columnHelper.accessor('propertyName', { header: 'Property Name', size: 160,
      cell: ({ row }) => <Typography variant='body2'>{row.original.propertyName || '—'}</Typography>
    }),
    propertyStreet: columnHelper.accessor('propertyStreet', { header: 'Property Street', size: 180,
      cell: ({ row }) => <Typography variant='body2'>{row.original.propertyStreet || '—'}</Typography>
    }),
    propertyCity: columnHelper.accessor('propertyCity', { header: 'Property City', size: 140,
      cell: ({ row }) => <Typography variant='body2'>{row.original.propertyCity || '—'}</Typography>
    }),
    propertyState: columnHelper.accessor('propertyState', { header: 'Property State', size: 120,
      cell: ({ row }) => <Typography variant='body2'>{row.original.propertyState || '—'}</Typography>
    }),
    propertyZipCode: columnHelper.accessor('propertyZipCode', { header: 'Property Zip', size: 110,
      cell: ({ row }) => <Typography variant='body2'>{row.original.propertyZipCode || '—'}</Typography>
    }),
    total: columnHelper.accessor('total', { header: 'Total', size: 100,
      cell: ({ row }) => <Typography variant='body2' fontWeight={500} sx={{ textAlign: 'right', display: 'block' }}>{fmtMoney(row.original.total)}</Typography>
    }),
    subtotal: columnHelper.accessor('subtotal', { header: 'Subtotal', size: 100,
      cell: ({ row }) => <Typography variant='body2' sx={{ textAlign: 'right', display: 'block' }}>{fmtMoney(row.original.subtotal)}</Typography>
    }),
    taxRate: columnHelper.accessor('taxRate', { header: 'Tax Rate', size: 90,
      cell: ({ row }) => <Typography variant='body2'>{row.original.taxRate != null ? `${row.original.taxRate}%` : '—'}</Typography>
    }),
    discountValue: columnHelper.accessor('discountValue', { header: 'Discount', size: 100,
      cell: ({ row }) => <Typography variant='body2'>{row.original.discountValue != null ? fmtMoney(row.original.discountValue) : '—'}</Typography>
    }),
    assignedTo: columnHelper.accessor((row: JobWithAction) => row.assignedTo?.name || '', {
      id: 'assignedTo', header: 'Assigned To', size: 140,
      cell: ({ row }) => <Typography variant='body2'>{row.original.assignedTo?.name || '—'}</Typography>
    }),
    inspectedBy: columnHelper.accessor((row: JobWithAction) => (row.inspectedBy as any)?.name || '', {
      id: 'inspectedBy', header: 'Inspected By', size: 140,
      cell: ({ row }) => <Typography variant='body2'>{(row.original.inspectedBy as any)?.name || '—'}</Typography>
    }),
    notes: columnHelper.accessor('notes', { header: 'Notes', size: 180,
      cell: ({ row }) => <Typography variant='body2' noWrap>{row.original.notes || '—'}</Typography>
    }),
    creAt: columnHelper.accessor('creAt', { header: 'Created Date', size: 130,
      cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.creAt)}</Typography>
    }),
    modAt: columnHelper.accessor('modAt', { header: 'Last Modified', size: 130,
      cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.modAt)}</Typography>
    }),
    creBy: columnHelper.accessor('creBy', { header: 'Created By', size: 140,
      cell: ({ row }) => <Typography variant='body2'>{row.original.creBy || '—'}</Typography>
    }),
    modBy: columnHelper.accessor('modBy', { header: 'Modified By', size: 140,
      cell: ({ row }) => <Typography variant='body2'>{row.original.modBy || '—'}</Typography>
    }),
  }), [])

  const actionCol = columnHelper.accessor('action', { header: 'Actions', size: 100, enableSorting: false,
    cell: ({ row }) => (
      <div className='flex items-center'>
        <IconButton size='small' onClick={e => { e.stopPropagation(); setSelectedJob(row.original); setDetailOpen(true) }}>
          <i className='tabler-edit text-textSecondary text-[22px]' />
        </IconButton>
        <IconButton size='small' onClick={e => handlePrint(row.original.id, e)} disabled={printingId === row.original.id}>
          {printingId === row.original.id
            ? <CircularProgress size={22} color='inherit' />
            : <i className='tabler-printer text-textSecondary text-[22px]' />}
        </IconButton>
      </div>
    )
  })

  const selectCol = columnHelper.display({
    id: 'select',
    header: ({ table }: any) => <input type='checkbox' checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} />,
    cell: ({ row }: any) => <input type='checkbox' checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />,
  })

  const columns = useMemo(() => {
    if (!fieldDefs.length) {
      return [selectCol, rendererMap.jobNumber, rendererMap.title, rendererMap.client, rendererMap.status, rendererMap.priority, rendererMap.scheduledDate, rendererMap.total, rendererMap.assignedTo, actionCol]
    }
    const active = fieldDefs.filter(f => f.isActive !== false)
    const cols = active
      .map(f => { const r = (rendererMap as any)[f.fieldName]; if (!r) return null; const c = { ...r, id: f.fieldName }; c.columnDef = { ...r.columnDef, header: f.fieldLabel }; return c })
      .filter(Boolean)
    return [selectCol, ...cols, actionCol]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldDefs, rendererMap, printingId])

  const defaultColVisibility = useMemo(() => {
    const vis: Record<string, boolean> = {}
    fieldDefs.forEach(f => { vis[f.fieldName] = f.showInGrid })
    return vis
  }, [fieldDefs])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}><CircularProgress /></Box>
  if (error) return <Box sx={{ p: 4 }}><Typography color='error'>{error}</Typography><Button onClick={fetchJobs} sx={{ mt: 2 }}>Retry</Button></Box>

  return (
    <EntityListView<JobWithAction>
      columns={columns as any}
      data={filteredJobs as JobWithAction[]}
      flashing={flashing as FlashRow[]}
      storageKey='jm-jobs'
      title='Jobs'
      defaultColVisibility={defaultColVisibility}
      filterChips={
        <>
          {['all', ...JOB_STATUSES].map(s => (
            <Chip key={s} size='small'
              label={`${s === 'all' ? 'All' : fmtStatus(s)} (${statusCounts[s] ?? 0})`}
              variant={statusFilter === s ? 'filled' : 'outlined'}
              color={s === 'all' ? (statusFilter === 'all' ? 'primary' : 'default') : (statusFilter === s ? STATUS_COLORS[s] || 'default' : 'default')}
              onClick={() => setStatusFilter(s)}
              className='capitalize'
            />
          ))}
        </>
      }
      searchValue={globalFilter}
      onSearchChange={setGlobalFilter}
      searchPlaceholder='Search Job'
      entityName='jobs'
      onAIResult={handleAIResult}
      newButtonLabel='Add Job'
      onNewClick={() => setCreateOpen(true)}
      onExportCsv={exportToCSV}
      onExportJson={exportToJSON}
      emptyMessage='No jobs found'
      onRowDoubleClick={job => { setSelectedJob(job as unknown as Job); setDetailOpen(true) }}
      cardGrid={
        <JobCardGrid
          jobs={filteredJobs}
          onJobClick={job => { setSelectedJob(job); setDetailOpen(true) }}
        />
      }
    >
      <JobFullPageDetail
        jobId={selectedJob?.id || null}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedJob(null); fetchJobs() }}
        onEdit={() => {}}
      />
      <JobFullPageDetail
        open={createOpen}
        onClose={() => {
          setCreateOpen(false)
          setInitialClientId(null)
          setInitialQuoteId(null)
          setInitialRequestId(null)
          setInitialTaxCodeId(null)
          router.push('/jobs')
          fetchJobs()
        }}
        onEdit={() => {}}
        initialEditing={true}
        initialClientId={initialClientId}
        initialQuoteId={initialQuoteId}
        initialRequestId={initialRequestId}
        initialTaxCodeId={initialTaxCodeId}
      />
    </EntityListView>
  )
}
