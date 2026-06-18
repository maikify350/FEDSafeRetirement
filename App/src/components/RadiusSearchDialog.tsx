'use client'

/**
 * RadiusSearchDialog — Dual-mode radius search for leads.
 *
 * MODE: Seminar (include) — Find leads WITHIN a radius of one address.
 * MODE: Webinar (exclude) — Find all leads in a state, EXCLUDING those
 *        within the radius of multiple addresses (exclusion zones).
 *
 * Persists state (addresses, radii, mode, merge preference) to localStorage.
 */

import { useState, useCallback, useEffect, useMemo } from 'react'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Slider from '@mui/material/Slider'
import Fade from '@mui/material/Fade'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Collapse from '@mui/material/Collapse'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

import AddressAutocomplete from '@/components/AddressAutocomplete'
import RadiusMapDialog from '@/components/RadiusMapDialog'
import { useLeadsData } from '@/hooks/useLeadsData'
import { isConditionActive, type ColFilterValue, type FilterOp } from '@/lib/columnFilter'

const RADIUS_MARKS = [
  { value: 5, label: '5 mi' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: 75, label: '75' },
  { value: 100, label: '100 mi' },
]

interface StatCount {
  facility_state: string
  lead_count: number
}

interface ExclusionZone {
  id: string
  address: string
  radius: number
}

interface GeocodedZone {
  address: string
  lat: number
  lon: number
  radius: number
}

interface RadiusSearchResult {
  mode?: 'include' | 'exclude'
  data: any[]
  total: number
  totalBeforeExclusion?: number
  center?: { lat: number; lon: number }
  radius?: number
  exclusionZones?: GeocodedZone[]
  stateCounts?: StatCount[]
  _searchParams?: string
}

interface RadiusSearchDialogProps {
  open: boolean
  onClose: () => void
  onResults: (result: RadiusSearchResult) => void
  onSaveToCollection?: (result: RadiusSearchResult) => void
}

const STORAGE_KEY = 'fs-radius-search'

// Operator label map
const OP_LABELS: Record<FilterOp, string> = {
  contains: 'contains', notContains: '≠ contains',
  startsWith: 'starts with', endsWith: 'ends with',
  equals: '=', notEquals: '≠',
  isEmpty: 'is empty', isNotEmpty: 'is not empty',
}

// Column display labels
const COL_LABELS: Record<string, string> = {
  first_name: 'First Name', last_name: 'Last Name', middle_initial: 'MI',
  occupation_title: 'Occupation', grade_level: 'Grade', annual_salary: 'Salary',
  hourly_rate: 'Hourly Rate', facility_name: 'Facility', facility_city: 'City',
  facility_state: 'State', facility_zip_code: 'Zip', facility_address: 'Address',
  entered_on_duty_date: 'Duty Date', years_of_service: 'Years', gender: 'Gender',
  source_file: 'Source', is_favorite: 'Favorite',
}

let _nextId = 0

function makeId() { return `zone-${++_nextId}-${Date.now()}` }

