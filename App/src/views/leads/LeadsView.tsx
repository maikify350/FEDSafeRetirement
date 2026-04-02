'use client'

/**
 * LeadsView — Lead search grid with server-side pagination & filtering.
 *
 * Uses EntityListView in server-side mode for 472K+ records.
 * Column filters translate to Supabase PostgREST queries via /api/leads.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Badge from '@mui/material/Badge'

import { createColumnHelper, type ColumnFiltersState, type SortingState } from '@tanstack/react-table'

import EntityListView from '@/components/EntityListView'
import { isConditionActive, type ColFilterValue } from '@/lib/columnFilter'
import LeadEditDialog from './LeadEditDialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import PushToActDialog from '@/components/PushToActDialog'

// ── Lead type ───────────────────────────────────────────────────────────────
interface Lead {
  id: string
  first_name: string
  last_name: string
  middle_initial: string | null
  occupation_title: string | null
  grade_level: string | null
  annual_salary: number | null
  hourly_rate: number | null
  facility_name: string | null
  facility_address: string | null
  facility_city: string | null
  facility_state: string | null
  facility_zip_code: string | null
  entered_on_duty_date: string | null
  years_of_service: number | null
  gender: string | null
  date_of_birth: string | null
  source_file: string | null
  is_favorite: boolean
  cre_dt: string | null
  cre_by: string | null
  mod_by: string | null
  mod_dt: string | null
}

type LeadWithAction = Lead & { action?: string }

const columnHelper = createColumnHelper<LeadWithAction>()

// ── Helpers ─────────────────────────────────────────────────────────────────
const downloadBlob = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.setAttribute('download', filename)
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}

const getLocalDateString = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const formatCurrency = (v: number | null) => {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

const formatDate = (v: string | null) => {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Export field definitions (available for field picker) ────────────────────
const LEAD_EXPORT_FIELDS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'middle_initial', label: 'MI' },
  { key: 'gender', label: 'Gender' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'occupation_title', label: 'Occupation Title' },
  { key: 'grade_level', label: 'Grade Level' },
  { key: 'annual_salary', label: 'Annual Salary' },
  { key: 'hourly_rate', label: 'Hourly Rate' },
  { key: 'years_of_service', label: 'Years of Service' },
  { key: 'entered_on_duty_date', label: 'Entered on Duty Date' },
  { key: 'facility_name', label: 'Facility Name' },
  { key: 'facility_address', label: 'Facility Address' },
  { key: 'facility_city', label: 'City' },
  { key: 'facility_state', label: 'State' },
  { key: 'facility_zip_code', label: 'Zip Code' },
  { key: 'source_file', label: 'Source File' },
  { key: 'is_favorite', label: 'Favorite' },
]

export default function LeadsView() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSizeState] = useState(25)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'last_name', desc: false }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [favoriteFilter, setFavoriteFilter] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [collections, setCollections] = useState<{id: string; name: string}[]>([])
  const [collectionFilter, setCollectionFilter] = useState<string>('')
  const [clearFavConfirm, setClearFavConfirm] = useState(false)
  const [clearingFavs, setClearingFavs] = useState(false)
  const [actDialogOpen, setActDialogOpen] = useState(false)
  const [actPushCount, setActPushCount] = useState(0)

  // Fetch collections for the combobox filter
  useEffect(() => {
    fetch('/api/collections').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCollections(data.map((c: any) => ({ id: c.id, name: c.name })))
    }).catch(() => {})
  }, [])

  // Debounced search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(globalFilter)
      setCurrentPage(0)  // Reset to first page on new search
    }, 400)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [globalFilter])

  // ── Fetch leads from API ──────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      // Build active column filters (strip empty conditions)
      const activeFilters = columnFilters
        .filter(cf => {
          const val = cf.value as ColFilterValue
          return val?.conditions?.some(isConditionActive)
        })
        .map(cf => ({ id: cf.id, value: cf.value }))

      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(pageSize),
        search: debouncedSearch,
        sort: JSON.stringify(sorting),
        filters: JSON.stringify(activeFilters),
        ...(stateFilter !== 'all' ? { state: stateFilter } : {}),
        ...(genderFilter !== 'all' ? { gender: genderFilter } : {}),
        ...(favoriteFilter ? { favorite: 'true' } : {}),
      })

      const res = await fetch(`/api/leads?${params}`, { cache: 'no-store' })
      const json = await res.json()

      if (json.error) {
        console.error('Leads API error:', json.error)
      } else {
        setLeads(json.data)
        setTotalRows(json.total)
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, debouncedSearch, sorting, columnFilters, stateFilter, genderFilter, favoriteFilter])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // ── Pagination handler ────────────────────────────────────────────────────
  const handlePageChange = useCallback((page: number, size: number) => {
    setCurrentPage(page)
    setPageSizeState(size)
  }, [])

  const handleSortChange = useCallback((s: SortingState) => {
    setSorting(s)
    setCurrentPage(0)
  }, [])

  const handleFilterChange = useCallback((f: ColumnFiltersState) => {
    setColumnFilters(f)
    setCurrentPage(0)
  }, [])

  // ── Export ────────────────────────────────────────────────────────────────
  const exportToCSV = (rows: LeadWithAction[]) => {
    const headers = ['First Name', 'Last Name', 'Occupation', 'Grade', 'Annual Salary', 'Hourly Rate', 'Facility', 'City', 'State', 'Zip', 'Duty Date', 'Years of Service']
    const csvRows = rows.map(r => [
      r.first_name, r.last_name, r.occupation_title || '', r.grade_level || '',
      r.annual_salary ?? '', r.hourly_rate ?? '', r.facility_name || '',
      r.facility_city || '', r.facility_state || '', r.facility_zip_code || '',
      r.entered_on_duty_date || '', r.years_of_service ?? ''
    ])
    const csv = [headers.join(','), ...csvRows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))].join('\n')
    downloadBlob(csv, `leads_${getLocalDateString()}.csv`, 'text/csv;charset=utf-8;')
  }

  const exportToJSON = (rows: LeadWithAction[]) => {
    downloadBlob(JSON.stringify(rows, null, 2), `leads_${getLocalDateString()}.json`, 'application/json')
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo(() => {
    const selectCol = {
      id: 'select',
      header: ({ table }: any) => <Checkbox size='small' sx={{ p: '2px' }} checked={table.getIsAllRowsSelected()} indeterminate={table.getIsSomeRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />,
      cell: ({ row }: any) => <Checkbox size='small' sx={{ p: '2px' }} checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} onClick={(e: React.MouseEvent) => e.stopPropagation()} />,
      size: 50, enableSorting: false, enableColumnFilter: false,
    }

    const favoriteCol = {
      id: 'favorite',
      header: () => <i className='tabler-star text-sm' />,
      cell: ({ row }: any) => {
        const lead = row.original as Lead
        return (
          <IconButton
            size='small'
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              toggleFavorite(lead.id, !lead.is_favorite)
            }}
            sx={{ color: lead.is_favorite ? '#f59e0b' : 'text.disabled', p: 0.5 }}
          >
            <i className={lead.is_favorite ? 'tabler-star-filled' : 'tabler-star'} style={{ fontSize: 18 }} />
          </IconButton>
        )
      },
      size: 40, enableSorting: false, enableColumnFilter: false,
    }

    return [
      selectCol,
      favoriteCol,
      columnHelper.accessor('first_name', {
        header: 'First Name', size: 140,
        cell: ({ row }) => (
          <Typography className='font-medium text-sm'>{row.original.first_name}</Typography>
        ),
      }),
      columnHelper.accessor('last_name', {
        header: 'Last Name', size: 150,
        cell: ({ row }) => (
          <Typography className='font-medium text-sm'>{row.original.last_name}</Typography>
        ),
      }),
      columnHelper.accessor('occupation_title', {
        header: 'Occupation', size: 260,
        cell: ({ row }) => <Typography className='text-sm' noWrap>{row.original.occupation_title || '—'}</Typography>,
      }),
      columnHelper.accessor('grade_level', {
        header: 'Grade', size: 100,
        cell: ({ row }) => (
          <Chip label={row.original.grade_level || '—'} size='small' variant='outlined' sx={{ fontSize: 11, height: 22 }} />
        ),
      }),
      columnHelper.accessor('annual_salary', {
        header: 'Annual Salary', size: 140,
        cell: ({ row }) => (
          <Typography className='text-sm' sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(row.original.annual_salary)}
          </Typography>
        ),
      }),
      columnHelper.accessor('hourly_rate', {
        header: 'Hourly Rate', size: 110,
        cell: ({ row }) => (
          <Typography className='text-sm' sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {row.original.hourly_rate ? `$${row.original.hourly_rate.toFixed(2)}` : '—'}
          </Typography>
        ),
      }),
      columnHelper.accessor('facility_name', {
        header: 'Facility', size: 200,
        cell: ({ row }) => <Typography className='text-sm' noWrap>{row.original.facility_name || '—'}</Typography>,
      }),
      columnHelper.accessor('facility_city', {
        header: 'City', size: 140,
        cell: ({ row }) => <Typography className='text-sm'>{row.original.facility_city || '—'}</Typography>,
      }),
      columnHelper.accessor('facility_state', {
        header: 'State', size: 80,
        cell: ({ row }) => {
          const st = row.original.facility_state
          return st ? (
            <Chip label={st} size='small' variant='tonal' color='info' sx={{ fontSize: 11, height: 22, fontWeight: 600 }} />
          ) : <Typography className='text-sm'>—</Typography>
        },
      }),
      columnHelper.accessor('facility_zip_code', {
        header: 'Zip Code', size: 110,
        cell: ({ row }) => <Typography className='text-sm'>{row.original.facility_zip_code || '—'}</Typography>,
      }),
      columnHelper.accessor('facility_address', {
        header: 'Address', size: 200,
        cell: ({ row }) => <Typography className='text-sm' noWrap>{row.original.facility_address || '—'}</Typography>,
      }),
      columnHelper.accessor('entered_on_duty_date', {
        header: 'Duty Date', size: 130,
        cell: ({ row }) => <Typography className='text-sm'>{formatDate(row.original.entered_on_duty_date)}</Typography>,
      }),
      columnHelper.accessor('years_of_service', {
        header: 'Years', size: 130,
        cell: ({ row }) => {
          const yos = row.original.years_of_service
          if (yos === null || yos === undefined) return <Typography className='text-sm'>—</Typography>
          const color = yos >= 20 ? 'success' : yos >= 10 ? 'warning' : 'default'
          return (
            <Tooltip title={`${yos} years of service`}>
              <Chip label={`${yos} yrs`} size='small' color={color} variant='tonal' sx={{ fontSize: 11, height: 22 }} />
            </Tooltip>
          )
        },
      }),
      columnHelper.accessor('middle_initial', {
        header: 'MI', size: 60,
        cell: ({ row }) => <Typography className='text-sm'>{row.original.middle_initial || '—'}</Typography>,
      }),
      columnHelper.accessor('source_file', {
        header: 'Source', size: 160,
        cell: ({ row }) => <Typography className='text-sm' noWrap>{row.original.source_file || '—'}</Typography>,
      }),
    ]
  }, [])

  // ── Default column visibility (hide less important columns by default) ────
  const colVisibility = useMemo(() => ({
    middle_initial: false,
    facility_address: false,
    hourly_rate: false,
    source_file: false,
  }), [])

  // ── Top-used states for filter chips (hardcoded top 5) ────────────────────
  const topStates = useMemo(() => [
    { code: 'CA', label: 'California' },
    { code: 'TX', label: 'Texas' },
    { code: 'NY', label: 'New York' },
    { code: 'FL', label: 'Florida' },
    { code: 'IL', label: 'Illinois' },
  ], [])

  // Handle edit save — update local data and refresh
  const handleEditSaved = useCallback((updated: Lead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
  }, [])

  // ── Favorite toggle ─────────────────────────────────────────────────────
  const toggleFavorite = useCallback(async (id: string, isFav: boolean) => {
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, is_favorite: isFav } : l))
    try {
      await fetch(`/api/leads/${id}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: isFav }),
      })
    } catch {
      // Revert on error
      setLeads(prev => prev.map(l => l.id === id ? { ...l, is_favorite: !isFav } : l))
    }
  }, [])

  const handleClearAllFavorites = useCallback(async () => {
    setClearingFavs(true)
    try {
      await fetch('/api/leads/favorites', { method: 'DELETE' })
      setLeads(prev => prev.map(l => ({ ...l, is_favorite: false })))
      setClearFavConfirm(false)
      if (favoriteFilter) { setFavoriteFilter(false); setCurrentPage(0) }
    } catch { /* ignore */ }
    finally { setClearingFavs(false) }
  }, [favoriteFilter])

  if (loading && leads.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <EntityListView<LeadWithAction>
        columns={columns as any}
        data={leads as LeadWithAction[]}
        totalRows={totalRows}
        currentPage={currentPage}
        isLoading={loading}
        defaultSorting={[{ id: 'last_name', desc: false }]}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
        onColumnFilterChange={handleFilterChange}
        storageKey='fs-leads'
        title='Lead Search'
        defaultColVisibility={colVisibility}
        filterChips={
          <Box className='flex flex-wrap items-center gap-2'>
            {/* State pills */}
            <Chip
              label='All'
              size='small'
              variant={stateFilter === 'all' ? 'filled' : 'outlined'}
              color={stateFilter === 'all' ? 'primary' : 'default'}
              onClick={() => { setStateFilter('all'); setCurrentPage(0) }}
            />
            {topStates.map(st => (
              <Chip
                key={st.code}
                label={st.code}
                size='small'
                variant={stateFilter === st.code ? 'filled' : 'outlined'}
                color={stateFilter === st.code ? 'info' : 'default'}
                onClick={() => { setStateFilter(st.code); setCurrentPage(0) }}
              />
            ))}

            <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />

            {/* Gender pills */}
            <Chip
              icon={<i className='tabler-users text-sm' />}
              label='All'
              size='small'
              variant={genderFilter === 'all' ? 'filled' : 'outlined'}
              color={genderFilter === 'all' ? 'secondary' : 'default'}
              onClick={() => { setGenderFilter('all'); setCurrentPage(0) }}
            />
            <Chip
              icon={<i className='tabler-gender-male text-sm' />}
              label='Male'
              size='small'
              variant={genderFilter === 'M' ? 'filled' : 'outlined'}
              color={genderFilter === 'M' ? 'info' : 'default'}
              onClick={() => { setGenderFilter('M'); setCurrentPage(0) }}
            />
            <Chip
              icon={<i className='tabler-gender-female text-sm' />}
              label='Female'
              size='small'
              variant={genderFilter === 'F' ? 'filled' : 'outlined'}
              color={genderFilter === 'F' ? 'error' : 'default'}
              onClick={() => { setGenderFilter('F'); setCurrentPage(0) }}
            />

            <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />

            {/* Favorites pill */}
            <Chip
              icon={<i className='tabler-star-filled text-sm' />}
              label='Favorites'
              size='small'
              variant={favoriteFilter ? 'filled' : 'outlined'}
              color={favoriteFilter ? 'warning' : 'default'}
              onClick={() => { setFavoriteFilter(!favoriteFilter); setCurrentPage(0) }}
            />
            {favoriteFilter && (
              <Chip
                icon={<i className='tabler-trash text-sm' />}
                label='Clear All'
                size='small'
                variant='outlined'
                color='error'
                onClick={() => setClearFavConfirm(true)}
                sx={{ cursor: 'pointer' }}
              />
            )}

            {collections.length > 0 && (
              <>
                <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />
                <FormControl size='small' sx={{ minWidth: 160 }}>
                  <InputLabel>Collection</InputLabel>
                  <Select
                    value={collectionFilter}
                    label='Collection'
                    onChange={(e) => { setCollectionFilter(e.target.value); setCurrentPage(0) }}
                    sx={{ height: 28, fontSize: 13 }}
                  >
                    <MenuItem value=''><em>All Leads</em></MenuItem>
                    {collections.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
        }
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder='Search leads by name, occupation, facility, city, state...'
        newButtonLabel='Add Lead'
        onNewClick={() => { /* TODO: Open add lead drawer */ }}
        onExportCsv={exportToCSV}
        onExportJson={exportToJSON}
        exportFields={LEAD_EXPORT_FIELDS}
        bulkActions={[
          {
            label: 'Push to ACT',
            icon: 'tabler-send',
            onClick: (rows) => {
              setActPushCount(rows.length)
              setActDialogOpen(true)
            },
          },
        ]}
        emptyMessage={loading ? 'Loading…' : 'No leads found matching your filters'}
        onRowDoubleClick={(lead) => setEditLead(lead)}
        onRowEdit={(lead) => setEditLead(lead)}
      />

      {/* Edit dialog */}
      <LeadEditDialog
        open={!!editLead}
        onClose={() => setEditLead(null)}
        lead={editLead}
        onSaved={handleEditSaved}
      />

      {/* Clear All Favorites confirmation */}
      <ConfirmDialog
        open={clearFavConfirm}
        onClose={() => setClearFavConfirm(false)}
        onConfirm={handleClearAllFavorites}
        title='Clear All Favorites'
        message='This will remove the favorite flag from all leads. This action cannot be undone.'
        confirmLabel='Clear All'
        confirmColor='error'
        icon='tabler-star-off'
        loading={clearingFavs}
      />

      {/* Push to ACT progress dialog */}
      <PushToActDialog
        open={actDialogOpen}
        onClose={() => setActDialogOpen(false)}
        count={actPushCount}
      />
    </>
  )
}
