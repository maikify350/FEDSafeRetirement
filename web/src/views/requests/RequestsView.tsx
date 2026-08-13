'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'

import { createColumnHelper } from '@tanstack/react-table'
import type { FilterFn, ColumnFiltersState } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'

import EntityListView, { type FlashRow } from '@/components/EntityListView'
import RequestCardGrid from './RequestCardGrid'
import RequestFullPageDetail from './RequestFullPageDetail'
import ContactLink from '@components/ContactLink'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import useFavorites from '@/hooks/useFavorites'
import { fmtStatus } from '@/utils/formatStatus'
import { api } from '@/lib/api'
import type { AISearchAction } from '@components/AISearchButton'
import type { Request, CustomFieldDefinition } from '@shared/contracts'

type RequestWithAction = Request & { action?: string }

const statusChipColors: Record<string, 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error' | 'secondary'> = {
  New: 'info', 'Assessment Scheduled': 'secondary', 'Assessment Complete': 'success',
  'Pending Review': 'warning', Approved: 'success', Converted: 'primary', 'On Hold': 'default', Archived: 'default',
}

const downloadBlob = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.setAttribute('download', filename)
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}
const exportToCSV = (requests: Request[]) => {
  const headers = ['Title', 'Client', 'Status', 'Assessment Date', 'Assigned To', 'City', 'State', 'Phone']
  const rows = requests.map(r => [r.title, r.client ? `${r.client.firstName || ''} ${r.client.lastName || ''}`.trim() : '', r.status || '', r.assessmentDate || '', r.assignedTo?.name || '', r.city || '', r.state || '', r.clientPhone || ''])
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join('\n')
  downloadBlob(csv, `requests_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;')
}
const exportToJSON = (requests: Request[]) => {
  downloadBlob(JSON.stringify(requests.map(r => ({ id: r.id, title: r.title, status: r.status, city: r.city, state: r.state, clientPhone: r.clientPhone })), null, 2), `requests_${new Date().toISOString().split('T')[0]}.json`, 'application/json')
}

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const fuzzyFilter: FilterFn<RequestWithAction> = (row, columnId, value, addMeta) => {
  const r = row.original
  const clientName = r.client ? `${r.client.firstName || ''} ${r.client.lastName || ''} ${r.client.company || ''}`.trim() : ''
  const searchable = [r.title, r.description, r.status, clientName, r.city, r.state, r.assignedTo?.name, r.clientPhone].filter(Boolean).join(' ')
  const itemRank = rankItem(searchable, value); addMeta({ itemRank }); return itemRank.passed
}
const columnHelper = createColumnHelper<RequestWithAction>()

/**
 * Requests list view with grid/card toggle, filters, and status management.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/requests/RequestsView.tsx
 */
export default function RequestsView() {
  const [requests, setRequests] = useState<Request[]>([])
  const { rows: rtRequests, flashing } = useRealtimeTable({ table: 'request', data: requests })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [initialClientId, setInitialClientId] = useState<string | null>(null)
  const [initialTaxCodeId, setInitialTaxCodeId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const { isFavorite, toggleFavorite, favoriteIds, setFavoriteIds } = useFavorites('jm-requests-favorites')

  // Fetch custom fields for the Entity
  const { data: customFields = [] } = useQuery({
    queryKey: ['custom-fields', 'request'],
    queryFn: () => api.get<CustomFieldDefinition[]>('/api/custom-fields/request?includeSystem=true')
  })

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setCreateOpen(true)
      const clientId = searchParams.get('clientId')
      if (clientId) setInitialClientId(clientId)
      const taxCodeId = searchParams.get('taxCodeId')
      if (taxCodeId) setInitialTaxCodeId(taxCodeId)
    }
    const s = searchParams.get('status'); if (s) setStatusFilter(s)
  }, [searchParams])

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      const raw = await api.get<Request[] | { data: Request[] }>('/api/requests?limit=1000')
      const loaded = (Array.isArray(raw) ? raw : ((raw as any).data ?? [])) as Request[]
      setRequests(loaded); setError('')
      const existingIds = new Set(loaded.map(r => r.id))
      setFavoriteIds(prev => prev.filter(id => existingIds.has(id)))
    } catch { setError('Unable to load requests. Check backend connection.') } finally { setLoading(false) }
  }, [setFavoriteIds])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const allStatuses = useMemo(() => [...new Set(requests.map(r => r.status).filter(Boolean))] as string[], [requests])

  const filtered = useMemo(() => {
    if (highlightedId) return rtRequests.filter(r => r.id === highlightedId)
    let result = rtRequests
    if (statusFilter === 'favorites') result = result.filter(r => isFavorite(r.id))
    else if (statusFilter === 'web') result = result.filter(r => r.tags?.includes('online-booking') || (r as any).leadSource?.includes('Booking'))
    else if (statusFilter !== 'all') result = result.filter(r => r.status === statusFilter)
    if (globalFilter) {
      const q = globalFilter.toLowerCase()
      result = result.filter(r => [r.title, r.description, r.status, r.city, r.state, r.client ? `${r.client.firstName} ${r.client.lastName}` : ''].some(v => v?.toLowerCase().includes(q)))
    }
    return result
  }, [rtRequests, statusFilter, isFavorite, highlightedId, globalFilter])

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {
      all: requests.length,
      favorites: favoriteIds.length,
      web: requests.filter(r => r.tags?.includes('online-booking') || (r as any).leadSource?.includes('Booking')).length,
    }
    requests.forEach(r => { if (r.status) c[r.status] = (c[r.status] || 0) + 1 })
    return c
  }, [requests, favoriteIds])

  const handleCloseDetail = () => { setDetailPanelOpen(false); setSelectedRequestId(null) }

  const handleAIResult = useCallback((result: AISearchAction) => {
    if (result.action === 'filter') {
      if (result.filters.status) setStatusFilter(result.filters.status); else setStatusFilter('all')
      const terms = Object.entries(result.filters).filter(([k]) => k !== 'status').map(([, v]) => v).join(' ')
      if (terms) setGlobalFilter(terms)
    } else if (result.action === 'open_edit') {
      const q = result.search.toLowerCase()
      const found = requests.find(r => r.title.toLowerCase().includes(q) || `${r.client?.firstName || ''} ${r.client?.lastName || ''}`.toLowerCase().includes(q))
      if (found) { setHighlightedId(found.id); setGlobalFilter(''); setSelectedRequestId(found.id); setDetailPanelOpen(true) }
      else setGlobalFilter(result.search)
    }
  }, [requests])

  const handlePrint = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPrintingId(id)
    try {
      const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
      const response = await fetch(`${BACKEND}/api/reports/request/${id}?format=pdf`, {
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

  const columns = useMemo(() => {
    // 1. Define custom renderers for native UI fields
    const rendererMap: Record<string, any> = {
      requestNumber: columnHelper.accessor((row: RequestWithAction) => row.requestNumber ?? '', {
        id: 'requestNumber', header: 'Req #', size: 130,
        cell: ({ row }) => <Typography variant='body2' fontWeight={600} color='primary'>{row.original.requestNumber || '—'}</Typography>
      }),
      title: columnHelper.accessor('title', { header: 'Title', size: 230,
        cell: ({ row }) => <Typography variant='body2' fontWeight={500}>{row.original.title}</Typography>
      }),
      client: columnHelper.accessor((row: RequestWithAction) => row.client ? (row.client.useCompanyName && row.client.company ? row.client.company : `${row.client.firstName || ''} ${row.client.lastName || ''}`.trim()) : '', {
        id: 'client', header: 'Client', size: 200,
        cell: ({ row }) => { const c = row.original.client; if (!c) return null; const name = c.useCompanyName && c.company ? c.company : `${c.firstName || ''} ${c.lastName || ''}`.trim(); return <Typography variant='body2'>{name}</Typography> }
      }),
      status: columnHelper.accessor('status', { header: 'Status', size: 170,
        cell: ({ row }) => row.original.status ? <Chip variant='tonal' size='small' label={fmtStatus(row.original.status)} color={statusChipColors[row.original.status] ?? 'default'} /> : null
      }),
      assessmentDate: columnHelper.accessor('assessmentDate', { header: 'Assessment Date', size: 130,
        cell: ({ row }) => <Typography variant='body2'>{fmtDate(row.original.assessmentDate)}</Typography>
      }),
      assignedTo: columnHelper.accessor((row: RequestWithAction) => row.assignedTo?.name || '', {
        id: 'assignedTo', header: 'Assigned To', size: 150,
        cell: ({ row }) => <Typography variant='body2'>{row.original.assignedTo?.name || '—'}</Typography>
      }),
      amount: columnHelper.accessor((row: RequestWithAction) => {
        const lineItems = (row as any).lineItems ?? []
        return lineItems.reduce((sum: number, item: any) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0)
      }, {
        id: 'amount', header: 'Amount', size: 120,
        cell: ({ row }) => {
          const lineItems = (row.original as any).lineItems ?? []
          const total = lineItems.reduce((sum: number, item: any) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0)
          return total > 0 ? <Typography variant='body2' fontWeight={600}>${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography> : <Typography variant='body2'>—</Typography>
        }
      }),
      clientPhone: columnHelper.accessor((row: RequestWithAction) => row.clientPhone || '', {
        id: 'clientPhone', header: 'Phone', size: 140,
        cell: ({ row }) => row.original.clientPhone ? <ContactLink type='phone' value={row.original.clientPhone} /> : null
      }),
      city: columnHelper.accessor('city', { header: 'City', size: 120, cell: ({ row }) => <Typography variant='body2'>{row.original.city || '—'}</Typography> }),
      state: columnHelper.accessor('state', { header: 'State', size: 80, cell: ({ row }) => <Typography variant='body2'>{row.original.state || '—'}</Typography> }),
      description: columnHelper.accessor('description', { header: 'Description', size: 200, cell: ({ row }) => <Typography variant='body2' noWrap>{row.original.description || '—'}</Typography> }),
      creAt: columnHelper.accessor('creAt', { header: 'Created Date', size: 130,
        cell: ({ row }) => { const d = row.original.creAt ? new Date(row.original.creAt) : null; return d ? <Typography variant='body2'>{d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</Typography> : null }
      }),
      clientEmail: columnHelper.accessor('clientEmail', { header: 'Client Email', size: 180, cell: ({ row }) => row.original.clientEmail ? <ContactLink type='email' value={row.original.clientEmail} /> : null }),
      propertyName: columnHelper.accessor('propertyName', { header: 'Property Name', size: 150, cell: ({ row }) => <Typography variant='body2'>{row.original.propertyName || '—'}</Typography> }),
      street: columnHelper.accessor('street', { header: 'Street', size: 180, cell: ({ row }) => <Typography variant='body2'>{row.original.street || '—'}</Typography> }),
      street2: columnHelper.accessor('street2', { header: 'Street 2', size: 100, cell: ({ row }) => <Typography variant='body2'>{row.original.street2 || '—'}</Typography> }),
      zipCode: columnHelper.accessor('zipCode', { header: 'Zip Code', size: 100, cell: ({ row }) => <Typography variant='body2'>{row.original.zipCode || '—'}</Typography> }),
      customerMessage: columnHelper.accessor('customerMessage', { header: 'Message', size: 200, cell: ({ row }) => <Typography variant='body2' noWrap>{row.original.customerMessage || '—'}</Typography> }),
      internalNotes: columnHelper.accessor('internalNotes', { header: 'Internal Notes', size: 200, cell: ({ row }) => <Typography variant='body2' noWrap>{row.original.internalNotes || '—'}</Typography> }),
      tags: columnHelper.accessor('tags', { header: 'Tags', size: 150, cell: ({ row }) => <Typography variant='body2'>{row.original.tags || '—'}</Typography> }),
      modAt: columnHelper.accessor('modAt', { header: 'Last Modified', size: 150,
        cell: ({ row }) => { const d = row.original.modAt ? new Date(row.original.modAt) : null; return d ? <Typography variant='body2'>{d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</Typography> : null }
      }),
      creBy: columnHelper.accessor('creBy', { header: 'Created By', size: 140, cell: ({ row }) => <Typography variant='body2'>{row.original.creBy || '—'}</Typography> }),
      modBy: columnHelper.accessor('modBy', { header: 'Modified By', size: 140, cell: ({ row }) => <Typography variant='body2'>{row.original.modBy || '—'}</Typography> })
    }

    const selectCol = columnHelper.display({
      id: 'select',
      header: ({ table }) => <input type='checkbox' checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} />,
      cell: ({ row }) => <input type='checkbox' checked={row.getIsSelected()} onChange={e => { e.stopPropagation(); row.getToggleSelectedHandler()(e) }} />,
    })

    const actionCol = columnHelper.accessor('action', { header: 'Actions', size: 100, enableSorting: false,
      cell: ({ row }) => (
        <div className='flex items-center'>
          <IconButton size='small' onClick={e => { e.stopPropagation(); setSelectedRequestId(row.original.id); setDetailPanelOpen(true) }}>
            <i className='tabler-eye text-textSecondary text-[22px]' />
          </IconButton>
          <IconButton size='small' onClick={e => handlePrint(row.original.id, e)} disabled={printingId === row.original.id}>
            {printingId === row.original.id
              ? <CircularProgress size={22} color='inherit' />
              : <i className='tabler-printer text-textSecondary text-[22px]' />}
          </IconButton>
        </div>
      )
    })

    // 2. Build columns from ALL active field definitions (showInGrid=false means hidden by default,
    //    not excluded — all fields must be in the table to appear in the column picker).
    const allActiveFields = customFields.filter(f => f.isActive)
    
    const hasSystemFields = allActiveFields.some(f => f.isSystem)
    let dynamicCols: any[] = []

    if (!hasSystemFields && allActiveFields.length === 0) {
      dynamicCols = Object.values(rendererMap)
    } else {
      const orderedFields = [...allActiveFields].sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      dynamicCols = orderedFields.map(field => {
        if (field.isSystem && rendererMap[field.fieldName]) {
           const def = rendererMap[field.fieldName]
           const colDef = typeof def.accessorFn !== 'undefined' ? { ...def } : { ...def, id: field.fieldName }
           if (colDef.header) colDef.header = field.fieldLabel
           return colDef
        }
        return columnHelper.accessor((row: any) => row.customFields?.[field.fieldName], {
          id: `cf_${field.fieldName}`,
          header: field.fieldLabel,
          size: 150,
          enableSorting: true,
          cell: ({ getValue }) => {
            const val = getValue()
            if (val === undefined || val === null || val === '') return <Typography className='text-sm' color='text.disabled'>—</Typography>
            if (field.fieldType === 'boolean') return <Typography className='text-sm'>{val ? 'Yes' : 'No'}</Typography>
            if (field.fieldType === 'date') return <Typography className='text-sm'>{new Date(val as string).toLocaleDateString()}</Typography>
            return <Typography className='text-sm'>{String(val)}</Typography>
          }
        })
      })
    }

    return [selectCol, ...dynamicCols, actionCol]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printingId, customFields])

  // Compute default column visibility from DB metadata
  const colVisibility = useMemo(() => {
    const vis: Record<string, boolean> = {}
    customFields.filter(f => f.isActive).forEach(f => {
      const id = f.isSystem ? f.fieldName : `cf_${f.fieldName}`
      vis[id] = f.showInGrid
    })
    return vis
  }, [customFields])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}><CircularProgress /></Box>
  if (error) return <Box sx={{ p: 4 }}><Typography color='error'>{error}</Typography><Button onClick={fetchRequests} sx={{ mt: 2 }}>Retry</Button></Box>

  return (
    <EntityListView<RequestWithAction>
      columns={columns as any}
      data={filtered as RequestWithAction[]}
      flashing={flashing as FlashRow[]}
      storageKey='jm-requests'
      title='Requests'
      defaultColVisibility={colVisibility}
      filterChips={
        <>
          <Chip icon={<i className='tabler-star text-[14px]' />}
            label={`Favorites (${statusCounts.favorites || 0})`}
            variant={statusFilter === 'favorites' ? 'filled' : 'outlined'}
            color={statusFilter === 'favorites' ? 'warning' : 'default'}
            onClick={() => setStatusFilter('favorites')} size='small'
          />
          <Chip label={`All (${statusCounts.all || 0})`} variant={statusFilter === 'all' ? 'filled' : 'outlined'} color={statusFilter === 'all' ? 'primary' : 'default'} onClick={() => setStatusFilter('all')} size='small' />
          <Chip
            icon={<i className='tabler-world text-[14px]' />}
            label={`Web (${statusCounts.web || 0})`}
            variant={statusFilter === 'web' ? 'filled' : 'outlined'}
            color={statusFilter === 'web' ? 'info' : 'default'}
            onClick={() => setStatusFilter('web')} size='small'
          />
          {allStatuses.map(s => (
            <Chip key={s} size='small'
              label={`${fmtStatus(s)} (${statusCounts[s] ?? 0})`}
              variant={statusFilter === s ? 'filled' : 'outlined'}
              color={statusFilter === s ? (statusChipColors[s] ?? 'primary') : 'default'}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </>
      }
      searchValue={globalFilter}
      onSearchChange={setGlobalFilter}
      searchPlaceholder='Search Request'
      entityName='requests'
      onAIResult={handleAIResult}
      newButtonLabel='Add Request'
      onNewClick={() => setCreateOpen(true)}
      onExportCsv={exportToCSV}
      onExportJson={exportToJSON}
      emptyMessage='No requests found'
      onRowDoubleClick={r => { setSelectedRequestId((r as unknown as Request).id); setDetailPanelOpen(true) }}
      cardGrid={
        <RequestCardGrid
          requests={filtered}
          onRequestClick={r => { setSelectedRequestId(r.id); setDetailPanelOpen(true) }}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
        />
      }
    >
      <RequestFullPageDetail
        requestId={selectedRequestId}
        open={detailPanelOpen}
        onClose={() => { handleCloseDetail(); fetchRequests() }}
        onEdit={() => {}}
      />
      <RequestFullPageDetail
        open={createOpen}
        onClose={() => { setCreateOpen(false); setInitialClientId(null); setInitialTaxCodeId(null); fetchRequests() }}
        onEdit={() => {}}
        initialEditing={true}
        initialClientId={initialClientId}
        initialTaxCodeId={initialTaxCodeId}
      />
    </EntityListView>
  )
}