export default function RadiusSearchDialog({ open, onClose, onResults, onSaveToCollection }: RadiusSearchDialogProps) {
  const { debouncedSearch, stateFilter, genderFilter, favoriteFilter, columnFilters } = useLeadsData()

  // ── Mode ─────────────────────────────────────────────────────────────
  const [searchMode, setSearchMode] = useState<'include' | 'exclude'>('include')

  // ── Include mode (Seminar) ───────────────────────────────────────────
  const [address, setAddress] = useState('')
  const [radius, setRadius] = useState(25)

  // ── Exclude mode (Webinar) ───────────────────────────────────────────
  const [zones, setZones] = useState<ExclusionZone[]>([
    { id: makeId(), address: '', radius: 50 },
  ])

  // ── Common state ─────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mergeFilters, setMergeFilters] = useState(true)
  const [appliedFilterDescs, setAppliedFilterDescs] = useState<{ key: string; label: string; icon: string }[]>([])
  const [resultData, setResultData] = useState<RadiusSearchResult | null>(null)
  const [mapOpen, setMapOpen] = useState(false)

  // ── Filter descriptions ──────────────────────────────────────────────
  const activeFilterDescriptions = useMemo(() => {
    const desc: { key: string; label: string; icon: string }[] = []

    if (stateFilter !== 'all') desc.push({ key: 'state', label: `State = ${stateFilter}`, icon: 'tabler-map-pin' })
    if (genderFilter !== 'all') desc.push({ key: 'gender', label: `Gender = ${genderFilter === 'M' ? 'Male' : 'Female'}`, icon: 'tabler-users' })
    if (favoriteFilter) desc.push({ key: 'favorite', label: 'Favorites only', icon: 'tabler-star-filled' })
    if (debouncedSearch.trim()) desc.push({ key: 'search', label: `Search: "${debouncedSearch.trim()}"`, icon: 'tabler-search' })

    for (const cf of columnFilters) {
      const val = cf.value as ColFilterValue

      if (!val?.conditions) continue
      const active = val.conditions.filter(isConditionActive)

      if (active.length === 0) continue
      const colLabel = COL_LABELS[cf.id as string] ?? cf.id

      for (const cond of active) {
        const opLabel = OP_LABELS[cond.op] ?? cond.op
        const valueStr = cond.value.trim()

        if (cond.op === 'isEmpty' || cond.op === 'isNotEmpty') {
          desc.push({ key: `${cf.id}-${cond.op}`, label: `${colLabel} ${opLabel}`, icon: 'tabler-filter' })
        } else {
          desc.push({ key: `${cf.id}-${cond.op}-${valueStr}`, label: `${colLabel} ${opLabel} "${valueStr}"`, icon: 'tabler-filter' })
        }
      }
    }

    
return desc
  }, [stateFilter, genderFilter, favoriteFilter, debouncedSearch, columnFilters])

  const hasActiveFilters = activeFilterDescriptions.length > 0

  // ── Persist to localStorage ──────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)

      if (saved) {
        const p = JSON.parse(saved)

        if (p.searchMode) setSearchMode(p.searchMode)
        if (p.address) setAddress(p.address)
        if (p.radius) setRadius(p.radius)
        if (Array.isArray(p.zones) && p.zones.length > 0) setZones(p.zones)
        if (typeof p.mergeFilters === 'boolean') setMergeFilters(p.mergeFilters)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ searchMode, address, radius, zones, mergeFilters }))
    } catch { /* ignore */ }
  }, [searchMode, address, radius, zones, mergeFilters])

  // ── Zone management ──────────────────────────────────────────────────
  const addZone = () => setZones(prev => [...prev, { id: makeId(), address: '', radius: 50 }])
  const removeZone = (id: string) => setZones(prev => prev.length > 1 ? prev.filter(z => z.id !== id) : prev)
  const updateZoneAddress = (id: string, addr: string) => setZones(prev => prev.map(z => z.id === id ? { ...z, address: addr } : z))
  const updateZoneRadius = (id: string, r: number) => setZones(prev => prev.map(z => z.id === id ? { ...z, radius: r } : z))

  // ── Search handler ───────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (searchMode === 'include' && !address.trim()) {
      setError('Please enter an address')
      
