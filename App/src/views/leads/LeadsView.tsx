'use client'

/**
 * LeadsView — Lead search grid with server-side pagination & filtering.
 *
 * Uses EntityListView in server-side mode for 472K+ records.
 * Column filters translate to Supabase PostgREST queries via /api/leads.
 *
 * State is persisted via LeadsDataProvider context so navigating to other
 * sections and returning does NOT trigger a fresh data fetch.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
import { useLeadsData, type Lead } from '@/hooks/useLeadsData'
import LeadEditDialog from './LeadEditDialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import PushToActDialog from '@/components/PushToActDialog'
import SaveToCollectionDialog, { type FilterCriteria } from '@/components/SaveToCollectionDialog'
import FacilityMapDialog from '@/components/FacilityMapDialog'
import RadiusSearchDialog from '@/components/RadiusSearchDialog'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

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
  // ── Pull ALL state from the shared context (persists across navigation) ──
  const ctx = useLeadsData()
  const {
    leads, totalRows, loading,
    currentPage, pageSize,
    globalFilter, debouncedSearch, sorting, columnFilters,
    stateFilter, genderFilter, favoriteFilter,
    collectionFilter, collections,
    setLeads, setTotalRows, setLoading,
    setCurrentPage, setPageSize: setPageSizeState,
    setGlobalFilter, setDebouncedSearch,
    setSorting, setColumnFilters,
    setStateFilter, setGenderFilter, setFavoriteFilter,
    setCollectionFilter, setCollections,
    fetchLeads, refreshCollections,
    hasInitialized, markStaleCheckOnResume,
  } = ctx

  // ── Local-only UI state (doesn't need to persist across navigation) ──────
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [mapLead, setMapLead] = useState<Lead | null>(null)
  const [clearFavConfirm, setClearFavConfirm] = useState(false)
  const [clearingFavs, setClearingFavs] = useState(false)
  const [actDialogOpen, setActDialogOpen] = useState(false)
  const [actPushCount, setActPushCount] = useState(0)
  const [saveCollectionOpen, setSaveCollectionOpen] = useState(false)
  const [radiusDialogOpen, setRadiusDialogOpen] = useState(false)
  const [radiusActive, setRadiusActive] = useState<{ address: string; radius: number; center: { lat: number; lon: number }; mode?: string; exclusionZones?: any[]; searchParams?: string; total?: number } | null>(null)
  const [saveSnackbar, setSaveSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  const router = useRouter()
  const searchParams = useSearchParams()

  // ── Initial fetch: only if never initialized or stale ────────────────────
  const didMountRef = useRef(false)

  // Track filters to prevent redundant/unwanted fetches
  const lastFiltersRef = useRef<{
    debouncedSearch: string
    columnFilters: ColumnFiltersState
    stateFilter: string
    genderFilter: string
    favoriteFilter: boolean
    radiusActiveKey: string | null
  }>({
    debouncedSearch,
    columnFilters,
    stateFilter,
    genderFilter,
    favoriteFilter,
    radiusActiveKey: null,
  })

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      refreshCollections()
      if (markStaleCheckOnResume()) {
        fetchLeads()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-apply collection from ?collection= query param ──────────────────
  useEffect(() => {
    const collId = searchParams.get('collection')
    if (collId) {
      const apply = async () => {
        await handleCollectionChange(collId)
        router.replace('/leads', { scroll: false })
      }
      apply()
    }
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When user picks a collection → load its filter_criteria and apply
  const handleCollectionChange = useCallback(async (collId: string) => {
    setCollectionFilter(collId)
    setCurrentPage(0)
    if (!collId) {
      setRadiusActive(null)
      return
    }
    try {
      const res = await fetch(`/api/collections/${collId}`)
      const coll = await res.json()
      const fc = coll?.filter_criteria as FilterCriteria | null
      if (!fc) return

      if (fc.state)    setStateFilter(fc.state)
      if (fc.gender)   setGenderFilter(fc.gender)
      if (typeof fc.favorite === 'boolean') setFavoriteFilter(fc.favorite)
      if (typeof fc.search === 'string')    setGlobalFilter(fc.search)
      if (Array.isArray(fc.columnFilters))  setColumnFilters(fc.columnFilters)

      // Re-run a saved radius search and load the first page into the grid
      if (fc.radius && fc.radius.center) {
        setLoading(true)
        try {
          const activeFilters = (fc.columnFilters ?? [])
            .filter(cf => {
              const val = cf.value as ColFilterValue
              return val?.conditions?.some(isConditionActive)
            })
            .map(cf => ({ id: cf.id, value: cf.value }))

          const params = new URLSearchParams({
            lat:      String(fc.radius.center.lat),
            lon:      String(fc.radius.center.lon),
            radius:   String(fc.radius.radius),
            page:     '0',
            pageSize: String(pageSize),
            search:   fc.search ?? '',
            filters:  JSON.stringify(activeFilters),
            ...(fc.state && fc.state !== 'all' ? { state: fc.state } : {}),
            ...(fc.gender && fc.gender !== 'all' ? { gender: fc.gender } : {}),
            ...(fc.favorite ? { favorite: 'true' } : {}),
          })
          const rr = await fetch(`/api/leads/radius?${params}`)
          const json = await rr.json()
          if (!json.error) {
            setLeads(json.data)
            setTotalRows(json.total)

            // Sync ref to prevent immediate re-fetch
            const activeKey = `${fc.radius.center.lat}-${fc.radius.center.lon}-${fc.radius.radius}`
            lastFiltersRef.current = {
              debouncedSearch: fc.search ?? '',
              columnFilters: fc.columnFilters ?? [],
              stateFilter: fc.state ?? 'all',
              genderFilter: fc.gender ?? 'all',
              favoriteFilter: !!fc.favorite,
              radiusActiveKey: activeKey,
            }

            setRadiusActive({
              address: fc.radius.address,
              radius:  fc.radius.radius,
              center:  fc.radius.center,
            })
          }
        } finally {
          setLoading(false)
        }
      } else {
        setRadiusActive(null)
      }

      setSaveSnackbar({ open: true, message: `Filters from "${coll.name}" applied`, severity: 'success' })
    } catch { /* ignore */ }
  }, [setCollectionFilter, setCurrentPage, setStateFilter, setGenderFilter, setFavoriteFilter, setGlobalFilter, setColumnFilters, setLeads, setTotalRows, setLoading, pageSize])

  // Build the filter_criteria object for saving
  const currentFilterCriteria = useMemo<FilterCriteria>(() => ({
    state:         stateFilter,
    gender:        genderFilter,
    favorite:      favoriteFilter,
    search:        globalFilter,
    columnFilters,
    sorting,
    ...(radiusActive ? { radius: radiusActive } : {}),
  }), [stateFilter, genderFilter, favoriteFilter, globalFilter, columnFilters, sorting, radiusActive])

  // Build human-readable filter summary chips
  const filterSummaryChips = useMemo(() => {
    const chips: string[] = []
    if (radiusActive) chips.push(`Radius: ${radiusActive.radius} mi from ${radiusActive.address}`)
    if (stateFilter !== 'all') chips.push(`State: ${stateFilter}`)
    if (genderFilter !== 'all') chips.push(`Gender: ${genderFilter === 'M' ? 'Male' : 'Female'}`)
    if (favoriteFilter) chips.push('Favorites only')
    if (globalFilter.trim()) chips.push(`Search: "${globalFilter.trim()}"`)
    const activeColFilters = columnFilters.filter(cf => {
      const val = cf.value as ColFilterValue
      return val?.conditions?.some(isConditionActive)
    })
    if (activeColFilters.length > 0) chips.push(`${activeColFilters.length} column filter${activeColFilters.length > 1 ? 's' : ''}`)
    return chips
  }, [stateFilter, genderFilter, favoriteFilter, globalFilter, columnFilters, radiusActive])

  // Debounced search — updates debouncedSearch in context
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(globalFilter)
      setCurrentPage(0)  // Reset to first page on new search
    }, 400)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [globalFilter, setDebouncedSearch, setCurrentPage])

  // ── Re-fetch when filter/pagination deps change (but NOT on first mount if cached) ──
  const isFirstFetchSkipped = useRef(!markStaleCheckOnResume())

  useEffect(() => {
    // Skip the very first effect if we already have cached data
    if (isFirstFetchSkipped.current) {
      isFirstFetchSkipped.current = false
      return
    }
    // Skip when radius search is active — radius has its own pagination
    if (radiusActive) return
    fetchLeads()
  }, [fetchLeads, radiusActive])

  // ── Pagination handler ────────────────────────────────────────────────────
  const handlePageChange = useCallback((page: number, size: number) => {
    setCurrentPage(page)
    setPageSizeState(size)
  }, [setCurrentPage, setPageSizeState])

  const handleSortChange = useCallback((s: SortingState) => {
    setSorting(s)
    setCurrentPage(0)
  }, [setSorting, setCurrentPage])

  const handleFilterChange = useCallback((f: ColumnFiltersState) => {
    setColumnFilters(f)
    setCurrentPage(0)
  }, [setColumnFilters, setCurrentPage])

  // ── Radius search handler ─────────────────────────────────────────────────
  const handleRadiusResults = useCallback((result: any) => {
    setLeads(result.data)
    // Phase-1 metadata only (1 row). The filter-change effect fires on radius
    // activation and fetches the real first page from the server.
    setTotalRows(result.total)

    setRadiusActive({
      address: result._searchAddress || 'Selected location',
      radius: result.radius ?? 0,
      center: result.center ?? result.exclusionZones?.[0] ?? { lat: 0, lon: 0 },
      mode: result.mode,
      exclusionZones: result.exclusionZones,
      searchParams: result._searchParams,  // for export batch-fetch
      total: result.total,
    })
    setCurrentPage(0)
  }, [setLeads, setTotalRows, setCurrentPage])

  const clearRadiusSearch = useCallback(() => {
    setRadiusActive(null)
  }, [])

  const handleRadiusSaveToCollection = useCallback((result: any) => {
    handleRadiusResults(result)
    setSaveCollectionOpen(true)
  }, [handleRadiusResults])

  // Build a consistent activeKey for radius de-duplication
  const buildRadiusKey = (ra: typeof radiusActive) => {
    if (!ra) return null
    return ra.mode === 'exclude'
      ? `exclude-${ra.exclusionZones?.map((z: any) => `${z.lat}-${z.lon}-${z.radius}`).join('|') ?? 'all'}`
      : `${ra.center.lat}-${ra.center.lon}-${ra.radius}`
  }

  // Build the /api/leads/radius query for the active search + CURRENT grid
  // filters. Works for both modes: include (lat/lon/radius) and exclude
  // (mode=exclude + zones). Grid filters are read live so changing a filter
  // re-queries the server with the new constraints.
  const buildRadiusParams = useCallback((page: number, size: number): URLSearchParams | null => {
    if (!radiusActive) return null
    const activeFilters = columnFilters
      .filter(cf => {
        const val = cf.value as ColFilterValue
        return val?.conditions?.some(isConditionActive)
      })
      .map(cf => ({ id: cf.id, value: cf.value }))

    const params = new URLSearchParams()
    if (radiusActive.mode === 'exclude') {
      params.set('mode', 'exclude')
      params.set('zones', JSON.stringify(
        (radiusActive.exclusionZones ?? []).map((z: any) => ({ address: z.address, radius: z.radius }))
      ))
    } else {
      params.set('lat', String(radiusActive.center.lat))
      params.set('lon', String(radiusActive.center.lon))
      params.set('radius', String(radiusActive.radius))
    }
    params.set('page', String(page))
    params.set('pageSize', String(size))
    params.set('stateCounts', 'false')
    params.set('search', debouncedSearch)
    params.set('filters', JSON.stringify(activeFilters))
    if (stateFilter !== 'all') params.set('state', stateFilter)
    if (genderFilter !== 'all') params.set('gender', genderFilter)
    if (favoriteFilter) params.set('favorite', 'true')
    return params
  }, [radiusActive, columnFilters, debouncedSearch, stateFilter, genderFilter, favoriteFilter])

  // Radius pagination / filter re-fetch (server-side, both modes)
  const fetchRadiusPage = useCallback(async (page: number, size: number) => {
    const params = buildRadiusParams(page, size)
    if (!params) return
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/radius?${params}`)
      const json = await res.json()
      if (!json.error) {
        setLeads(json.data)
        setTotalRows(json.total)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [buildRadiusParams, setLeads, setTotalRows, setLoading])

  // Re-fetch radius page when the search target OR grid filters change while a
  // radius search is active. Covers both the initial "View Results" activation
  // (null → key) and live filter edits — for both include and exclude modes.
  useEffect(() => {
    const activeKey = buildRadiusKey(radiusActive)

    if (radiusActive) {
      const prev = lastFiltersRef.current
      const filtersChanged =
        prev.debouncedSearch !== debouncedSearch ||
        prev.columnFilters !== columnFilters ||
        prev.stateFilter !== stateFilter ||
        prev.genderFilter !== genderFilter ||
        prev.favoriteFilter !== favoriteFilter

      const radiusTargetChanged = prev.radiusActiveKey !== activeKey

      if (filtersChanged || radiusTargetChanged) {
        setCurrentPage(0)
        fetchRadiusPage(0, pageSize)
      }
    }

    lastFiltersRef.current = {
      debouncedSearch,
      columnFilters,
      stateFilter,
      genderFilter,
      favoriteFilter,
      radiusActiveKey: activeKey,
    }
  }, [debouncedSearch, columnFilters, stateFilter, genderFilter, favoriteFilter, radiusActive, pageSize, fetchRadiusPage, setCurrentPage])

  const handlePageChangeWrapped = useCallback((page: number, size: number) => {
    if (radiusActive) {
      setCurrentPage(page)
      setPageSizeState(size)
      fetchRadiusPage(page, size)
    } else {
      handlePageChange(page, size)
    }
  }, [radiusActive, handlePageChange, fetchRadiusPage, setCurrentPage, setPageSizeState])

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

  // Full-result-set export. Routes to the radius-export endpoint when a
  // radius search is active, otherwise to the regular leads-export endpoint
  // with the current filter set applied.
  const handleExportAll = useCallback(async (): Promise<LeadWithAction[] | null> => {
    try {
      let url: string
      if (radiusActive) {
        // Exclude mode: batch-fetch every matching row from the server, using
        // the CURRENT grid filters (buildRadiusParams reads them live, so the
        // export matches what the grid is showing).
        if (radiusActive.mode === 'exclude') {
          const total = totalRows
          const BATCH = 500
          const batchCount = Math.ceil(total / BATCH)
          const allData: any[] = []

          const concurrency = 4
          for (let start = 0; start < batchCount; start += concurrency) {
            const batch = Array.from(
              { length: Math.min(concurrency, batchCount - start) },
              (_, i) => {
                const params = buildRadiusParams(start + i, BATCH)!
                return fetch(`/api/leads/radius?${params}`).then(r => r.json())
              }
            )
            const results = await Promise.all(batch)
            for (const json of results) {
              if (json.error) throw new Error(json.error)
              allData.push(...(json.data ?? []))
            }
          }
          return allData as LeadWithAction[]
        }

        // For include mode: use existing export endpoint
        const activeFilters = columnFilters
          .filter(cf => {
            const val = cf.value as ColFilterValue
            return val?.conditions?.some(isConditionActive)
          })
          .map(cf => ({ id: cf.id, value: cf.value }))

        const params = new URLSearchParams({
          lat:    String(radiusActive.center.lat),
          lon:    String(radiusActive.center.lon),
          radius: String(radiusActive.radius),
          format: 'json',
          search:   debouncedSearch,
          filters:  JSON.stringify(activeFilters),
          ...(stateFilter !== 'all' ? { state: stateFilter } : {}),
          ...(genderFilter !== 'all' ? { gender: genderFilter } : {}),
          ...(favoriteFilter ? { favorite: 'true' } : {}),
        })
        url = `/api/leads/radius/export?${params}`
      } else {
        const params = new URLSearchParams({
          search:   globalFilter,
          state:    stateFilter !== 'all' ? stateFilter : '',
          gender:   genderFilter !== 'all' ? genderFilter : '',
          favorite: favoriteFilter ? 'true' : '',
          sort:     JSON.stringify(sorting ?? []),
          filters:  JSON.stringify(columnFilters ?? []),
          format:   'json',
        })
        url = `/api/leads/export?${params}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      if (json?.capped) {
        setSaveSnackbar({
          open: true,
          message: `Result set was capped at ${json.total.toLocaleString()} rows. Narrow your filters for a complete export.`,
          severity: 'error',
        })
      }
      return (json.data ?? []) as LeadWithAction[]
    } catch {
      setSaveSnackbar({ open: true, message: 'Export failed — please try again.', severity: 'error' })
      return null
    }
  }, [radiusActive, totalRows, buildRadiusParams, globalFilter, debouncedSearch, stateFilter, genderFilter, favoriteFilter, sorting, columnFilters])

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo(() => {
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
        header: 'Facility', size: 220,
        cell: ({ row }) => {
          const lead = row.original
          const hasAddress = !!(lead.facility_address || lead.facility_city || lead.facility_state || lead.facility_zip_code)
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
              <Typography className='text-sm' noWrap sx={{ flex: 1, minWidth: 0 }}>
                {lead.facility_name || '—'}
              </Typography>
              {hasAddress && (
                <Tooltip title='View on Google Maps'>
                  <IconButton
                    size='small'
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      setMapLead(lead)
                    }}
                    sx={{
                      p: '2px',
                      flexShrink: 0,
                      color: 'text.disabled',
                      '&:hover': { color: '#4285F4' },
                      transition: 'color 0.15s',
                    }}
                  >
                    <i className='tabler-map-pin' style={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )
        },
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
      columnHelper.accessor('gender', {
        header: 'Gender', size: 90,
        cell: ({ row }) => {
          const g = (row.original as any).gender
          if (g === 'M') return <Chip label='Male'   size='small' color='info'  variant='tonal' sx={{ fontSize: 11, height: 22 }} />
          if (g === 'F') return <Chip label='Female' size='small' color='error' variant='tonal' sx={{ fontSize: 11, height: 22 }} />
          return <Typography className='text-sm'>—</Typography>
        },
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
    gender: false,
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
  }, [setLeads])

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
  }, [setLeads])

  const handleClearAllFavorites = useCallback(async () => {
    setClearingFavs(true)
    try {
      await fetch('/api/leads/favorites', { method: 'DELETE' })
      setLeads(prev => prev.map(l => ({ ...l, is_favorite: false })))
      setClearFavConfirm(false)
      if (favoriteFilter) { setFavoriteFilter(false); setCurrentPage(0) }
    } catch { /* ignore */ }
    finally { setClearingFavs(false) }
  }, [favoriteFilter, setLeads, setFavoriteFilter, setCurrentPage])

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
        onPageChange={handlePageChangeWrapped}
        onSortChange={handleSortChange}
        onColumnFilterChange={handleFilterChange}
        columnFilters={columnFilters}
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

            {/* Radius search */}
            <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />
            <Tooltip title='Search by radius from an address'>
              <IconButton
                size='small'
                onClick={() => setRadiusDialogOpen(true)}
                sx={{
                  color: radiusActive ? '#fff' : 'text.secondary',
                  background: radiusActive
                    ? 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)'
                    : 'transparent',
                  '&:hover': {
                    background: radiusActive
                      ? 'linear-gradient(135deg, #6d28d9 0%, #1d4ed8 100%)'
                      : 'action.hover',
                  },
                  transition: 'all 0.2s',
                }}
              >
                <i className='tabler-radar-2 text-lg' />
              </IconButton>
            </Tooltip>
            {radiusActive && (
              <Chip
                icon={<i className='tabler-map-pin text-sm' />}
                label={`${radiusActive.radius} mi radius`}
                size='small'
                color='primary'
                variant='filled'
                onDelete={clearRadiusSearch}
                sx={{ fontWeight: 600 }}
              />
            )}

            {/* Save current filters to a collection */}
            <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />
            <Tooltip title={filterSummaryChips.length > 0 ? 'Save current filters to a collection' : 'Apply filters first to save them'}>
              <span>
                <IconButton
                  size='small'
                  onClick={() => setSaveCollectionOpen(true)}
                  sx={{ color: 'primary.main' }}
                >
                  <i className='tabler-bookmark-plus text-lg' />
                </IconButton>
              </span>
            </Tooltip>

            {collections.length > 0 && (
              <>
                <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />
                <Select
                  size='small'
                  displayEmpty
                  value={collectionFilter}
                  onChange={(e) => handleCollectionChange(e.target.value)}
                  renderValue={(val) => val
                    ? (collections.find(c => c.id === val)?.name ?? 'Collection')
                    : <span style={{ color: 'var(--mui-palette-text-secondary)' }}>Collection</span>
                  }
                  sx={{ height: 28, fontSize: 13, minWidth: 160 }}
                >
                  <MenuItem value=''><em>All Leads</em></MenuItem>
                  {collections.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
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
        onExportAll={handleExportAll}
        exportAllLabel={
          radiusActive
            ? `Export All ${totalRows.toLocaleString()} Radius Results`
            : `Export All ${totalRows.toLocaleString()} Filtered Results`
        }
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

      {/* Facility map dialog */}
      <FacilityMapDialog
        open={!!mapLead}
        onClose={() => setMapLead(null)}
        facilityName={mapLead?.facility_name ?? null}
        address={mapLead?.facility_address ?? null}
        city={mapLead?.facility_city ?? null}
        state={mapLead?.facility_state ?? null}
        zip={mapLead?.facility_zip_code ?? null}
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

      {/* Radius search dialog */}
      <RadiusSearchDialog
        open={radiusDialogOpen}
        onClose={() => setRadiusDialogOpen(false)}
        onResults={handleRadiusResults}
        onSaveToCollection={handleRadiusSaveToCollection}
      />

      {/* Push to ACT progress dialog */}
      <PushToActDialog
        open={actDialogOpen}
        onClose={() => setActDialogOpen(false)}
        count={actPushCount}
      />

      {/* Save filters to collection dialog */}
      <SaveToCollectionDialog
        open={saveCollectionOpen}
        onClose={() => setSaveCollectionOpen(false)}
        filterCriteria={currentFilterCriteria}
        filterSummary={filterSummaryChips}
        totalLeads={totalRows}
        collections={collections}
        onSaved={({ name, isNew }) => {
          refreshCollections()
          setSaveSnackbar({ open: true, message: `Filters ${isNew ? 'saved to new' : 'updated in'} collection "${name}"`, severity: 'success' })
        }}
      />

      {/* Success / error toast */}
      <Snackbar
        open={saveSnackbar.open}
        autoHideDuration={4000}
        onClose={() => setSaveSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={saveSnackbar.severity} variant='filled' onClose={() => setSaveSnackbar(s => ({ ...s, open: false }))}>
          {saveSnackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
