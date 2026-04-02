'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Button from '@mui/material/Button'

import { createColumnHelper } from '@tanstack/react-table'
import type { FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'

import EntityListView, { type FlashRow } from '@/components/EntityListView'
import QuoteFullPageDetail from './QuoteFullPageDetail'

import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { fmtStatus } from '@/utils/formatStatus'
import type { AISearchAction } from '@components/AISearchButton'
import type { Quote } from '@shared/contracts'

const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'declined', 'expired'] as const
type QuoteWithAction = Quote & { action?: string }
interface FieldDef { fieldName: string; fieldLabel: string; showInGrid: boolean; isActive: boolean }

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

const STATUS_COLORS: Record<string, 'warning' | 'info' | 'error' | 'success' | 'secondary' | 'default'> = {
  draft: 'secondary', sent: 'info', accepted: 'success', declined: 'error', expired: 'warning',
}

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
const exportToCSV = (quotes: Quote[]) => {
  const headers = ['Quote #', 'Title', 'Client', 'Status', 'Issue Date', 'Expiry Date', 'Total']
  const rows = quotes.map(q => [q.quoteNumber, q.title, q.client ? `${q.client.firstName} ${q.client.lastName}` : '', q.status, q.issueDate, q.expiryDate || '', String(q.total ?? '')])
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join('\n')
  downloadBlob(csv, `quotes_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;')
}
const exportToJSON = (quotes: Quote[]) => {
  downloadBlob(JSON.stringify(quotes.map(q => ({ id: q.id, quoteNumber: q.quoteNumber, title: q.title, status: q.status, issueDate: q.issueDate, total: q.total })), null, 2), `quotes_${new Date().toISOString().split('T')[0]}.json`, 'application/json')
}

const fuzzyFilter: FilterFn<QuoteWithAction> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value); addMeta({ itemRank }); return itemRank.passed
}
const columnHelper = createColumnHelper<QuoteWithAction>()

/**
 * Quotes list view with grid/card toggle, filters, and create actions.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/quotes/QuotesView.tsx
 */
export default function QuotesView() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const { rows: rtQuotes, flashing } = useRealtimeTable({ table: 'quote', data: quotes })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [initialClientId, setInitialClientId] = useState<string | null>(null)
  const [initialRequestId, setInitialRequestId] = useState<string | null>(null)
  const [initialTaxCodeId, setInitialTaxCodeId] = useState<string | null>(null)
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>([])
  const searchParams = useSearchParams()

  useEffect(() => {
    fetch(`${BACKEND}/api/custom-fields/quote?includeSystem=true`)
      .then(r => r.ok ? r.json() : []).then(d => setFieldDefs(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setCreateOpen(true)
      const clientId = searchParams.get('clientId')
      if (clientId) setInitialClientId(clientId)
      const requestId = searchParams.get('requestId')
      if (requestId) setInitialRequestId(requestId)
      const taxCodeId = searchParams.get('taxCodeId')
      if (taxCodeId) setInitialTaxCodeId(taxCodeId)
    }
    const editId = searchParams.get('edit'); if (editId) { setSelectedQuoteId(editId); setDetailOpen(true) }
    const s = searchParams.get('status'); if (s) setStatusFilter(s)
  }, [searchParams])

  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${BACKEND}/api/quotes`)
      if (!res.ok) throw new Error('Failed to load quotes')
      const data = await res.json()
      setQuotes(Array.isArray(data) ? data : data.data ?? [])
      setError(null)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Unknown error') } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchQuotes() }, [fetchQuotes])

  const filtered = useMemo(() => {
    if (highlightedId) return rtQuotes.filter(q => q.id === highlightedId)
    let result = rtQuotes
    if (statusFilter !== 'all') result = result.filter(q => q.status === statusFilter)
    if (globalFilter) {
      const q2 = globalFilter.toLowerCase()
      result = result.filter(q => [q.quoteNumber, q.title, q.status, q.client?.firstName, q.client?.lastName].some(v => v?.toLowerCase().includes(q2)))
    }
    return result
  }, [rtQuotes, statusFilter, globalFilter, highlightedId])

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: quotes.length }
    quotes.forEach(q => { c[q.status] = (c[q.status] || 0) + 1 })
    return c
  }, [quotes])

  const handleCloseDetail = () => { setDetailOpen(false); setSelectedQuoteId(null) }

  const handleAIResult = useCallback((result: AISearchAction) => {
    if (result.action === 'filter') {
      if (result.filters.status) setStatusFilter(result.filters.status); else setStatusFilter('all')
      const terms = Object.entries(result.filters).filter(([k]) => k !== 'status').map(([, v]) => v).join(' ')
      if (terms) setGlobalFilter(terms)
    } else if (result.action === 'open_edit') {
      const q = result.search.toLowerCase()
      const found = quotes.find(qt => qt.quoteNumber?.toLowerCase().includes(q) || qt.title?.toLowerCase().includes(q))
      if (found) { setHighlightedId(found.id); setGlobalFilter(''); setSelectedQuoteId(found.id); setDetailOpen(true) }
      else setGlobalFilter(result.search)
    }
  }, [quotes])

  const handlePrint = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPrintingId(id)
    try {
      const response = await fetch(`${BACKEND}/api/reports/quote/${id}?format=pdf`, {
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

  const rendererMap = useMemo(() => ({
    quoteNumber: columnHelper.accessor('quoteNumber', { header: 'Quote #', size: 110, cell: ({ row }) => <Typography variant='body2' fontWeight={600} color='primary'>{row.original.quoteNumber}</Typography> }),
    title: columnHelper.accessor('title', { header: 'Title', size: 220, cell: ({ row }) => <Typography variant='body2'>{row.original.title}</Typography> }),
    client: columnHelper.accessor((row: QuoteWithAction) => row.client ? `${row.client.firstName} ${row.client.lastName}` : '', { id: 'client', header: 'Client', size: 180, cell: ({ row }) => row.original.client ? <Typography variant='body2'>{row.original.client.firstName} {row.original.client.lastName}{row.original.client.company && <Typography component='span' variant='caption' color='text.secondary'> · {row.original.client.company}</Typography>}</Typography> : null }),
    status: columnHelper.accessor('status', { header: 'Status', size: 110, cell: ({ row }) => <Chip variant='tonal' size='small' label={fmtStatus(row.original.status)} color={STATUS_COLORS[row.original.status] || 'default'} /> }),
    issueDate: columnHelper.accessor('issueDate', { header: 'Issue Date', size: 120, cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.issueDate)}</Typography> }),
    expiryDate: columnHelper.accessor('expiryDate', { header: 'Expiry Date', size: 120, cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.expiryDate)}</Typography> }),
    jobType: columnHelper.accessor('jobType', { header: 'Job Type', size: 140, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).jobType || '—'}</Typography> }),
    description: columnHelper.accessor('description', { header: 'Description', size: 200, cell: ({ row }) => <Typography variant='body2' noWrap>{row.original.description || '—'}</Typography> }),
    propertyName: columnHelper.accessor('propertyName', { header: 'Property Name', size: 160, cell: ({ row }) => <Typography variant='body2'>{row.original.propertyName || '—'}</Typography> }),
    propertyStreet: columnHelper.accessor('propertyStreet', { header: 'Property Street', size: 180, cell: ({ row }) => <Typography variant='body2'>{row.original.propertyStreet || '—'}</Typography> }),
    propertyCity: columnHelper.accessor('propertyCity', { header: 'Property City', size: 140, cell: ({ row }) => <Typography variant='body2'>{row.original.propertyCity || '—'}</Typography> }),
    propertyState: columnHelper.accessor('propertyState', { header: 'Property State', size: 120, cell: ({ row }) => <Typography variant='body2'>{(row.original.propertyState as any) || '—'}</Typography> }),
    propertyZipCode: columnHelper.accessor('propertyZipCode', { header: 'Property Zip', size: 110, cell: ({ row }) => <Typography variant='body2'>{row.original.propertyZipCode || '—'}</Typography> }),
    total: columnHelper.accessor('total', { header: 'Total', size: 110, cell: ({ row }) => <Typography variant='body2' fontWeight={500} sx={{ textAlign: 'right', display: 'block' }}>{fmtMoney(row.original.total)}</Typography> }),
    subtotal: columnHelper.accessor('subtotal', { header: 'Subtotal', size: 110, cell: ({ row }) => <Typography variant='body2' sx={{ textAlign: 'right' }}>{fmtMoney(row.original.subtotal)}</Typography> }),
    taxRate: columnHelper.accessor('taxRate', { header: 'Tax Rate', size: 90, cell: ({ row }) => <Typography variant='body2'>{row.original.taxRate != null ? `${row.original.taxRate}%` : '—'}</Typography> }),
    discountValue: columnHelper.accessor('discountValue', { header: 'Discount', size: 100, cell: ({ row }) => <Typography variant='body2'>{fmtMoney(row.original.discountValue)}</Typography> }),
    assignedTo: columnHelper.accessor((row: QuoteWithAction) => row.assignedTo?.name || '', { id: 'assignedTo', header: 'Assigned To', size: 140, cell: ({ row }) => <Typography variant='body2'>{row.original.assignedTo?.name || '—'}</Typography> }),
    signedByName: columnHelper.accessor('signedByName', { header: 'Signed By', size: 140, cell: ({ row }) => <Typography variant='body2'>{row.original.signedByName || '—'}</Typography> }),
    signedAt: columnHelper.accessor('signedAt', { header: 'Signed At', size: 130, cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.signedAt)}</Typography> }),
    notes: columnHelper.accessor('notes', { header: 'Notes', size: 200, cell: ({ row }) => <Typography variant='body2' noWrap>{row.original.notes || '—'}</Typography> }),
    customerMessage: columnHelper.accessor('customerMessage', { header: 'Customer Message', size: 200, cell: ({ row }) => <Typography variant='body2' noWrap>{row.original.customerMessage || '—'}</Typography> }),
    creAt: columnHelper.accessor('creAt', { header: 'Created Date', size: 130, cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.creAt)}</Typography> }),
    modAt: columnHelper.accessor('modAt', { header: 'Last Modified', size: 130, cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.modAt)}</Typography> }),
    creBy: columnHelper.accessor('creBy', { header: 'Created By', size: 140, cell: ({ row }) => <Typography variant='body2'>{row.original.creBy || '—'}</Typography> }),
    modBy: columnHelper.accessor('modBy', { header: 'Modified By', size: 140, cell: ({ row }) => <Typography variant='body2'>{row.original.modBy || '—'}</Typography> }),
  }), [])

  const actionCol = columnHelper.accessor('action', { header: 'Actions', size: 100, enableSorting: false,
    cell: ({ row }) => (
      <div className='flex items-center'>
        <IconButton size='small' onClick={e => { e.stopPropagation(); setSelectedQuoteId(row.original.id); setDetailOpen(true) }}>
          <i className='tabler-edit text-textSecondary text-[22px]' />
        </IconButton>
        <IconButton size='small' onClick={e => handlePrint(row.original.id, e)} disabled={printingId === row.original.id}>
          {printingId === row.original.id ? <CircularProgress size={22} color='inherit' /> : <i className='tabler-printer text-textSecondary text-[22px]' />}
        </IconButton>
      </div>
    )
  })

  const selectCol = columnHelper.display({ id: 'select', header: ({ table }) => <input type='checkbox' checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} />, cell: ({ row }) => <input type='checkbox' checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} /> })

  const columns = useMemo(() => {
    if (!fieldDefs.length) return [selectCol, rendererMap.quoteNumber, rendererMap.title, rendererMap.client, rendererMap.status, rendererMap.issueDate, rendererMap.expiryDate, rendererMap.total, actionCol]
    const active = fieldDefs.filter(f => f.isActive !== false)
    const cols = active.map(f => { const r = (rendererMap as any)[f.fieldName]; if (!r) return null; const c = { ...r, id: f.fieldName }; c.columnDef = { ...r.columnDef, header: f.fieldLabel }; return c }).filter(Boolean)
    return [selectCol, ...cols, actionCol]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldDefs, rendererMap, printingId])

  const defaultColVisibility = useMemo(() => {
    const vis: Record<string, boolean> = {}
    fieldDefs.forEach(f => { vis[f.fieldName] = f.showInGrid })
    return vis
  }, [fieldDefs])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}><CircularProgress /></Box>
  if (error) return <Box sx={{ p: 4 }}><Typography color='error'>{error}</Typography><Button onClick={fetchQuotes} sx={{ mt: 2 }}>Retry</Button></Box>

  return (
    <EntityListView<QuoteWithAction>
      columns={columns as any}
      data={filtered as QuoteWithAction[]}
      flashing={flashing as FlashRow[]}
      storageKey='jm-quotes'
      title='Quotes'
      defaultColVisibility={defaultColVisibility}
      filterChips={
        <>
          {['all', ...QUOTE_STATUSES].map(s => (
            <Chip key={s} size='small'
              label={`${s === 'all' ? 'All' : fmtStatus(s)} (${statusCounts[s] ?? 0})`}
              variant={statusFilter === s ? 'filled' : 'outlined'}
              color={s === 'all' ? (statusFilter === 'all' ? 'primary' : 'default') : (statusFilter === s ? STATUS_COLORS[s] || 'default' : 'default')}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </>
      }
      searchValue={globalFilter}
      onSearchChange={setGlobalFilter}
      searchPlaceholder='Search Quote'
      entityName='quotes'
      onAIResult={handleAIResult}
      newButtonLabel='New Quote'
      onNewClick={() => setCreateOpen(true)}
      onExportCsv={exportToCSV}
      onExportJson={exportToJSON}
      emptyMessage='No quotes found'
      onRowDoubleClick={q => { setSelectedQuoteId((q as unknown as Quote).id); setDetailOpen(true) }}

    >
      <QuoteFullPageDetail
        quoteId={selectedQuoteId}
        open={detailOpen}
        onClose={() => { handleCloseDetail(); fetchQuotes() }}
        onEdit={() => {}}
      />
      <QuoteFullPageDetail
        open={createOpen}
        onClose={() => { setCreateOpen(false); setInitialClientId(null); setInitialRequestId(null); setInitialTaxCodeId(null); fetchQuotes() }}
        onEdit={() => {}}
        initialEditing={true}
        initialClientId={initialClientId}
        initialRequestId={initialRequestId}
        initialTaxCodeId={initialTaxCodeId}
      />
    </EntityListView>
  )
}
