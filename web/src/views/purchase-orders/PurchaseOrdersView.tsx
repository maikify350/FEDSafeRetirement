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
import PurchaseOrderFullPageDetail from './PurchaseOrderFullPageDetail'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { fmtStatus } from '@/utils/formatStatus'
import type { AISearchAction } from '@components/AISearchButton'

// ─── Local types ──────────────────────────────────────────────────────────────
interface POVendor { id: string; company: string }
interface PurchaseOrder {
  id: string; purchaseOrderNumber: string; title: string; status: string
  issueDate: string; dueDate: string | null; issuePerson: string
  subtotal: number; total: number; freight: number; discount: number
  notes: string | null; vendorMessage: string | null; trackingNumber: string | null
  vendorReferenceNumber: string | null; receivedBy: string | null; receivedByAt: string | null
  jobId: string | null; vendorId: string; vendor?: POVendor
}
type POWithAction = PurchaseOrder & { action?: string }
interface FieldDef { fieldName: string; fieldLabel: string; showInGrid: boolean; isActive: boolean }

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
const PO_STATUSES = ['Draft', 'Sent', 'Partial', 'Received', 'Closed', 'Void'] as const
const STATUS_COLORS: Record<string, 'warning' | 'info' | 'error' | 'success' | 'secondary' | 'default'> = {
  Draft: 'secondary', Sent: 'info', Partial: 'warning', Received: 'success', Closed: 'success', Void: 'secondary',
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
const exportToCSV = (rows: PurchaseOrder[]) => {
  const headers = ['PO #', 'Title', 'Vendor', 'Status', 'Issue Date', 'Due Date', 'Total', 'Tracking #']
  const data = rows.map(p => [p.purchaseOrderNumber, p.title, p.vendor?.company || '', p.status, p.issueDate || '', p.dueDate || '', String(p.total ?? ''), p.trackingNumber || ''])
  const csv = [headers.join(','), ...data.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join('\n')
  downloadBlob(csv, `purchase_orders_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;')
}
const exportToJSON = (rows: PurchaseOrder[]) => {
  downloadBlob(JSON.stringify(rows.map(p => ({ id: p.id, poNumber: p.purchaseOrderNumber, title: p.title, status: p.status, total: p.total, vendorId: p.vendorId })), null, 2), `pos_${new Date().toISOString().split('T')[0]}.json`, 'application/json')
}

const fuzzyFilter: FilterFn<POWithAction> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value); addMeta({ itemRank }); return itemRank.passed
}
const columnHelper = createColumnHelper<POWithAction>()

/**
 * Purchase orders list view with grid/card toggle, filters, and vendor lookups.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/purchase-orders/PurchaseOrdersView.tsx
 */
export default function PurchaseOrdersView() {
  const [pos, setPos] = useState<PurchaseOrder[]>([])
  const { rows: rtPos, flashing } = useRealtimeTable({ table: 'purchase_order', data: pos })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<PurchaseOrder | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [initialVendorId, setInitialVendorId] = useState<string | null>(null)
  const [initialTaxCodeId, setInitialTaxCodeId] = useState<string | null>(null)
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>([])
  const searchParams = useSearchParams()

  useEffect(() => {
    fetch(`${BACKEND}/api/custom-fields/purchase_order?includeSystem=true`)
      .then(r => r.ok ? r.json() : []).then(d => setFieldDefs(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const handleRowPrint = async (id: string) => {
    setPrintingId(id)
    try {
      const response = await fetch(`${BACKEND}/api/reports/purchase-order/${id}?format=pdf`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jm_token')}` }
      })
      if (!response.ok) throw new Error('Failed to generate report')
      const blob = await response.blob()
      window.open(window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })), '_blank')
    } catch (error) {
      console.error('Print failed:', error)
    } finally {
      setPrintingId(null)
    }
  }

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setCreateOpen(true)
      const vendorId = searchParams.get('vendorId')
      if (vendorId) setInitialVendorId(vendorId)
      const taxCodeId = searchParams.get('taxCodeId')
      if (taxCodeId) setInitialTaxCodeId(taxCodeId)
    }
    const s = searchParams.get('status'); if (s) setStatusFilter(s)
  }, [searchParams])

  const fetchPOs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${BACKEND}/api/purchase-orders`)
      if (!res.ok) throw new Error('Failed to load purchase orders')
      const data = await res.json()
      setPos(Array.isArray(data) ? data : data.data ?? [])
      setError(null)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Unknown error') } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPOs() }, [fetchPOs])

  const filtered = useMemo(() => {
    let result = statusFilter === 'all' ? rtPos : rtPos.filter(p => p.status === statusFilter)
    if (globalFilter) {
      const q = globalFilter.toLowerCase()
      result = result.filter(p => [p.purchaseOrderNumber, p.title, p.vendor?.company, p.status, p.issuePerson].some(v => v?.toLowerCase().includes(q)))
    }
    return result
  }, [rtPos, statusFilter, globalFilter])

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: pos.length }
    pos.forEach(p => { c[p.status] = (c[p.status] || 0) + 1 })
    return c
  }, [pos])

  const handleSaved = () => {
    fetchPOs()
    if (selected?.id) setDetailOpen(true); else setSelected(null)
  }

  const handleAIResult = useCallback((result: AISearchAction) => {
    if (result.action === 'filter') {
      if (result.filters.status) setStatusFilter(result.filters.status); else setStatusFilter('all')
      const terms = Object.entries(result.filters).filter(([k]) => k !== 'status').map(([, v]) => v).join(' ')
      if (terms) setGlobalFilter(terms)
    } else if (result.action === 'open_edit') {
      const q = result.search.toLowerCase()
      const found = pos.find(p => p.purchaseOrderNumber.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q) || p.vendor?.company?.toLowerCase().includes(q))
      if (found) { setSelected(found); setDetailOpen(true) } else setGlobalFilter(result.search)
    }
  }, [pos])

  const rendererMap = useMemo(() => ({
    purchaseOrderNumber: columnHelper.accessor('purchaseOrderNumber', { header: 'PO #', size: 110, cell: ({ row }) => <Typography variant='body2' fontWeight={600} color='primary'>{row.original.purchaseOrderNumber}</Typography> }),
    title: columnHelper.accessor('title', { header: 'Title', size: 200, cell: ({ row }) => <Typography variant='body2'>{row.original.title || '—'}</Typography> }),
    vendor: columnHelper.accessor(row => row.vendor?.company || '', { id: 'vendor', header: 'Vendor', size: 180, cell: ({ row }) => <Typography variant='body2' fontWeight={500}>{row.original.vendor?.company || '—'}</Typography> }),
    status: columnHelper.accessor('status', { header: 'Status', size: 110, cell: ({ row }) => <Chip variant='tonal' size='small' label={fmtStatus(row.original.status)} color={STATUS_COLORS[row.original.status] || 'default'} /> }),
    issueDate: columnHelper.accessor('issueDate', { header: 'Issued', size: 120, cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.issueDate)}</Typography> }),
    dueDate: columnHelper.accessor('dueDate', { header: 'Due Date', size: 120, cell: ({ row }) => { const overdue = !['Received','Closed','Void'].includes(row.original.status) && row.original.dueDate && new Date(row.original.dueDate) < new Date(); return <Typography variant='body2' color={overdue ? 'error' : 'text.primary'}>{fmtDate(row.original.dueDate)}</Typography> } }),
    total: columnHelper.accessor('total', { header: 'Total', size: 110, cell: ({ row }) => <Typography variant='body2' fontWeight={500} sx={{ textAlign: 'right', display: 'block' }}>{fmtMoney(row.original.total)}</Typography> }),
    subtotal: columnHelper.accessor('subtotal', { header: 'Subtotal', size: 110, cell: ({ row }) => <Typography variant='body2' sx={{ textAlign: 'right', display: 'block' }}>{fmtMoney(row.original.subtotal)}</Typography> }),
    freight: columnHelper.accessor('freight', { header: 'Freight', size: 100, cell: ({ row }) => <Typography variant='body2' sx={{ textAlign: 'right', display: 'block' }}>{fmtMoney(row.original.freight)}</Typography> }),
    discount: columnHelper.accessor('discount', { header: 'Discount', size: 100, cell: ({ row }) => <Typography variant='body2' sx={{ textAlign: 'right', display: 'block' }}>{fmtMoney(row.original.discount)}</Typography> }),
    issuePerson: columnHelper.accessor('issuePerson', { header: 'Issued By', size: 140, cell: ({ row }) => <Typography variant='body2'>{row.original.issuePerson || '—'}</Typography> }),
    trackingNumber: columnHelper.accessor('trackingNumber', { header: 'Tracking #', size: 140, cell: ({ row }) => <Typography variant='body2'>{row.original.trackingNumber || '—'}</Typography> }),
    vendorReferenceNumber: columnHelper.accessor('vendorReferenceNumber', { header: 'Vendor Ref #', size: 130, cell: ({ row }) => <Typography variant='body2'>{row.original.vendorReferenceNumber || '—'}</Typography> }),
    receivedBy: columnHelper.accessor('receivedBy', { header: 'Received By', size: 140, cell: ({ row }) => <Typography variant='body2'>{row.original.receivedBy || '—'}</Typography> }),
    receivedByAt: columnHelper.accessor('receivedByAt', { header: 'Received On', size: 130, cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.receivedByAt)}</Typography> }),
    notes: columnHelper.accessor('notes', { header: 'Notes', size: 200, cell: ({ row }) => <Typography variant='body2' noWrap>{row.original.notes || '—'}</Typography> }),
    vendorMessage: columnHelper.accessor('vendorMessage', { header: 'Vendor Message', size: 200, cell: ({ row }) => <Typography variant='body2' noWrap>{row.original.vendorMessage || '—'}</Typography> }),
    creAt: columnHelper.accessor((row: POWithAction) => (row as any).creAt ?? '', { id: 'creAt', header: 'Created Date', size: 130, cell: ({ row }) => <Typography variant='body2'>{fmtDate((row.original as any).creAt)}</Typography> }),
    modAt: columnHelper.accessor((row: POWithAction) => (row as any).modAt ?? '', { id: 'modAt', header: 'Last Modified', size: 130, cell: ({ row }) => <Typography variant='body2'>{fmtDate((row.original as any).modAt)}</Typography> }),
    creBy: columnHelper.accessor((row: POWithAction) => (row as any).creBy ?? '', { id: 'creBy', header: 'Created By', size: 140, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).creBy || '—'}</Typography> }),
    modBy: columnHelper.accessor((row: POWithAction) => (row as any).modBy ?? '', { id: 'modBy', header: 'Modified By', size: 140, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).modBy || '—'}</Typography> }),
  }), [])

  const actionCol = columnHelper.accessor('action', { header: 'Actions', size: 100, enableSorting: false,
    cell: ({ row }) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <IconButton size='small' onClick={e => { e.stopPropagation(); handleRowPrint(row.original.id) }} disabled={printingId === row.original.id}>
          {printingId === row.original.id ? <CircularProgress size={18} /> : <i className='tabler-printer text-textSecondary text-[20px]' />}
        </IconButton>
        <IconButton size='small' onClick={e => { e.stopPropagation(); setSelected(row.original); setDetailOpen(true) }}>
          <i className='tabler-edit text-textSecondary text-[22px]' />
        </IconButton>
      </Box>
    )
  })

  const selectCol = columnHelper.display({ id: 'select', header: ({ table }) => <input type='checkbox' checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} />, cell: ({ row }) => <input type='checkbox' checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} /> })

  const columns = useMemo(() => {
    if (!fieldDefs.length) return [selectCol, rendererMap.purchaseOrderNumber, rendererMap.title, rendererMap.vendor, rendererMap.status, rendererMap.issueDate, rendererMap.dueDate, rendererMap.total, rendererMap.issuePerson, actionCol]
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
  if (error) return <Box sx={{ p: 4 }}><Typography color='error'>{error}</Typography><Button onClick={fetchPOs} sx={{ mt: 2 }}>Retry</Button></Box>

  return (
    <EntityListView<POWithAction>
      columns={columns as any}
      data={filtered as POWithAction[]}
      flashing={flashing as FlashRow[]}
      storageKey='jm-pos'
      title='Purchase Orders'
      defaultColVisibility={defaultColVisibility}
      filterChips={
        <>
          {['all', ...PO_STATUSES].map(s => (
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
      searchPlaceholder='Search PO'
      entityName='purchase-orders'
      onAIResult={handleAIResult}
      newButtonLabel='Add PO'
      onNewClick={() => setCreateOpen(true)}
      onExportCsv={exportToCSV}
      onExportJson={exportToJSON}
      emptyMessage='No purchase orders found'
      onRowDoubleClick={p => { setSelected(p as unknown as PurchaseOrder); setDetailOpen(true) }}
    >
      <PurchaseOrderFullPageDetail
        poId={selected?.id || null}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelected(null); fetchPOs() }}
        onEdit={() => {}}
      />
      <PurchaseOrderFullPageDetail
        open={createOpen}
        onClose={() => { setCreateOpen(false); setInitialVendorId(null); setInitialTaxCodeId(null); fetchPOs() }}
        onEdit={() => {}}
        initialEditing={true}
        initialVendorId={initialVendorId}
        initialTaxCodeId={initialTaxCodeId}
      />
    </EntityListView>
  )
}
