'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Button from '@mui/material/Button'

import { createColumnHelper } from '@tanstack/react-table'
import type { FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'

import EntityListView, { type FlashRow } from '@/components/EntityListView'
import ClientCardGrid from './ClientCardGrid'
import ClientFullPageDetail from './ClientFullPageDetail'
import ContactLink from '@components/ContactLink'
import AISearchButton, { type AISearchAction } from '@components/AISearchButton'
import CustomAvatar from '@core/components/mui/Avatar'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import useFavorites from '@/hooks/useFavorites'
import { getInitials } from '@/utils/getInitials'
import { api } from '@/lib/api'
import type { Client, CustomFieldDefinition } from '@shared/contracts'

type ClientWithAction = Client & { action?: string }

const customerTypeColors: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'error' | 'secondary'> = {
  Residential: 'primary', Commercial: 'success', Industrial: 'warning'
}
const customerTypeAvatarColors: Record<string, 'primary' | 'success' | 'warning' | 'secondary'> = {
  Residential: 'primary', Commercial: 'success', Industrial: 'warning'
}

const getEmail = (row: Client) => {
  const d = row.emails?.find((e: any) => e.isDefault)
  return d?.address || row.emails?.[0]?.address || row.email || ''
}
const getPhone = (row: Client) => {
  const d = row.phoneNumbers?.find((p: any) => p.isDefault)
  return d?.number || row.phoneNumbers?.[0]?.number || row.phone || ''
}
const getLocation = (row: Client) => {
  // Prefer default address, then first address, then legacy flat fields
  const addr = (row as any).addresses?.find((a: any) => a.isDefault) || (row as any).addresses?.[0]
  const city = addr?.city || row.city
  const state = addr?.state || row.state
  return [city, state].filter(Boolean).join(', ')
}

const downloadBlob = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.setAttribute('download', filename)
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}
const getLocalDateString = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const exportToCSV = (clients: Client[]) => {
  const headers = ['First Name', 'Last Name', 'Company', 'Email', 'Phone', 'Location', 'Type', 'Lead Source', 'Payment Terms', 'Credit Status', 'Tags']
  const rows = clients.map(c => [c.firstName, c.lastName, c.company || '', getEmail(c), getPhone(c), getLocation(c), c.customerType || '', c.leadSource || '', c.paymentTerms || '', c.creditStatus || '', c.tags || ''])
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join('\n')
  downloadBlob(csv, `clients_${getLocalDateString()}.csv`, 'text/csv;charset=utf-8;')
}
const exportToJSON = (clients: Client[]) => {
  const data = clients.map(c => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, company: c.company, email: getEmail(c), phone: getPhone(c), location: getLocation(c), customerType: c.customerType, role: c.role, leadSource: c.leadSource, paymentTerms: c.paymentTerms, creditStatus: c.creditStatus, tags: c.tags, creAt: c.creAt }))
  downloadBlob(JSON.stringify(data, null, 2), `clients_${getLocalDateString()}.json`, 'application/json')
}

const fuzzyFilter: FilterFn<ClientWithAction> = (row, _colId, value, addMeta) => {
  const client = row.original
  const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim()
  const searchableText = [fullName, client.company, getEmail(client), getPhone(client), getLocation(client), client.customerType].filter(Boolean).join(' ')
  const itemRank = rankItem(searchableText, value); addMeta({ itemRank }); return itemRank.passed
}
const columnHelper = createColumnHelper<ClientWithAction>()

/**
 * Clients list view with grid/card toggle, search, and create actions.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/clients/ClientsView.tsx
 */
