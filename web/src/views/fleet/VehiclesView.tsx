'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'

import { createColumnHelper } from '@tanstack/react-table'
import type { FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'

import EntityListView, { type FlashRow } from '@/components/EntityListView'
import VehicleFullPageDetail from './VehicleFullPageDetail'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { api } from '@/lib/api'
import { printVehicle } from '@/utils/printVehicle'
import type { AISearchAction } from '@components/AISearchButton'

export type Vehicle = {
  id: string
  vin: string | null
  name: string
  vehicleTypeId: string
  vehicleType: string | null
  year: number | null
  makeId: string | null
  make: string | null
  modelId: string | null
  model: string | null
  licensePlate: string | null
  color: string | null
  statusId: string | null
  status: string | null
  assignedTo: string | null
  assignedToName: string | null
  usageReading: number | null
  usageUnit: 'miles' | 'kilometers' | 'hours' | null
  fuelType: string | null
  notes: string | null
  // Service & Maintenance
  estimatedServiceLifeMiles: number | null
  estimatedResaleValue: number | null
  inServiceDate: string | null
  lastServiceDate: string | null
  nextServiceDue: string | null
  serviceInterval: number | null
  maintenanceNotes: string | null
  // Tires & Wheels
  tireSizeFront: string | null
  tireSizeRear: string | null
  wheelSizeFront: string | null
  wheelSizeRear: string | null
  tireCondition: string | null
  tireReplacementDate: string | null
  // Chassis & Drivetrain
  driveType: string | null
  chassis: string | null
  bedLength: string | null
  cabType: string | null
  // Transmission
  transmissionType: string | null
  transmissionDescription: string | null
  transmissionSpeeds: number | null
  // Engine
  engineCylinders: number | null
  engineDisplacement: number | null
  engineType: string | null
  engineValves: number | null
  maxTorque: number | null
  horsepower: number | null
  aspirationType: string | null
  // Fuel Economy
  cityMpg: number | null
  highwayMpg: number | null
  combinedMpg: number | null
  tankCapacity: number | null
  // Weight & Capacity
  gvwr: number | null
  curbWeight: number | null
  payloadCapacity: number | null
  towingCapacity: number | null
  // Dimensions
  overallLength: number | null
  overallWidth: number | null
  overallHeight: number | null
  wheelbase: number | null
  groundClearance: number | null
  // Commercial
  purchasePrice: number | null
  purchaseDate: string | null
  purchaseLocation: string | null
  warrantyExpiration: string | null
  titleNumber: string | null
  registrationExpiration: string | null
  creAt: string
  modAt: string
  creBy: string
  modBy: string
}

const downloadBlob = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.setAttribute('download', filename)
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}