return
    }

    if (searchMode === 'exclude') {
      const filledZones = zones.filter(z => z.address.trim())

      if (filledZones.length === 0) {
        setError('Please enter at least one exclusion address')
        
return
      }
    }

    setLoading(true)
    setError('')
    setResultData(null)

    try {
      let activeFilters = mergeFilters
        ? columnFilters
            .filter(cf => {
              const val = cf.value as ColFilterValue

              
return val?.conditions?.some(isConditionActive)
            })
            .map(cf => ({ id: cf.id, value: cf.value }))
        : []

      // Performance optimisation: extract facility_state column filter
      // and pass it as the direct `state` param (uses btree index → 24x faster
      // than ILIKE through the filters array).
      let effectiveState = mergeFilters && stateFilter !== 'all' ? stateFilter : ''

      if (!effectiveState && mergeFilters) {
        const stateColFilter = activeFilters.find(f => f.id === 'facility_state')

        if (stateColFilter) {
          const val = stateColFilter.value as ColFilterValue

          const eqCond = val?.conditions?.find(
            c => (c.op === 'contains' || c.op === 'equals') && c.value.trim().length === 2
          )

          if (eqCond) {
            effectiveState = eqCond.value.trim().toUpperCase()

            // Remove from filters array to avoid double-filtering
            activeFilters = activeFilters.filter(f => f.id !== 'facility_state')
          }
        }
      }

      const commonParams: Record<string, string> = {
        page: '0',
        pageSize: '1',            // Phase 1: just get counts + stats
        stateCounts: 'true',
        search: mergeFilters ? debouncedSearch : '',
        filters: JSON.stringify(activeFilters),
        ...(effectiveState ? { state: effectiveState } : {}),
        ...(mergeFilters && genderFilter !== 'all' ? { gender: genderFilter } : {}),
        ...(mergeFilters && favoriteFilter ? { favorite: 'true' } : {}),
      }

      let params: URLSearchParams

      if (searchMode === 'exclude') {
        const filledZones = zones.filter(z => z.address.trim())

        params = new URLSearchParams({
          mode: 'exclude',
          zones: JSON.stringify(filledZones.map(z => ({ address: z.address, radius: z.radius }))),
          ...commonParams,
        })
      } else {
        params = new URLSearchParams({
          mode: 'include',
          address,
          radius: String(radius),
          ...commonParams,
        })
      }

      const res = await fetch(`/api/leads/radius?${params}`)
      const json = await res.json()

      if (!res.ok || json.error) {
        setError(json.error || 'Search failed')
        
return
      }

      // Store the search params so we can re-fetch with full pageSize later
      setResultData({ ...json, _searchParams: params.toString() })
      setAppliedFilterDescs(mergeFilters ? activeFilterDescriptions : [])
    } catch (err) {
      setError('Search failed — please try again')
    } finally {
      setLoading(false)
    }
  }, [searchMode, address, radius, zones, debouncedSearch, stateFilter, genderFilter, favoriteFilter, columnFilters, mergeFilters, activeFilterDescriptions])

  // ── Batch-fetch ALL rows on the client side (500 per request) ──────
  const fetchAllRows = useCallback(async (): Promise<any[] | null> => {
    if (!resultData?._searchParams) return null
    const total = resultData.total

    if (total === 0) return []

    const BATCH = 500
    const batchCount = Math.ceil(total / BATCH)
    const allData: any[] = []

    // Fetch batches in parallel (max 4 at a time to avoid overwhelming)
    const concurrency = 4

    for (let start = 0; start < batchCount; start += concurrency) {
      const batch = Array.from(
        { length: Math.min(concurrency, batchCount - start) },
        (_, i) => {
          const pageIdx = start + i
          const params = new URLSearchParams(resultData._searchParams ?? '')

          params.set('page', String(pageIdx))
          params.set('pageSize', String(BATCH))
          params.set('stateCounts', 'false')
          
return fetch(`/api/leads/radius?${params}`).then(r => r.json())
        }
      )

      const results = await Promise.all(batch)

      for (const json of results) {
        if (json.error) {
          setError(json.error)
          
return null
        }

        allData.push(...(json.data ?? []))
      }
    }

    
return allData
  }, [resultData])

  // Pass results to parent — export handler will fetch full data when needed
  const handleApplyResults = useCallback(() => {
    if (!resultData) return

    const fullResult = {
      ...resultData,
      _searchAddress: searchMode === 'include' ? address : zones.map(z => z.address).join(' | '),
    }

    onResults(fullResult as any)
    onClose()
  }, [resultData, address, zones, searchMode, onResults, onClose])

  const handleSaveToCollection = useCallback(async () => {
    if (!resultData || !onSaveToCollection) return

    setLoading(true)

    try {
      const allData = await fetchAllRows()

      if (!allData) return

      const fullResult = {
        ...resultData,
        data: allData,
        _searchAddress: searchMode === 'include' ? address : zones.map(z => z.address).join(' | '),
      }

      onSaveToCollection(fullResult as any)
      onClose()
    } catch {
      setError('Failed to fetch all results')
    } finally {
      setLoading(false)
    }
  }, [resultData, address, zones, searchMode, onSaveToCollection, onClose, fetchAllRows])

  const handleClose = () => { if (!loading) { setError(''); setResultData(null); onClose() } }
  const handleNewSearch = () => { setResultData(null); setError('') }

  // ── Can search? ──────────────────────────────────────────────────────
  const canSearch = searchMode === 'include'
    ? address.trim().length > 0
    : zones.some(z => z.address.trim().length > 0)

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='sm'
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'visible' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: searchMode === 'include'
                ? 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)'
                : 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
              color: '#fff', flexShrink: 0, transition: 'background 0.3s',
            }}
          >
            <i className={searchMode === 'include' ? 'tabler-radar-2 text-xl' : 'tabler-circle-off text-xl'} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant='h6' fontWeight={700}>
              Radius Search
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {searchMode === 'include'
                ? 'Find leads near a specific address (Seminar)'
                : 'Exclude metro areas from a state (Webinar)'}
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            disabled={loading}
            size='small'
            sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
          >
            <i className='tabler-x' style={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* ── Mode Toggle ── */}
        {!resultData && (
          <Box sx={{ mb: 2.5 }}>
            <ToggleButtonGroup
              value={searchMode}
              exclusive
              onChange={(_, v) => { if (v) setSearchMode(v) }}
              fullWidth
              size='small'
              sx={{
                '& .MuiToggleButton-root': {
                  textTransform: 'none', fontWeight: 600, fontSize: 13,
                  '&.Mui-selected': { color: '#fff' },
                },
              }}
            >
              <ToggleButton
                value='include'
                sx={{
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #6d28d9 0%, #1d4ed8 100%)' },
                  },
                }}
              >
                <i className='tabler-radar-2' style={{ marginRight: 6 }} /> Seminar — Find Within
              </ToggleButton>
              <ToggleButton
                value='exclude'
                sx={{
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #b91c1c 0%, #c2410c 100%)' },
                  },
                }}
              >
                <i className='tabler-circle-off' style={{ marginRight: 6 }} /> Webinar — Exclude Areas
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {/* ── INCLUDE MODE (Seminar) ── */}
        {!resultData && searchMode === 'include' && (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant='subtitle2' sx={{ mb: 1, fontWeight: 600 }}>
                Center Address
              </Typography>
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                onPlaceSelected={(place) => {
                  setAddress([place.street, place.city, place.state, place.zipCode].filter(Boolean).join(', '))
                }}
                label='' placeholder='Enter an address, city, or zip code...' size='small' autoFocus
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant='subtitle2' fontWeight={600}>Search Radius</Typography>
                <Chip label={`${radius} miles`} size='small' color='primary' variant='tonal' sx={{ fontWeight: 700, fontSize: 13 }} />
              </Box>
              <Slider
                value={radius} onChange={(_, val) => setRadius(val as number)}
                min={5} max={100} step={5} marks={RADIUS_MARKS}
                valueLabelDisplay='auto' valueLabelFormat={(v) => `${v} mi`}
                sx={{ mt: 1, '& .MuiSlider-markLabel': { fontSize: 11, color: 'text.secondary' } }}
              />
            </Box>
          </>
        )}

        {/* ── EXCLUDE MODE (Webinar) ── */}
        {!resultData && searchMode === 'exclude' && (
          <>
            <Typography variant='subtitle2' fontWeight={600} sx={{ mb: 1 }}>
              Exclusion Zones
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1.5, lineHeight: 1.3 }}>
              Enter addresses of cities/areas to exclude. Leads within each zone&apos;s radius will be removed from results.
            </Typography>

            {zones.map((zone, idx) => (
              <Box
                key={zone.id}
                sx={{
                  mb: 1.5, p: 1.5, borderRadius: 2,
                  border: '1px solid', borderColor: 'divider',
                  bgcolor: 'background.paper',
                  position: 'relative',
                }}
              >
                {zones.length > 1 && (
                  <IconButton
                    size='small'
                    onClick={() => removeZone(zone.id)}
                    sx={{ position: 'absolute', top: 4, right: 4, color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                  >
                    <i className='tabler-x' style={{ fontSize: 14 }} />
                  </IconButton>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                  <Box sx={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
                    color: '#fff', fontSize: 11, fontWeight: 800,
                  }}>
                    {idx + 1}
                  </Box>
                  <Typography variant='caption' fontWeight={600} color='text.secondary'>
                    Exclusion Zone {idx + 1}
                  </Typography>
                </Box>

                <AddressAutocomplete
                  value={zone.address}
                  onChange={(val) => updateZoneAddress(zone.id, val)}
                  onPlaceSelected={(place) => {
                    updateZoneAddress(zone.id, [place.street, place.city, place.state, place.zipCode].filter(Boolean).join(', '))
                  }}
                  label='' placeholder='City or address to exclude...' size='small'
                />

                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant='caption' color='text.secondary' sx={{ flexShrink: 0 }}>
                    Radius:
                  </Typography>
                  <Slider
                    value={zone.radius}
                    onChange={(_, val) => updateZoneRadius(zone.id, val as number)}
                    min={5} max={100} step={5}
                    valueLabelDisplay='auto' valueLabelFormat={(v) => `${v} mi`}
                    size='small'
                    sx={{ flex: 1, '& .MuiSlider-thumb': { width: 14, height: 14 } }}
                  />
                  <Chip
                    label={`${zone.radius} mi`}
                    size='small' variant='outlined'
                    sx={{ fontSize: 11, height: 22, fontWeight: 700, minWidth: 50 }}
                  />
                </Box>
              </Box>
            ))}

            <Button
              startIcon={<i className='tabler-plus' />}
              onClick={addZone}
              size='small'
              variant='outlined'
              color='secondary'
              sx={{ mb: 1, textTransform: 'none', fontWeight: 600 }}
            >
              Add Exclusion Zone
            </Button>
          </>
        )}

        {/* ── Merge with Grid Filters panel ── */}
        {!resultData && hasActiveFilters && (
          <Box
            sx={{
              mt: 2, mb: 1, p: 1.5, borderRadius: 2,
              border: '1px solid',
              borderColor: mergeFilters ? 'primary.main' : 'divider',
              bgcolor: mergeFilters ? 'rgba(var(--mui-palette-primary-mainChannel) / 0.04)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <FormControlLabel
              control={<Checkbox checked={mergeFilters} onChange={(e) => setMergeFilters(e.target.checked)} size='small' sx={{ py: 0 }} />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <i className='tabler-filter-cog' style={{ fontSize: 16 }} />
                  <Typography variant='subtitle2' fontWeight={600}>Merge with Grid Filters</Typography>
                  <Chip label={activeFilterDescriptions.length} size='small' color={mergeFilters ? 'primary' : 'default'} variant='tonal' sx={{ height: 18, fontSize: 11, fontWeight: 700, minWidth: 22 }} />
                </Box>
              }
              sx={{ mr: 0, mb: 0 }}
            />
            <Collapse in={mergeFilters}>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {activeFilterDescriptions.map(desc => (
                  <Chip key={desc.key} icon={<i className={desc.icon} style={{ fontSize: 13 }} />} label={desc.label} size='small' variant='outlined'
                    sx={{ fontSize: 11, height: 24, borderColor: 'divider', '& .MuiChip-icon': { fontSize: 13, ml: 0.5 } }}
                  />
                ))}
              </Box>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1, lineHeight: 1.3 }}>
                {searchMode === 'include'
                  ? 'The radius search will also apply these grid filters.'
                  : 'Exclusion will apply on top of these grid filters (e.g. State = WI).'}
              </Typography>
            </Collapse>
            {!mergeFilters && (
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
                Grid filters will be ignored — pure geographic search.
              </Typography>
            )}
          </Box>
        )}

        {/* ── Results Summary ── */}
        {resultData && (
          <Box>
            {/* ── EXCLUSION MODE: Flow breakdown ── */}
            {searchMode === 'exclude' && resultData.totalBeforeExclusion != null ? (
              <>
                {/* Flow: Total → Excluded → Remaining */}
                <Box sx={{ mb: 2 }}>
                  {/* Total before */}
                  <Box sx={{
                    p: 1.5, borderRadius: 2, mb: 1,
                    bgcolor: 'rgba(var(--mui-palette-info-mainChannel) / 0.06)',
                    border: '1px solid', borderColor: 'divider',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <i className='tabler-users' style={{ fontSize: 18, color: 'var(--mui-palette-info-main)' }} />
                      <Typography variant='body2' fontWeight={600}>Total Leads (with filters)</Typography>
                    </Box>
                    <Typography variant='h6' fontWeight={800} color='info.main'>
                      {resultData.totalBeforeExclusion.toLocaleString()}
                    </Typography>
                  </Box>

                  {/* Exclusion zones */}
                  {resultData.exclusionZones && resultData.exclusionZones.map((z, i) => (
                    <Box key={i} sx={{
                      p: 1.5, borderRadius: 2, mb: 0.75,
                      bgcolor: 'rgba(var(--mui-palette-error-mainChannel) / 0.04)',
                      border: '1px solid', borderColor: 'error.outlinedBorder',
                      display: 'flex', alignItems: 'center', gap: 1,
                    }}>
                      <Box sx={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'error.main', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                        {i + 1}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant='caption' fontWeight={600} color='error.main'>Exclude {z.radius} mi radius</Typography>
                        <Typography variant='caption' color='text.secondary' display='block' noWrap>{z.address}</Typography>
                      </Box>
                      <i className='tabler-minus' style={{ fontSize: 14, color: 'var(--mui-palette-error-main)' }} />
                    </Box>
                  ))}

                  {/* Arrow */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.5 }}>
                    <i className='tabler-arrow-down' style={{ fontSize: 20, color: 'var(--mui-palette-text-secondary)' }} />
                  </Box>

                  {/* Remaining */}
                  <Box sx={{
                    p: 2, borderRadius: 2,
                    background: 'linear-gradient(135deg, rgba(22,163,74,0.08) 0%, rgba(16,185,129,0.08) 100%)',
                    border: '2px solid', borderColor: 'success.main',
                    textAlign: 'center', position: 'relative',
                  }}>
                    {resultData.exclusionZones && (
                      <Tooltip title='View Exclusion Map'>
                        <IconButton
                          size='small' onClick={() => setMapOpen(true)}
                          sx={{ position: 'absolute', top: 8, right: 8, color: 'error.main', bgcolor: 'error.lightOpacity', '&:hover': { bgcolor: 'error.main', color: '#fff' }, transition: 'all 0.2s' }}
                        >
                          <i className='tabler-map' style={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Typography variant='h3' fontWeight={800} color='success.main'>
                      {resultData.total.toLocaleString()}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      leads remaining
                      {resultData.totalBeforeExclusion > 0 && (
                        <> · <strong>{(resultData.totalBeforeExclusion - resultData.total).toLocaleString()}</strong> excluded ({((resultData.totalBeforeExclusion - resultData.total) / resultData.totalBeforeExclusion * 100).toFixed(0)}%)</>
                      )}
                    </Typography>
                  </Box>
                </Box>
              </>
            ) : (

              /* ── INCLUDE MODE: Simple count ── */
              <Box
                sx={{
                  p: 2, mb: 2, borderRadius: 2,
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(37,99,235,0.08) 100%)',
                  border: '1px solid', borderColor: 'divider',
                  textAlign: 'center', position: 'relative',
                }}
              >
                {resultData.center && (
                  <Tooltip title='View on Map'>
                    <IconButton
                      size='small' onClick={() => setMapOpen(true)}
                      sx={{ position: 'absolute', top: 8, right: 8, color: 'primary.main', bgcolor: 'primary.lightOpacity', '&:hover': { bgcolor: 'primary.main', color: '#fff' }, transition: 'all 0.2s' }}
                    >
                      <i className='tabler-map' style={{ fontSize: 20 }} />
                    </IconButton>
                  </Tooltip>
                )}
                <Typography variant='h3' fontWeight={800} color='primary.main'>
                  {resultData.total.toLocaleString()}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  leads found within <strong>{resultData.radius} miles</strong>
                </Typography>
              </Box>
            )}

            {/* State breakdown */}
            {resultData.stateCounts && resultData.stateCounts.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant='subtitle2' fontWeight={600} sx={{ mb: 1 }}>Breakdown by State</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1 }}>
                  {resultData.stateCounts.map((sc) => (
                    <Box key={sc.facility_state} sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper' }}>
                      <Chip label={sc.facility_state} size='small' color='info' variant='tonal' sx={{ fontWeight: 700, fontSize: 12 }} />
                      <Typography variant='body2' fontWeight={700}>{Number(sc.lead_count).toLocaleString()}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Applied filters */}
            {appliedFilterDescs.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant='subtitle2' fontWeight={600} sx={{ mb: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <i className='tabler-filter-cog' style={{ fontSize: 15 }} /> Applied Grid Filters
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {appliedFilterDescs.map(desc => (
                    <Chip key={desc.key} icon={<i className={desc.icon} style={{ fontSize: 13 }} />} label={desc.label} size='small' variant='outlined' color='secondary'
                      sx={{ fontSize: 11, height: 24, '& .MuiChip-icon': { fontSize: 13, ml: 0.5 } }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Address reminder (include mode) */}
            {searchMode === 'include' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <i className='tabler-map-pin text-textSecondary' style={{ fontSize: 16 }} />
                <Typography variant='caption' color='text.secondary' noWrap>{address}</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Error */}
        <Fade in={!!error}>
          <Typography color='error' variant='body2' sx={{ mt: 1 }}>{error}</Typography>
        </Fade>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {!resultData ? (
          <>
            <Button onClick={handleClose} disabled={loading} variant='outlined' color='secondary'>Cancel</Button>
            <Button
              onClick={handleSearch}
              disabled={loading || !canSearch}
              variant='contained'
              startIcon={loading ? <CircularProgress size={16} color='inherit' /> : <i className={searchMode === 'include' ? 'tabler-radar-2' : 'tabler-circle-off'} />}
              sx={{
                background: searchMode === 'include'
                  ? 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)'
                  : 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
                fontWeight: 600, minWidth: 140,
              }}
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleNewSearch} disabled={loading} variant='outlined' color='secondary'>New Search</Button>
            {onSaveToCollection && (
              <Button onClick={handleSaveToCollection} disabled={loading} variant='outlined' color='primary' startIcon={loading ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-bookmark-plus' />} sx={{ fontWeight: 600 }}>
                Save to Collection
              </Button>
            )}
            <Button
              onClick={handleApplyResults}
              disabled={loading}
              variant='contained'
              startIcon={loading ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-filter' />}
              sx={{
                background: searchMode === 'include'
                  ? 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)'
                  : 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
                fontWeight: 600, minWidth: 160,
              }}
            >
              {loading ? 'Loading all...' : `View ${resultData.total.toLocaleString()} Results`}
            </Button>
          </>
        )}
      </DialogActions>

      {/* Radius map overlay */}
      {resultData && (resultData.center || resultData.exclusionZones) && (
        <RadiusMapDialog
          open={mapOpen}
          onClose={() => setMapOpen(false)}
          center={resultData.center ?? (resultData.exclusionZones ? { lat: resultData.exclusionZones[0].lat, lon: resultData.exclusionZones[0].lon } : { lat: 0, lon: 0 })}
          radiusMiles={resultData.radius ?? 0}
          address={searchMode === 'include' ? address : 'Exclusion Zone Search'}
          total={resultData.total}
          stateCounts={resultData.stateCounts}
          exclusionZones={resultData.exclusionZones}
        />
      )}
    </Dialog>
  )
}
