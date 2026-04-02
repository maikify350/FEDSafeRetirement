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
import type { FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'

import EntityListView, { type FlashRow } from '@/components/EntityListView'
import InvoiceFullPageDetail from './InvoiceFullPageDetail'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { fmtStatus } from '@/utils/formatStatus'
import type { AISearchAction } from '@components/AISearchButton'

// ─── Local types ──────────────────────────────────────────────────────────────
interface InvoiceClient { id: string; firstName: string; lastName: string; company?: string | null }
interface Invoice {
  id: string; invoiceNumber: string; title: string | null; description: string | null
  status: string | null; issueDate: string | null; dueDate: string | null; paidAt: string | null
  subtotal: number; total: number; amountPaid: number; notes: string | null
  clientId: string | null; jobId: string | null; quoteId: string | null; client?: InvoiceClient
}
type InvoiceWithAction = Invoice & { action?: string }
interface FieldDef { fieldName: string; fieldLabel: string; showInGrid: boolean; isActive: boolean }

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
const INVOICE_STATUSES = ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void'] as const
const STATUS_COLORS: Record<string, 'warning' | 'info' | 'error' | 'success' | 'secondary' | 'default'> = {
  draft: 'secondary', sent: 'info', viewed: 'info', partial: 'warning', paid: 'success', overdue: 'error', void: 'secondary',
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
const exportToCSV = (rows: Invoice[]) => {
  const headers = ['Invoice #', 'Title', 'Client', 'Status', 'Issue Date', 'Due Date', 'Total', 'Amount Paid']
  const data = rows.map(i => [i.invoiceNumber, i.title || '', i.client ? `${i.client.firstName} ${i.client.lastName}` : '', i.status || '', i.issueDate || '', i.dueDate || '', String(i.total ?? ''), String(i.amountPaid ?? '')])
  const csv = [headers.join(','), ...data.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join('\n')
  downloadBlob(csv, `invoices_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;')
}
const exportToJSON = (rows: Invoice[]) => {
  downloadBlob(JSON.stringify(rows.map(i => ({ id: i.id, invoiceNumber: i.invoiceNumber, title: i.title, status: i.status, dueDate: i.dueDate, total: i.total, amountPaid: i.amountPaid })), null, 2), `invoices_${new Date().toISOString().split('T')[0]}.json`, 'application/json')
}

const fuzzyFilter: FilterFn<InvoiceWithAction> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value); addMeta({ itemRank }); return itemRank.passed
}
const columnHelper = createColumnHelper<InvoiceWithAction>()

// ─── Main View ────────────────────────────────────────────────────────────────
/**
 * Invoices list view with grid/card toggle, filters, and payment status indicators.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/invoices/InvoicesView.tsx
 */
export default function InvoicesView() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const { rows: rtInvoices, flashing } = useRealtimeTable({ table: 'invoice', data: invoices })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [initialClientId, setInitialClientId] = useState<string | null>(null)
  const [initialJobId, setInitialJobId] = useState<string | null>(null)
  const [initialQuoteId, setInitialQuoteId] = useState<string | null>(null)
  const [initialRequestId, setInitialRequestId] = useState<string | null>(null)
  const [initialTaxCodeId, setInitialTaxCodeId] = useState<string | null>(null)
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>([])
  const searchParams = useSearchParams()

  useEffect(() => {
    fetch(`${BACKEND}/api/custom-fields/invoice?includeSystem=true`)
      .then(r => r.ok ? r.json() : []).then(d => setFieldDefs(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setCreateOpen(true)
      const clientId = searchParams.get('clientId')
      if (clientId) setInitialClientId(clientId)
      const jobId = searchParams.get('jobId')
      if (jobId) setInitialJobId(jobId)
      const quoteId = searchParams.get('quoteId')
      if (quoteId) setInitialQuoteId(quoteId)
      const requestId = searchParams.get('requestId')
      if (requestId) setInitialRequestId(requestId)
      const taxCodeId = searchParams.get('taxCodeId')
      if (taxCodeId) setInitialTaxCodeId(taxCodeId)
    }
    const editId = searchParams.get('edit')
    if (editId) {
      const invoice = invoices.find(inv => inv.id === editId)
      if (invoice) {
        setSelectedInvoiceId(editId)
        setDetailOpen(true)
      }
    }
    const s = searchParams.get('status'); if (s) setStatusFilter(s)
  }, [searchParams, invoices])

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${BACKEND}/api/invoices`)
      if (!res.ok) throw new Error('Failed to load invoices')
      const data = await res.json()
      setInvoices(Array.isArray(data) ? data : data.data ?? [])
      setError(null)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Unknown error') } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const filtered = useMemo(() => {
    if (highlightedId) return rtInvoices.filter(i => i.id === highlightedId)
    let result = rtInvoices
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter)
    if (globalFilter) {
      const q = globalFilter.toLowerCase()
      result = result.filter(i => [i.invoiceNumber, i.title, i.status, i.client?.firstName, i.client?.lastName].some(v => v?.toLowerCase().includes(q)))
    }
    return result
  }, [rtInvoices, statusFilter, globalFilter, highlightedId])

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: invoices.length }
    invoices.forEach(i => { if (i.status) c[i.status] = (c[i.status] || 0) + 1 })
    return c
  }, [invoices])

  const handleCloseDetail = () => { setDetailOpen(false); setSelectedInvoiceId(null) }

  const handleAIResult = useCallback((result: AISearchAction) => {
    if (result.action === 'filter') {
      if (result.filters.status) setStatusFilter(result.filters.status); else setStatusFilter('all')
      const terms = Object.entries(result.filters).filter(([k]) => k !== 'status').map(([, v]) => v).join(' ')
      if (terms) setGlobalFilter(terms)
    } else if (result.action === 'open_edit') {
      const q = result.search.toLowerCase()
      const found = invoices.find(i => i.invoiceNumber.toLowerCase().includes(q) || i.title?.toLowerCase().includes(q))
      if (found) { setHighlightedId(found.id); setGlobalFilter(''); setSelectedInvoiceId(found.id); setDetailOpen(true) }
      else setGlobalFilter(result.search)
    }
  }, [invoices])

  const handlePrint = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPrintingId(id)
    try {
      const response = await fetch(`${BACKEND}/api/reports/invoice/${id}?format=pdf`, {
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
    invoiceNumber: columnHelper.accessor('invoiceNumber', { header: 'Invoice #', size: 120, cell: ({ row }) => <Typography variant='body2' fontWeight={600} color='primary'>{row.original.invoiceNumber}</Typography> }),
    title: columnHelper.accessor('title', { header: 'Title', size: 220, cell: ({ row }) => <Typography variant='body2'>{row.original.title || '—'}</Typography> }),
    client: columnHelper.accessor(row => row.client ? `${row.client.firstName} ${row.client.lastName}` : '', { id: 'client', header: 'Client', size: 180, cell: ({ row }) => row.original.client ? <Typography variant='body2'>{row.original.client.firstName} {row.original.client.lastName}{row.original.client.company && <Typography component='span' variant='caption' color='text.secondary'> · {row.original.client.company}</Typography>}</Typography> : null }),
    status: columnHelper.accessor('status', { header: 'Status', size: 110, cell: ({ row }) => row.original.status ? <Chip variant='tonal' size='small' label={fmtStatus(row.original.status)} color={STATUS_COLORS[row.original.status] || 'default'} /> : null }),
    issueDate: columnHelper.accessor('issueDate', { header: 'Issue Date', size: 120, cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.issueDate)}</Typography> }),
    dueDate: columnHelper.accessor('dueDate', { header: 'Due Date', size: 120, cell: ({ row }) => { const overdue = row.original.status === 'overdue' || (!['paid', 'void'].includes(row.original.status || '') && row.original.dueDate && new Date(row.original.dueDate) < new Date()); return <Typography variant='body2' color={overdue ? 'error' : 'text.primary'}>{fmtDate(row.original.dueDate)}</Typography> } }),
    paidAt: columnHelper.accessor('paidAt', { header: 'Paid At', size: 120, cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.paidAt)}</Typography> }),
    paymentTerms: columnHelper.accessor((row: InvoiceWithAction) => (row as any).paymentTerms ?? '', { id: 'paymentTerms', header: 'Payment Terms', size: 140, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).paymentTerms || '—'}</Typography> }),
    description: columnHelper.accessor('description', { header: 'Description', size: 200, cell: ({ row }) => <Typography variant='body2' noWrap>{row.original.description || '—'}</Typography> }),
    propertyName: columnHelper.accessor((row: InvoiceWithAction) => (row as any).propertyName ?? '', { id: 'propertyName', header: 'Property Name', size: 160, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).propertyName || '—'}</Typography> }),
    propertyStreet: columnHelper.accessor((row: InvoiceWithAction) => (row as any).propertyStreet ?? '', { id: 'propertyStreet', header: 'Property Street', size: 180, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).propertyStreet || '—'}</Typography> }),
    propertyCity: columnHelper.accessor((row: InvoiceWithAction) => (row as any).propertyCity ?? '', { id: 'propertyCity', header: 'Property City', size: 140, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).propertyCity || '—'}</Typography> }),
    propertyState: columnHelper.accessor((row: InvoiceWithAction) => (row as any).propertyState ?? '', { id: 'propertyState', header: 'Property State', size: 120, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).propertyState || '—'}</Typography> }),
    propertyZipCode: columnHelper.accessor((row: InvoiceWithAction) => (row as any).propertyZipCode ?? '', { id: 'propertyZipCode', header: 'Property Zip', size: 110, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).propertyZipCode || '—'}</Typography> }),
    total: columnHelper.accessor('total', { header: 'Total', size: 110, cell: ({ row }) => <Typography variant='body2' fontWeight={500} sx={{ textAlign: 'right', display: 'block' }}>{fmtMoney(row.original.total)}</Typography> }),
    subtotal: columnHelper.accessor('subtotal', { header: 'Subtotal', size: 110, cell: ({ row }) => <Typography variant='body2' sx={{ textAlign: 'right', display: 'block' }}>{fmtMoney(row.original.subtotal)}</Typography> }),
    amountPaid: columnHelper.accessor('amountPaid', { header: 'Amount Paid', size: 110, cell: ({ row }) => <Typography variant='body2' sx={{ textAlign: 'right', display: 'block' }}>{fmtMoney(row.original.amountPaid)}</Typography> }),
    balance: columnHelper.accessor(row => row.total - row.amountPaid, { id: 'balance', header: 'Balance', size: 110, cell: ({ row }) => { const bal = row.original.total - row.original.amountPaid; return <Typography variant='body2' fontWeight={500} color={bal > 0 ? 'error' : 'success.main'} sx={{ textAlign: 'right', display: 'block' }}>{fmtMoney(bal)}</Typography> } }),
    taxRate: columnHelper.accessor((row: InvoiceWithAction) => (row as any).taxRate ?? '', { id: 'taxRate', header: 'Tax Rate', size: 90, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).taxRate != null ? `${(row.original as any).taxRate}%` : '—'}</Typography> }),
    discountValue: columnHelper.accessor((row: InvoiceWithAction) => (row as any).discountValue ?? '', { id: 'discountValue', header: 'Discount', size: 100, cell: ({ row }) => <Typography variant='body2'>{fmtMoney((row.original as any).discountValue)}</Typography> }),
    assignedTo: columnHelper.accessor((row: InvoiceWithAction) => (row as any).assignedTo?.name || '', { id: 'assignedTo', header: 'Assigned To', size: 140, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).assignedTo?.name || '—'}</Typography> }),
    notes: columnHelper.accessor('notes', { header: 'Notes', size: 200, cell: ({ row }) => <Typography variant='body2' noWrap>{row.original.notes || '—'}</Typography> }),
    creAt: columnHelper.accessor((row: InvoiceWithAction) => (row as any).creAt ?? '', { id: 'creAt', header: 'Created Date', size: 130, cell: ({ row }) => <Typography variant='body2'>{fmtDate((row.original as any).creAt)}</Typography> }),
    modAt: columnHelper.accessor((row: InvoiceWithAction) => (row as any).modAt ?? '', { id: 'modAt', header: 'Last Modified', size: 130, cell: ({ row }) => <Typography variant='body2'>{fmtDate((row.original as any).modAt)}</Typography> }),
    creBy: columnHelper.accessor((row: InvoiceWithAction) => (row as any).creBy ?? '', { id: 'creBy', header: 'Created By', size: 140, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).creBy || '—'}</Typography> }),
    modBy: columnHelper.accessor((row: InvoiceWithAction) => (row as any).modBy ?? '', { id: 'modBy', header: 'Modified By', size: 140, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).modBy || '—'}</Typography> }),
  }), [])

  const actionCol = columnHelper.accessor('action', { header: 'Actions', size: 100, enableSorting: false,
    cell: ({ row }) => (
      <div className='flex items-center'>
        <IconButton size='small' onClick={e => { e.stopPropagation(); setSelectedInvoiceId(row.original.id); setDetailOpen(true) }}>
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
    if (!fieldDefs.length) return [selectCol, rendererMap.invoiceNumber, rendererMap.title, rendererMap.client, rendererMap.status, rendererMap.issueDate, rendererMap.dueDate, rendererMap.total, rendererMap.amountPaid, actionCol]
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
  if (error) return <Box sx={{ p: 4 }}><Typography color='error'>{error}</Typography><Button onClick={fetchInvoices} sx={{ mt: 2 }}>Retry</Button></Box>

  return (
    <EntityListView<InvoiceWithAction>
      columns={columns as any}
      data={filtered as InvoiceWithAction[]}
      flashing={flashing as FlashRow[]}
      storageKey='jm-invoices'
      title='Invoices'
      defaultColVisibility={defaultColVisibility}
      filterChips={
        <>
          {['all', ...INVOICE_STATUSES].map(s => (
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
      searchPlaceholder='Search Invoices'
      entityName='invoices'
      onAIResult={handleAIResult}
      newButtonLabel='New Invoice'
      onNewClick={() => setCreateOpen(true)}
      onExportCsv={exportToCSV}
      onExportJson={exportToJSON}
      emptyMessage='No invoices found'
      onRowDoubleClick={inv => { setSelectedInvoiceId((inv as unknown as Invoice).id); setDetailOpen(true) }}
    >
      <InvoiceFullPageDetail
        invoiceId={selectedInvoiceId}
        open={detailOpen}
        onClose={() => { handleCloseDetail(); fetchInvoices() }}
        onEdit={() => {}}
      />
      <InvoiceFullPageDetail
        open={createOpen}
        onClose={() => {
          setCreateOpen(false)
          setInitialClientId(null)
          setInitialJobId(null)
          setInitialQuoteId(null)
          setInitialRequestId(null)
          setInitialTaxCodeId(null)
          router.push('/invoices')
          fetchInvoices()
        }}
        onEdit={() => {}}
        initialEditing={true}
        initialClientId={initialClientId}
        initialJobId={initialJobId}
        initialQuoteId={initialQuoteId}
        initialRequestId={initialRequestId}
        initialTaxCodeId={initialTaxCodeId}
      />
    </EntityListView>
  )
}
