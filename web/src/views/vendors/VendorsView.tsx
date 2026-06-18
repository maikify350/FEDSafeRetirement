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
import VendorFullPageDetail from './VendorFullPageDetail'
import AISearchButton, { type AISearchAction } from '@components/AISearchButton'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'

// ─── Local types (Vendor not yet in contracts.ts) ────────────────────────────
interface VendorPhone { id: string; number: string; type?: string | null; isDefault: boolean }
interface VendorEmail { id: string; address: string; type?: string | null; isDefault: boolean }
interface Vendor {
  id: string
  company: string
  name: string | null
  phone: string | null
  email: string | null
  webUrl: string | null
  street: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  category: string | null
  paymentTerms: string | null
  inactive: boolean
  tax1099: boolean
  notes: string | null
  internalNotes: string | null
  lastPurchaseDate: string | null
  phoneNumbers?: VendorPhone[]
  emails?: VendorEmail[]
}
type VendorWithAction = Vendor & { action?: string }
interface FieldDef { fieldName: string; fieldLabel: string; showInGrid: boolean; isActive: boolean }

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const downloadBlob = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.setAttribute('download', filename)
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}

const exportToCSV = (rows: Vendor[]) => {
  const headers = ['Company', 'Contact Name', 'Phone', 'Email', 'City', 'State', 'Category', 'Active', '1099']
  const data = rows.map(v => [
    v.company, v.name || '',
    v.phone || (v.phoneNumbers?.find(p => p.isDefault)?.number) || '',
    v.email || (v.emails?.find(e => e.isDefault)?.address) || '',
    v.city || '', v.state || '', v.category || '',
    v.inactive ? 'No' : 'Yes', v.tax1099 ? 'Yes' : 'No',
  ])
  const csv = [headers.join(','), ...data.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join('\n')
  downloadBlob(csv, `vendors_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;')
}

const exportToJSON = (rows: Vendor[]) => {
  downloadBlob(
    JSON.stringify(rows.map(v => ({ id: v.id, company: v.company, name: v.name, phone: v.phone, email: v.email, city: v.city, state: v.state, category: v.category, inactive: v.inactive })), null, 2),
    `vendors_${new Date().toISOString().split('T')[0]}.json`, 'application/json'
  )
}

const fuzzyFilter: FilterFn<VendorWithAction> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

const columnHelper = createColumnHelper<VendorWithAction>()

// ─── Main View ────────────────────────────────────────────────────────────────
/**
 * Vendors list view with grid/card toggle, search, and category filters.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/vendors/VendorsView.tsx
 */
export default function VendorsView() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const { rows: rtVendors, flashing } = useRealtimeTable({ table: 'vendor', data: vendors })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<Vendor | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>([])
  const searchParams = useSearchParams()

  useEffect(() => {
    fetch(`${BACKEND}/api/custom-fields/vendor?includeSystem=true`)
      .then(r => r.ok ? r.json() : []).then(d => setFieldDefs(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const handleRowPrint = async (id: string) => {
    setPrintingId(id)
    try {
      const response = await fetch(`${BACKEND}/api/reports/vendor/${id}?format=pdf`, {
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

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${BACKEND}/api/vendors`)
      if (!res.ok) throw new Error('Failed to load vendors')
      const data = await res.json()
      setVendors(Array.isArray(data) ? data : data.data ?? [])
      setError(null)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Unknown error') } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (searchParams.get('add') === '1') { setCreateOpen(true) } }, [searchParams])
  useEffect(() => { fetchVendors() }, [fetchVendors])

  const filtered = useMemo(() => {
    let base = activeFilter === 'active' ? rtVendors.filter(v => !v.inactive)
      : activeFilter === 'inactive' ? rtVendors.filter(v => v.inactive)
      : rtVendors
    if (globalFilter) {
      const q = globalFilter.toLowerCase()
      base = base.filter(v => [v.company, v.name, v.city, v.state, v.category, v.email, v.phone].some(f => f?.toLowerCase().includes(q)))
    }
    return base
  }, [rtVendors, activeFilter, globalFilter])

  const statusCounts = useMemo(() => ({
    all: vendors.length,
    active: vendors.filter(v => !v.inactive).length,
    inactive: vendors.filter(v => v.inactive).length,
  }), [vendors])

  const handleSaved = () => {
    fetchVendors()
    if (selected?.id) setDetailOpen(true); else setSelected(null)
  }

  const handleAIResult = useCallback((result: AISearchAction) => {
    if (result.action === 'filter') {
      if (result.filters.inactive === 'true') setActiveFilter('inactive')
      else if (result.filters.inactive === 'false') setActiveFilter('active')
      else setActiveFilter('all')
      const terms = Object.entries(result.filters).filter(([k]) => k !== 'inactive').map(([, v]) => v).join(' ')
      if (terms) setGlobalFilter(terms)
    } else if (result.action === 'open_edit') {
      const q = result.search.toLowerCase()
      const found = vendors.find(v => v.company?.toLowerCase().includes(q) || v.name?.toLowerCase().includes(q))
      if (found) { setSelected(found); setDetailOpen(true) } else setGlobalFilter(result.search)
    }
  }, [vendors])

  const rendererMap = useMemo(() => ({
    company: columnHelper.accessor('company', { header: 'Company', size: 220, cell: ({ row }) => (<Box><Typography variant='body2' fontWeight={600}>{row.original.company}</Typography>{row.original.inactive && <Chip size='small' label='Inactive' color='secondary' variant='outlined' sx={{ mt: 0.25, height: 16, fontSize: '0.65rem' }} />}</Box>) }),
    name: columnHelper.accessor('name', { header: 'Contact', size: 160, cell: ({ row }) => <Typography variant='body2'>{row.original.name || '—'}</Typography> }),
    phone: columnHelper.accessor(row => row.phone || row.phoneNumbers?.find(p => p.isDefault)?.number || '', { id: 'phone', header: 'Phone', size: 140, cell: ({ row }) => { const ph = row.original.phone || row.original.phoneNumbers?.find(p => p.isDefault)?.number; return <Typography variant='body2'>{ph || '—'}</Typography> } }),
    email: columnHelper.accessor(row => row.email || row.emails?.find(e => e.isDefault)?.address || '', { id: 'email', header: 'Email', size: 200, cell: ({ row }) => { const em = row.original.email || row.original.emails?.find(e => e.isDefault)?.address; return <Typography variant='body2' noWrap>{em || '—'}</Typography> } }),
    webUrl: columnHelper.accessor('webUrl', { header: 'Website', size: 180, cell: ({ row }) => row.original.webUrl ? (<Typography variant='body2' noWrap><a href={row.original.webUrl} target='_blank' rel='noreferrer' onClick={e => e.stopPropagation()} style={{ color: 'var(--mui-palette-primary-main)' }}>{row.original.webUrl.replace(/^https?:\/\//, '')}</a></Typography>) : null }),
    street: columnHelper.accessor('street', { header: 'Street', size: 200, cell: ({ row }) => <Typography variant='body2'>{row.original.street || '—'}</Typography> }),
    city: columnHelper.accessor('city', { header: 'City', size: 130, cell: ({ row }) => <Typography variant='body2'>{row.original.city || '—'}</Typography> }),
    state: columnHelper.accessor('state', { header: 'State', size: 80, cell: ({ row }) => <Typography variant='body2'>{row.original.state || '—'}</Typography> }),
    zipCode: columnHelper.accessor('zipCode', { header: 'Zip', size: 90, cell: ({ row }) => <Typography variant='body2'>{row.original.zipCode || '—'}</Typography> }),
    category: columnHelper.accessor('category', { header: 'Category', size: 130, cell: ({ row }) => row.original.category ? <Chip size='small' variant='tonal' label={row.original.category} color='default' /> : null }),
    paymentTerms: columnHelper.accessor('paymentTerms', { header: 'Terms', size: 110, cell: ({ row }) => <Typography variant='body2'>{row.original.paymentTerms || '—'}</Typography> }),
    taxCode: columnHelper.accessor((row: VendorWithAction) => (row as any).taxCode ?? '', { id: 'taxCode', header: 'Tax Code', size: 110, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).taxCode || '—'}</Typography> }),
    taxId: columnHelper.accessor((row: VendorWithAction) => (row as any).taxId ?? '', { id: 'taxId', header: 'Tax ID', size: 120, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).taxId || '—'}</Typography> }),
    glAccount: columnHelper.accessor((row: VendorWithAction) => (row as any).glAccount ?? '', { id: 'glAccount', header: 'GL Account', size: 120, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).glAccount || '—'}</Typography> }),
    inactive: columnHelper.accessor('inactive', { header: 'Inactive', size: 90, cell: ({ row }) => row.original.inactive ? <i className='tabler-check text-error text-lg' /> : null }),
    tax1099: columnHelper.accessor('tax1099', { header: '1099', size: 70, cell: ({ row }) => row.original.tax1099 ? <i className='tabler-check text-success text-lg' /> : null }),
    lastPurchaseDate: columnHelper.accessor('lastPurchaseDate', { header: 'Last Purchase', size: 130, cell: ({ row }) => <Typography variant='body2'>{row.original.lastPurchaseDate ? new Date(row.original.lastPurchaseDate).toLocaleDateString() : '—'}</Typography> }),
    notes: columnHelper.accessor('notes', { header: 'Notes', size: 200, cell: ({ row }) => <Typography variant='body2' noWrap>{row.original.notes || '—'}</Typography> }),
    internalNotes: columnHelper.accessor('internalNotes', { header: 'Internal Notes', size: 200, cell: ({ row }) => <Typography variant='body2' noWrap>{row.original.internalNotes || '—'}</Typography> }),
    creAt: columnHelper.accessor((row: VendorWithAction) => (row as any).creAt ?? '', { id: 'creAt', header: 'Created Date', size: 130, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).creAt ? new Date((row.original as any).creAt).toLocaleDateString() : '—'}</Typography> }),
    modAt: columnHelper.accessor((row: VendorWithAction) => (row as any).modAt ?? '', { id: 'modAt', header: 'Last Modified', size: 130, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).modAt ? new Date((row.original as any).modAt).toLocaleDateString() : '—'}</Typography> }),
    creBy: columnHelper.accessor((row: VendorWithAction) => (row as any).creBy ?? '', { id: 'creBy', header: 'Created By', size: 140, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).creBy || '—'}</Typography> }),
    modBy: columnHelper.accessor((row: VendorWithAction) => (row as any).modBy ?? '', { id: 'modBy', header: 'Modified By', size: 140, cell: ({ row }) => <Typography variant='body2'>{(row.original as any).modBy || '—'}</Typography> }),
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
    if (!fieldDefs.length) return [selectCol, rendererMap.company, rendererMap.name, rendererMap.phone, rendererMap.email, rendererMap.city, rendererMap.state, rendererMap.category, actionCol]
    const active = fieldDefs.filter(f => f.isActive !== false)
    const cols = active.map(f => { const r = (rendererMap as any)[f.fieldName]; if (!r) return null; const c = { ...r, id: f.fieldName }; c.columnDef = { ...r.columnDef, header: f.fieldLabel }; return c }).filter(Boolean)
    return [selectCol, ...cols, actionCol]
  }, [fieldDefs, rendererMap, printingId])

  const defaultColVisibility = useMemo(() => {
    const vis: Record<string, boolean> = {}
    fieldDefs.forEach(f => { vis[f.fieldName] = f.showInGrid })
    return vis
  }, [fieldDefs])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}><CircularProgress /></Box>
  if (error) return <Box sx={{ p: 4 }}><Typography color='error'>{error}</Typography><Button onClick={fetchVendors} sx={{ mt: 2 }}>Retry</Button></Box>

  return (
    <EntityListView<VendorWithAction>
      columns={columns as any}
      data={filtered as VendorWithAction[]}
      flashing={flashing as FlashRow[]}
      storageKey='jm-vendors'
      title='Vendors'
      defaultColVisibility={defaultColVisibility}
      filterChips={
        <>
          {(['all', 'active', 'inactive'] as const).map(f => (
            <Chip key={f}
              label={`${f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'} (${statusCounts[f]})`}
              variant={activeFilter === f ? 'filled' : 'outlined'}
              color={f === 'active' ? (activeFilter === f ? 'success' : 'default') : f === 'inactive' ? (activeFilter === f ? 'secondary' : 'default') : (activeFilter === f ? 'primary' : 'default')}
              onClick={() => setActiveFilter(f)}
              size='small'
            />
          ))}
        </>
      }
      searchValue={globalFilter}
      onSearchChange={setGlobalFilter}
      searchPlaceholder='Search Vendor'
      entityName='vendors'
      onAIResult={handleAIResult}
      newButtonLabel='New Vendor'
      onNewClick={() => setCreateOpen(true)}
      onExportCsv={exportToCSV}
      onExportJson={exportToJSON}
      emptyMessage='No vendors found'
      onRowDoubleClick={v => { setSelected(v as unknown as Vendor); setDetailOpen(true) }}
      rowBg={v => (v as unknown as Vendor).inactive ? 'var(--mui-palette-action-disabledBackground)' : undefined}
    >
      <VendorFullPageDetail
        vendorId={selected?.id || null}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelected(null); fetchVendors() }}
        onEdit={() => {}}
      />
      <VendorFullPageDetail
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onEdit={() => {}}
        initialEditing={true}
      />
    </EntityListView>
  )
}