export default function ClientsView() {
  const [clients, setClients] = useState<Client[]>([])
  const { rows: rtClients, flashing } = useRealtimeTable({ table: 'client', data: clients })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [openDetailIds, setOpenDetailIds] = useState<string[]>([])
  const [highlightedClientId, setHighlightedClientId] = useState<string | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const searchParams = useSearchParams()

  const { isFavorite, toggleFavorite, favoriteIds, setFavoriteIds } = useFavorites('jm-clients-favorites')

  // Fetch customer types from lookup table
  const { data: customerTypes = [] } = useQuery({
    queryKey: ['lookups', 'customerType'],
    queryFn: () => api.get<Array<{ id: string; value: string }>>('/api/lookups/customerType')
  })

  // Fetch custom fields for the Entity
  const { data: customFields = [] } = useQuery({
    queryKey: ['custom-fields', 'client'],
    queryFn: () => api.get<CustomFieldDefinition[]>('/api/custom-fields/client?includeSystem=true')
  })

  useEffect(() => {
    if (searchParams.get('add') === '1') { setCreateOpen(true) }
  }, [searchParams])

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get<Client[]>('/api/clients')
      const loaded = Array.isArray(data) ? data : []
      setClients(loaded)
      const existingIds = new Set(loaded.map(c => c.id))
      setFavoriteIds(prev => prev.filter(id => existingIds.has(id)))
    } catch { setError('Unable to load clients. Check backend connection.') } finally { setLoading(false) }
  }, [setFavoriteIds])

  useEffect(() => { fetchClients() }, [fetchClients])

  const filteredClients = useMemo(() => {
    if (highlightedClientId) return rtClients.filter(c => c.id === highlightedClientId)
    let result = rtClients
    if (typeFilter === 'favorites') result = result.filter(c => isFavorite(c.id))
    else if (typeFilter === 'none') result = result.filter(c => !c.customerType)
    else if (typeFilter !== 'all') result = result.filter(c => c.customerType === typeFilter)
    if (globalFilter) {
      const q = globalFilter.toLowerCase()
      result = result.filter(c => [c.firstName, c.lastName, c.company, c.email, c.phone, getLocation(c), c.customerType].some(v => v?.toLowerCase().includes(q)))
    }
    return result
  }, [rtClients, typeFilter, globalFilter, isFavorite, highlightedClientId])

  // Dynamic type counts for all customer types
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: clients.length,
      none: clients.filter(c => !c.customerType).length,
      favorites: favoriteIds.length
    }
    // Add count for each customer type from lookup table
    customerTypes.forEach(type => {
      counts[type.value] = clients.filter(c => c.customerType === type.value).length
    })
    return counts
  }, [clients, favoriteIds, customerTypes])

  const handleRowClick = (client: Client) => { setOpenDetailIds(prev => prev.includes(client.id) ? prev : [...prev, client.id]) }
  const handleCloseDetail = (id: string) => { setOpenDetailIds(prev => prev.filter(c => c !== id)); fetchClients() }

  const handlePrint = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPrintingId(id)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/api/reports/client/${id}?format=pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jm_token')}`
        }
      })
      if (!response.ok) throw new Error('Failed to generate report')
      const blob = await response.blob()
      const pdfBlob = new Blob([blob], { type: 'application/pdf' })
      const previewUrl = window.URL.createObjectURL(pdfBlob)
      window.open(previewUrl, '_blank')
    } catch (error) {
      console.error('Print failed:', error)
      alert('Failed to generate report.')
    } finally {
      setPrintingId(null)
    }
  }

  const handleAIResult = useCallback((result: AISearchAction) => {
    if (result.action === 'filter') {
      if (result.filters.customerType) setTypeFilter(result.filters.customerType); else setTypeFilter('all')
      const terms = Object.entries(result.filters).filter(([k]) => k !== 'customerType').map(([, v]) => v).join(' ')
      if (terms) setGlobalFilter(terms)
    } else if (result.action === 'open_edit') {
      const q = result.search.toLowerCase()
      const fullName = (c: Client) => `${c.firstName || ''} ${c.lastName || ''}`.trim()
      const found = clients.find(c => fullName(c).toLowerCase().includes(q) || c.company?.toLowerCase().includes(q))
      if (found) { setHighlightedClientId(found.id); setGlobalFilter(''); handleRowClick(found) }
      else setGlobalFilter(result.search)
    }
  }, [clients])

  const getAvatar = useCallback((firstName: string | null | undefined, lastName: string | null | undefined, customerType?: string | null) => {
    const fullName = `${firstName || ''} ${lastName || ''}`.trim()
    const color = customerTypeAvatarColors[customerType ?? ''] ?? 'secondary'
    return <CustomAvatar size={34} skin='light' color={color}>{getInitials(fullName || 'U')}</CustomAvatar>
  }, [])

  const columns = useMemo(() => {
    // 1. Define custom renderers for native UI fields
    const rendererMap: Record<string, any> = {
      firstName: columnHelper.accessor('firstName', {
        header: 'Client', size: 250,
        cell: ({ row }) => {
          const fullName = `${row.original.firstName || ''} ${row.original.lastName || ''}`.trim()
          return (
            <div className='flex items-center gap-4'>
              {getAvatar(row.original.firstName, row.original.lastName, row.original.customerType)}
              <div className='flex flex-col'>
                <Typography color='text.primary' className='font-medium'>{fullName || '(No Name)'}</Typography>
                <Typography variant='body2'>{row.original.company || ''}</Typography>
              </div>
            </div>
          )
        }
      }),
      company: columnHelper.accessor('company', { header: 'Company', size: 180,
        cell: ({ row }) => <Typography className='text-sm'>{row.original.company || '—'}</Typography>
      }),
      email: columnHelper.accessor('email', { header: 'Email', size: 220,
        cell: ({ row }) => { const email = getEmail(row.original); return email ? <ContactLink type='email' value={email} /> : null }
      }),
      webUrl: { id: 'webUrl', header: 'Website', size: 180, enableSorting: false,
        cell: ({ row }: any) => row.original.webUrl ? <ContactLink type='url' value={row.original.webUrl} /> : null
      },
      phone: columnHelper.accessor('phone', { header: 'Phone', size: 150,
        cell: ({ row }) => { const phone = getPhone(row.original); return phone ? <ContactLink type='phone' value={phone} /> : null }
      }),
      city: columnHelper.accessor('city', { header: 'Location', size: 160,
        cell: ({ row }) => <Typography className='text-sm'>{getLocation(row.original)}</Typography>
      }),
      customerType: columnHelper.accessor('customerType', { header: 'Type', size: 120,
        cell: ({ row }) => { const type = row.original.customerType; return type ? <Chip variant='tonal' label={type} size='small' color={customerTypeColors[type] || 'secondary'} className='capitalize' /> : null }
      }),
      role: columnHelper.accessor('role', { header: 'Role', size: 130,
        cell: ({ row }) => <Typography className='text-sm'>{row.original.role || '—'}</Typography>
      }),
      leadSource: columnHelper.accessor('leadSource', { header: 'Lead Source', size: 140,
        cell: ({ row }) => <Typography className='text-sm'>{row.original.leadSource || '—'}</Typography>
      }),
      paymentTerms: columnHelper.accessor('paymentTerms', { header: 'Payment Terms', size: 140,
        cell: ({ row }) => <Typography className='text-sm'>{row.original.paymentTerms || '—'}</Typography>
      }),
      creditStatus: columnHelper.accessor('creditStatus', { header: 'Credit', size: 70,
        cell: ({ row }) => {
          const s = row.original.creditStatus; if (!s) return null
          const sl = s.toLowerCase()
          const isGood = sl.includes('active'); const isHold = sl.includes('hold')
          const icon = isGood ? 'tabler-thumb-up' : isHold ? 'tabler-hand-stop' : 'tabler-thumb-down'
          const color = isGood ? 'var(--mui-palette-success-main)' : isHold ? 'var(--mui-palette-warning-main)' : 'var(--mui-palette-error-main)'
          return <Tooltip title={s} placement='top'><i className={`${icon} text-xl`} style={{ color }} /></Tooltip>
        }
      }),
      tags: columnHelper.accessor('tags', { header: 'Tags', size: 180, enableSorting: false,
        cell: ({ row }) => {
          const tags = row.original.tags?.split(',').map((t: string) => t.trim()).filter(Boolean) ?? []
          return tags.length ? (
            <div className='flex flex-wrap gap-1'>
              {tags.slice(0, 3).map((tag: string) => <Chip key={tag} label={tag} size='small' variant='outlined' sx={{ fontSize: 11, height: 20 }} />)}
              {tags.length > 3 && <Typography variant='caption' color='text.secondary'>+{tags.length - 3}</Typography>}
            </div>
          ) : null
        }
      }),
      creAt: columnHelper.accessor('creAt', { header: 'Client Since', size: 130,
        cell: ({ row }) => { const d = row.original.creAt ? new Date(row.original.creAt) : null; return d ? <Typography className='text-sm'>{d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</Typography> : null }
      }),
      lastName: columnHelper.accessor('lastName', { header: 'Last Name', size: 150, cell: ({ row }) => <Typography className='text-sm'>{row.original.lastName || '—'}</Typography> }),
      street: columnHelper.accessor('street', { header: 'Street', size: 180, cell: ({ row }) => <Typography className='text-sm'>{row.original.street || '—'}</Typography> }),
      street2: columnHelper.accessor('street2', { header: 'Street 2', size: 120, cell: ({ row }) => <Typography className='text-sm'>{row.original.street2 || '—'}</Typography> }),
      state: columnHelper.accessor('state', { header: 'State', size: 100, cell: ({ row }) => <Typography className='text-sm'>{row.original.state || '—'}</Typography> }),
      zipCode: columnHelper.accessor('zipCode', { header: 'Zip Code', size: 100, cell: ({ row }) => <Typography className='text-sm'>{row.original.zipCode || '—'}</Typography> }),
      useCompanyName: columnHelper.accessor('useCompanyName', { header: 'Use Company Name', size: 150, cell: ({ row }) => <Typography className='text-sm'>{row.original.useCompanyName ? 'Yes' : 'No'}</Typography> }),
      dateOfBirth: columnHelper.accessor('dateOfBirth', { header: 'Date of Birth', size: 130, cell: ({ row }) => { const d = row.original.dateOfBirth ? new Date(row.original.dateOfBirth) : null; return d ? <Typography className='text-sm'>{d.toLocaleDateString()}</Typography> : <Typography className='text-sm'>—</Typography> } }),
      notes: columnHelper.accessor('notes', { header: 'Notes', size: 200, cell: ({ row }) => <Typography className='text-sm' noWrap>{row.original.notes || '—'}</Typography> }),
      internalNotes: columnHelper.accessor('internalNotes', { header: 'Internal Notes', size: 200, cell: ({ row }) => <Typography className='text-sm' noWrap>{row.original.internalNotes || '—'}</Typography> }),
      modAt: columnHelper.accessor('modAt', { header: 'Last Modified', size: 150,
        cell: ({ row }) => { const d = row.original.modAt ? new Date(row.original.modAt) : null; return d ? <Typography className='text-sm'>{d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</Typography> : null }
      }),
      creBy: columnHelper.accessor('creBy', { header: 'Created By', size: 140, cell: ({ row }) => <Typography className='text-sm'>{row.original.creBy || '—'}</Typography> }),
      modBy: columnHelper.accessor('modBy', { header: 'Modified By', size: 140, cell: ({ row }) => <Typography className='text-sm'>{row.original.modBy || '—'}</Typography> }),
      prefix: columnHelper.accessor('prefix', { header: 'Prefix', size: 80, cell: ({ row }) => <Typography className='text-sm'>{row.original.prefix || '—'}</Typography> }),
      suffix: columnHelper.accessor('suffix', { header: 'Suffix', size: 80, cell: ({ row }) => <Typography className='text-sm'>{row.original.suffix || '—'}</Typography> }),
      country: columnHelper.accessor('country', { header: 'Country', size: 120, cell: ({ row }) => <Typography className='text-sm'>{row.original.country || '—'}</Typography> }),
      taxCode: columnHelper.accessor('taxCode', { header: 'Tax Code', size: 120, cell: ({ row }) => <Typography className='text-sm'>{(row.original as any).taxCode || '—'}</Typography> }),
      assignedTo: columnHelper.accessor('assignedToId', { id: 'assignedTo', header: 'Assigned To', size: 140, cell: ({ row }) => <Typography className='text-sm'>{(row.original as any).assignedTo || '—'}</Typography> })
    }

    const selectCol = {
      id: 'select',
      header: ({ table }: any) => <Checkbox checked={table.getIsAllRowsSelected()} indeterminate={table.getIsSomeRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />,
      cell: ({ row }: any) => <Checkbox checked={row.getIsSelected()} disabled={!row.getCanSelect()} indeterminate={row.getIsSomeSelected()} onChange={row.getToggleSelectedHandler()} onClick={(e: React.MouseEvent) => e.stopPropagation()} />,
      size: 50, enableSorting: false
    }

    const actionCol = columnHelper.accessor('action', { header: 'Actions', size: 100, enableSorting: false,
      cell: ({ row }) => (
        <div className='flex items-center'>
          <IconButton size='small' onClick={e => { e.stopPropagation(); handleRowClick(row.original) }}>
            <i className='tabler-edit text-textSecondary text-[22px]' />
          </IconButton>
          <IconButton size='small' onClick={e => handlePrint(row.original.id, e)} disabled={printingId === row.original.id}>
            {printingId === row.original.id ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              <i className='tabler-printer text-textSecondary text-[22px]' />
            )}
          </IconButton>
        </div>
      )
    })

    // 2. Build columns from ALL active field definitions (showInGrid controls default visibility,
    //    not whether the column is included at all — every column must be in the table so the
    //    column picker can show it as a toggle option).
    const allActiveFields = customFields.filter(f => f.isActive)
    
    // Safety fallback: if API returned nothing, render hardcoded defaults
    const hasSystemFields = allActiveFields.some(f => f.isSystem)
    let dynamicCols: any[] = []

    if (!hasSystemFields && allActiveFields.length === 0) {
      // Fallback if DB has not been seeded with system fields yet
      dynamicCols = Object.values(rendererMap)
    } else {
      const orderedFields = [...allActiveFields].sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      dynamicCols = orderedFields.map(field => {
        // If it's a known native field, use its rich renderer
        if (field.isSystem && rendererMap[field.fieldName]) {
           const def = rendererMap[field.fieldName]
           const colDef = typeof def.accessorFn !== 'undefined' ? { ...def } : { ...def, id: field.fieldName }
           if (colDef.header) colDef.header = field.fieldLabel
           return colDef
        }
        
        // Generic renderer for user-defined custom fields (JSONB)
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

    // Build defaultColVisibility from metadata: fields with showInGrid=false start hidden
    // (This is RETURNED so callers can use it; actual prop is on EntityListView below)

    return [selectCol, ...dynamicCols, actionCol]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAvatar, printingId, customFields])

  // Compute default column visibility from DB metadata:
  // fields with showInGrid=false start hidden in the picker, but still appear as options
  const colVisibility = useMemo(() => {
    const vis: Record<string, boolean> = {}
    customFields.filter(f => f.isActive).forEach(f => {
      const id = f.isSystem ? f.fieldName : `cf_${f.fieldName}`
      vis[id] = f.showInGrid
    })
    return vis
  }, [customFields])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}><CircularProgress /></Box>
  if (error) return <Box sx={{ p: 4 }}><Typography color='error'>{error}</Typography><Button onClick={fetchClients} sx={{ mt: 2 }}>Retry</Button></Box>

  return (
    <EntityListView<ClientWithAction>
      columns={columns as any}
      data={filteredClients as ClientWithAction[]}
      flashing={flashing as FlashRow[]}
      storageKey='jm-clients'
      title='Clients'
      defaultColVisibility={colVisibility}
      filterChips={
        <>
          <Chip icon={<i className='tabler-star text-[14px]' />}
            label={`Favorites (${typeCounts.favorites})`}
            variant={typeFilter === 'favorites' ? 'filled' : 'outlined'}
            color={typeFilter === 'favorites' ? 'warning' : 'default'}
            onClick={() => setTypeFilter('favorites')} size='small'
          />
          <Chip
            label={`All (${typeCounts.all || 0})`}
            size='small'
            variant={typeFilter === 'all' ? 'filled' : 'outlined'}
            color={typeFilter === 'all' ? 'primary' : 'default'}
            onClick={() => setTypeFilter('all')}
          />
          {customerTypes.map((type, index) => {
            // Assign colors based on type name or rotate through colors
            const colorMap: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'error'> = {
              Residential: 'primary',
              Commercial: 'success',
              Industrial: 'warning',
              Government: 'info'
            }
            const color = colorMap[type.value] || (['primary', 'success', 'warning', 'info'][index % 4] as any)

            return (
              <Chip
                key={type.id}
                label={`${type.value} (${typeCounts[type.value] || 0})`}
                size='small'
                variant={typeFilter === type.value ? 'filled' : 'outlined'}
                color={typeFilter === type.value ? color : 'default'}
                onClick={() => setTypeFilter(type.value)}
              />
            )
          })}
          <Chip
            label={`Untyped (${typeCounts.none || 0})`}
            size='small'
            variant={typeFilter === 'none' ? 'filled' : 'outlined'}
            color={typeFilter === 'none' ? 'secondary' : 'default'}
            onClick={() => setTypeFilter('none')}
          />
        </>
      }
      searchValue={globalFilter}
      onSearchChange={setGlobalFilter}
      searchPlaceholder='Search Client'
      entityName='clients'
      onAIResult={handleAIResult}
      newButtonLabel='New Client'
      onNewClick={() => setCreateOpen(true)}
      onExportCsv={exportToCSV}
      onExportJson={exportToJSON}
      emptyMessage='No clients found'
      onRowDoubleClick={c => handleRowClick(c as unknown as Client)}
      cardGrid={
        <ClientCardGrid
          clients={filteredClients}
          onClientClick={handleRowClick}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
        />
      }
    >
      {openDetailIds.map(id => (
        <ClientFullPageDetail
          key={id}
          clientId={id}
          open={true}
          onClose={() => handleCloseDetail(id)}
          onEdit={() => {}}
        />
      ))}
      <ClientFullPageDetail
        open={createOpen}
        onClose={() => { setCreateOpen(false); fetchClients() }}
        onEdit={() => {}}
        initialEditing={true}
      />
    </EntityListView>
  )
}