const exportToCSV = (vehicles: Vehicle[]) => {
  const headers = ['Name', 'VIN', 'Type', 'Make', 'Model', 'Year', 'License Plate', 'Status', 'Created']
  const rows = vehicles.map(v => [
    v.name,
    v.vin || '',
    v.vehicleType || '',
    v.make || '',
    v.model || '',
    String(v.year || ''),
    v.licensePlate || '',
    v.status || '',
    v.creAt ? new Date(v.creAt).toLocaleDateString() : ''
  ].map(val => `"${(val ?? '').replace(/"/g, '""')}"`).join(','))
  downloadBlob([headers.join(','), ...rows].join('\n'), `vehicles_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;')
}

const exportToJSON = (vehicles: Vehicle[]) => {
  downloadBlob(JSON.stringify(vehicles, null, 2), `vehicles_${new Date().toISOString().split('T')[0]}.json`, 'application/json')
}

const fuzzyFilter: FilterFn<Vehicle> = (row, _colId, value, addMeta) => {
  const v = row.original
  const text = [v.name, v.vin, v.licensePlate, v.make, v.model, v.vehicleType].filter(Boolean).join(' ')
  const itemRank = rankItem(text, value); addMeta({ itemRank }); return itemRank.passed
}

const columnHelper = createColumnHelper<Vehicle>()
interface FieldDef { fieldName: string; fieldLabel: string; showInGrid: boolean; isActive: boolean }
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

/**
 * Fleet vehicles list view with grid toggle, status filters, and VIN lookup.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/fleet/VehiclesView.tsx
 */
export default function VehiclesView() {
  const searchParams = useSearchParams()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const { rows: rtVehicles, flashing } = useRealtimeTable<Vehicle>({ table: 'vehicle', data: vehicles })
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Vehicle | null>(null)
  const [initialEditing, setInitialEditing] = useState(false)
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>([])

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/custom-fields/vehicle?includeSystem=true`)
      .then(r => r.ok ? r.json() : []).then(d => setFieldDefs(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const fetchVehicles = useCallback(async () => {
    const d = await api.get<{ data: Vehicle[]; total: number }>('/api/vehicles?limit=500')
    setVehicles(Array.isArray((d as any).data) ? (d as any).data : Array.isArray(d) ? d as any : [])
  }, [])

  useEffect(() => {
    fetchVehicles().finally(() => setLoading(false))
  }, [fetchVehicles])

  useEffect(() => {
    if (searchParams?.get('add') === '1') {
      setSelected(null); setInitialEditing(true); setDialogOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    const id = searchParams?.get('edit')
    if (id) {
      const found = rtVehicles.find((v: Vehicle) => v.id === id)
      if (found) { setSelected(found); setInitialEditing(true); setDialogOpen(true) }
    }
  }, [searchParams, rtVehicles])

  // Sync selected vehicle with real-time updates / fetched updates
  useEffect(() => {
    if (selected?.id) {
      const updated = rtVehicles.find((v: Vehicle) => v.id === selected.id)
      if (updated && updated !== selected) {
        setSelected(updated)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rtVehicles])

  const handleSave = async () => {
    await fetchVehicles()
  }

  const openDetail = (v: Vehicle) => { setSelected(v); setInitialEditing(false); setDialogOpen(true) }
  const openEdit   = (v: Vehicle) => { setSelected(v); setInitialEditing(true);  setDialogOpen(true) }
  const openCreate = ()            => { setSelected(null); setInitialEditing(true);  setDialogOpen(true) }

  const filtered = useMemo(() => {
    let result = rtVehicles
    if (statusFilter === 'active') result = result.filter((v: Vehicle) => v.status?.toLowerCase() === 'active')
    else if (statusFilter === 'inactive') result = result.filter((v: Vehicle) => v.status?.toLowerCase() !== 'active')
    if (globalFilter) {
      const q = globalFilter.toLowerCase()
      result = result.filter((v: Vehicle) => [v.name, v.vin, v.licensePlate, v.make, v.model, v.vehicleType].some((val: any) => val?.toLowerCase().includes(q)))
    }
    return result
  }, [rtVehicles, statusFilter, globalFilter])

  const counts = useMemo(() => ({
    all: vehicles.length,
    active: vehicles.filter(v => v.status?.toLowerCase() === 'active').length,
    inactive: vehicles.filter(v => v.status?.toLowerCase() !== 'active').length,
  }), [vehicles])

  const handleAIResult = useCallback((result: AISearchAction) => {
    if (result.action === 'filter') {
      const terms = Object.entries(result.filters).map(([, v]) => v).join(' ')
      if (terms) setGlobalFilter(terms)
    } else if (result.action === 'open_edit') {
      const q = result.search.toLowerCase()
      const found = vehicles.find(v => v.name?.toLowerCase().includes(q))
      if (found) openEdit(found); else setGlobalFilter(result.search)
    }
  }, [vehicles])

  const rendererMap = useMemo(() => ({
    name: columnHelper.accessor(r => r.name ?? '', { id: 'name', header: 'Name', size: 200, cell: ({ getValue }) => <Typography variant='body2' fontWeight={500} noWrap sx={{ maxWidth: 180 }}>{getValue() || '—'}</Typography> }),
    vin: columnHelper.accessor(r => r.vin ?? '', { id: 'vin', header: 'VIN', size: 180, cell: ({ getValue }) => <Typography variant='body2' color='text.secondary' noWrap sx={{ maxWidth: 160 }}>{getValue() || '—'}</Typography> }),
    vehicleType: columnHelper.accessor(r => r.vehicleType ?? '', { id: 'vehicleType', header: 'Type', size: 120, cell: ({ getValue }) => <Chip label={getValue() || '—'} size='small' variant='outlined' /> }),
    make: columnHelper.accessor(r => r.make ?? '', { id: 'make', header: 'Make', size: 130, cell: ({ getValue }) => <Typography variant='body2' noWrap>{getValue() || '—'}</Typography> }),
    model: columnHelper.accessor(r => r.model ?? '', { id: 'model', header: 'Model', size: 130, cell: ({ getValue }) => <Typography variant='body2' noWrap>{getValue() || '—'}</Typography> }),
    year: columnHelper.accessor(r => r.year ?? 0, { id: 'year', header: 'Year', size: 80, cell: ({ getValue }) => getValue() || '—' }),
    licensePlate: columnHelper.accessor(r => r.licensePlate ?? '', { id: 'licensePlate', header: 'License Plate', size: 130, cell: ({ getValue }) => <Typography variant='body2' noWrap>{getValue() || '—'}</Typography> }),
    color: columnHelper.accessor(r => r.color ?? '', { id: 'color', header: 'Color', size: 100, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
    status: columnHelper.accessor(r => r.status ?? '', { id: 'status', header: 'Status', size: 110, cell: ({ getValue }) => { const s = getValue(); const c = s?.toLowerCase() === 'active' ? 'success' : s?.toLowerCase() === 'maintenance' ? 'warning' : 'default'; return <Chip label={s || 'Unknown'} size='small' color={c} variant='tonal' /> } }),
    assignedToName: columnHelper.accessor(r => r.assignedToName ?? '', { id: 'assignedToName', header: 'Assigned To', size: 150, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
    usageReading: columnHelper.accessor(r => r.usageReading ?? 0, { id: 'usageReading', header: 'Reading', size: 100, cell: ({ row }) => row.original.usageReading != null ? `${row.original.usageReading} ${row.original.usageUnit || ''}` : '—' }),
    fuelType: columnHelper.accessor(r => r.fuelType ?? '', { id: 'fuelType', header: 'Fuel Type', size: 100, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
    inServiceDate: columnHelper.accessor(r => r.inServiceDate ?? '', { id: 'inServiceDate', header: 'In Service', size: 120, cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString() : '—' }),
    lastServiceDate: columnHelper.accessor(r => r.lastServiceDate ?? '', { id: 'lastServiceDate', header: 'Last Service', size: 120, cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString() : '—' }),
    nextServiceDue: columnHelper.accessor(r => r.nextServiceDue ?? '', { id: 'nextServiceDue', header: 'Next Service', size: 120, cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString() : '—' }),
    purchasePrice: columnHelper.accessor(r => r.purchasePrice ?? 0, { id: 'purchasePrice', header: 'Purchase Price', size: 120, cell: ({ getValue }) => getValue() ? `$${Number(getValue()).toLocaleString()}` : '—' }),
    purchaseDate: columnHelper.accessor(r => r.purchaseDate ?? '', { id: 'purchaseDate', header: 'Purchase Date', size: 120, cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString() : '—' }),
    warrantyExpiration: columnHelper.accessor(r => r.warrantyExpiration ?? '', { id: 'warrantyExpiration', header: 'Warranty Exp', size: 120, cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString() : '—' }),
    registrationExpiration: columnHelper.accessor(r => r.registrationExpiration ?? '', { id: 'registrationExpiration', header: 'Reg Expiry', size: 120, cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString() : '—' }),
    notes: columnHelper.accessor(r => r.notes ?? '', { id: 'notes', header: 'Notes', size: 200, cell: ({ getValue }) => <Typography variant='body2' noWrap>{getValue() || '—'}</Typography> }),
    creAt: columnHelper.accessor(r => r.creAt ?? '', { id: 'creAt', header: 'Created', size: 120, cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString() : '—' }),
    modAt: columnHelper.accessor(r => r.modAt ?? '', { id: 'modAt', header: 'Last Modified', size: 130, cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString() : '—' }),
    creBy: columnHelper.accessor(r => r.creBy ?? '', { id: 'creBy', header: 'Created By', size: 140, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
    modBy: columnHelper.accessor(r => r.modBy ?? '', { id: 'modBy', header: 'Modified By', size: 140, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
  }), [])

  const actionCol = columnHelper.display({ id: 'actions', header: 'Actions', size: 120, enableSorting: false, cell: ({ row }) => (<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><IconButton size='small' onClick={e => { e.stopPropagation(); openEdit(row.original) }}><i className='tabler-edit text-textSecondary text-[22px]' /></IconButton><IconButton size='small' onClick={e => { e.stopPropagation(); openDetail(row.original) }}><i className='tabler-eye text-textSecondary text-[22px]' /></IconButton><IconButton size='small' onClick={e => { e.stopPropagation(); printVehicle(row.original) }}><i className='tabler-printer text-textSecondary text-[22px]' /></IconButton></Box>) })
  const selectCol = columnHelper.display({ id: 'select', header: ({ table }) => <input type='checkbox' checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} />, cell: ({ row }) => <input type='checkbox' checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} onClick={(e: React.MouseEvent) => e.stopPropagation()} /> })

  const columns = useMemo(() => {
    if (!fieldDefs.length) return [selectCol, rendererMap.name, rendererMap.vin, rendererMap.vehicleType, rendererMap.make, rendererMap.model, rendererMap.year, rendererMap.licensePlate, rendererMap.status, rendererMap.creAt, actionCol]
    const active = fieldDefs.filter(f => f.isActive !== false)
    const cols = active.map(f => { const r = (rendererMap as any)[f.fieldName]; if (!r) return null; const c = { ...r, id: f.fieldName }; if (c.columnDef) c.columnDef = { ...r.columnDef, header: f.fieldLabel }; return c }).filter(Boolean)
    return [selectCol, ...cols, actionCol]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldDefs, rendererMap])

  const defaultColVisibility = useMemo(() => {
    const vis: Record<string, boolean> = {}
    fieldDefs.forEach(f => { vis[f.fieldName] = f.showInGrid })
    return vis
  }, [fieldDefs])

  if (loading) return <Box className='flex items-center justify-center min-h-64'><CircularProgress /></Box>

  return (
    <>
      <EntityListView<Vehicle>
        columns={columns as any}
        data={filtered}
        flashing={flashing as FlashRow[]}
        storageKey='jm-vehicles'
        title='Fleet Vehicles'
        defaultColVisibility={fieldDefs.length ? defaultColVisibility : { vin: false, licensePlate: false }}
        filterChips={
          <>
            {(['all', 'active', 'inactive'] as const).map(f => (
              <Chip key={f}
                label={`${f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'} (${counts[f]})`}
                variant={statusFilter === f ? 'filled' : 'outlined'}
                color={f === 'active' ? (statusFilter === f ? 'success' : 'default') : f === 'inactive' ? (statusFilter === f ? 'warning' : 'default') : (statusFilter === f ? 'primary' : 'default')}
                onClick={() => setStatusFilter(f)}
                size='small'
              />
            ))}
          </>
        }
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder='Search Vehicles'
        entityName='vehicles'
        onAIResult={handleAIResult}
        newButtonLabel='New Vehicle'
        onNewClick={openCreate}
        onExportCsv={exportToCSV}
        onExportJson={exportToJSON}
        emptyMessage='No vehicles found'
        onRowDoubleClick={v => openDetail(v)}
      />

      <VehicleFullPageDetail
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelected(null) }}
        vehicle={selected}
        onSave={handleSave}
        initialEditing={initialEditing}
      />
    </>
  )
}
