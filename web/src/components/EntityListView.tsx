'use client'

/**
 * EntityListView — shared data-grid shell used by every entity list page.
 *
 * What lives HERE (write once, fix everywhere):
 *   • Toolbar: col-picker, filter-row toggle, density cycle, list/cards toggle,
 *              export dropdown, primary action button
 *   • Column-picker popover (with drag-to-reorder)
 *   • TanStack table + DnD column reordering
 *   • Bottom TablePagination
 *   • Bulk-selection floating bar
 *   • Flashing row highlights (realtime insert/delete)
 *
 * What the PARENT provides (per-entity differences only):
 *   • columns           – TanStack ColumnDef[]
 *   • data              – already-filtered rows (parent applies status/custom filters)
 *   • flashing          – from useRealtimeTable()
 *   • storageKey        – prefix like 'jm-jobs' → drives all localStorage keys
 *   • defaultColVisibility – columns hidden by default
 *   • filterChips       – JSX rendered as the top chip row
 *   • searchValue / onSearchChange
 *   • entityName        – for AISearchButton ("jobs", "invoices" …)
 *   • onAIResult        – AISearchButton callback
 *   • emptyMessage      – "No jobs found"
 *   • newButtonLabel    – "Add Job"
 *   • onNewClick
 *   • onRowDoubleClick  – (row: TData) => void
 *   • onExportCsv / onExportJson
 *   • cardGrid          – optional JSX shown when viewMode === 'cards'
 */

import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import TablePagination from '@mui/material/TablePagination'
import MenuItem from '@mui/material/MenuItem'
import Box from '@mui/material/Box'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import Popover from '@mui/material/Popover'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Menu from '@mui/material/Menu'

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
} from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'

import DebouncedInput from '@components/DebouncedInput'
import AISearchButton, { type AISearchAction } from '@components/AISearchButton'
import { DraggableColumnHeader } from '@/components/DraggableColumnHeader'
import { useGridPreferences } from '@/hooks/useUserPreferences'
import { multiConditionFilterFn, MULTI_FILTER_KEY } from '@/lib/columnFilter'
import tableStyles from '@core/styles/table.module.css'

// ── Module augmentation (safe to redeclare — all consumers had identical ones) ─
declare module '@tanstack/table-core' {
  interface FilterFns { fuzzy: FilterFn<unknown>; multiCondition: FilterFn<unknown> }
}

const fuzzyFilter: FilterFn<unknown> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

export type FlashRow = { id: string; color: 'insert' | 'delete' }

export interface EntityListViewProps<TData extends { id: string }> {
  // ── Data
  columns: ColumnDef<TData, any>[]
  data: TData[]
  flashing?: FlashRow[]

  // ── Identity / storage
  storageKey: string                          // e.g. 'jm-jobs'
  defaultColVisibility?: Record<string, boolean>
  /** Displayed as the card heading – e.g. 'Invoices', 'Quotes' */
  title?: string

  // ── Toolbar left side
  filterChips?: ReactNode                     // status chip pills
  searchValue: string
  onSearchChange: (v: string) => void
  searchPlaceholder?: string
  entityName: string                          // for AISearchButton
  onAIResult: (result: AISearchAction) => void

  // ── Toolbar right side actions
  newButtonLabel: string
  onNewClick: () => void
  onExportCsv: (rows: TData[]) => void
  onExportJson: (rows: TData[]) => void

  // ── Table behaviour
  emptyMessage?: string
  onRowDoubleClick?: (row: TData) => void     // opens detail/edit panel
  /** Optional row background override (e.g. vendors dim inactive rows) */
  rowBg?: (row: TData) => string | undefined

  // ── Card view
  cardGrid?: ReactNode                        // shown when viewMode === 'cards'

  // ── Panels / extra content rendered outside the Card
  children?: ReactNode
}

export default function EntityListView<TData extends { id: string }>({
  columns,
  data,
  flashing = [],
  storageKey,
  defaultColVisibility = {},
  title,
  filterChips,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  entityName,
  onAIResult,
  newButtonLabel,
  onNewClick,
  onExportCsv,
  onExportJson,
  emptyMessage = 'No records found',
  onRowDoubleClick,
  rowBg,
  cardGrid,
  children,
}: EntityListViewProps<TData>) {
  // ── Persisted preferences (DB-backed via team_member.ui_preferences) ────────
  // Single hook replaces 6 separate useLocalStorage calls.
  // • Reads from DB on mount (deduplicated fetch, shared in-memory cache)
  // • Falls back to localStorage instantly so there's no flash of defaults
  // • Debounced PATCH to backend on every change — no timing/cache issues
  // • defaultColVisibility is merged in for any NEW columns the DB hasn't seen yet
  const [gridPrefs, setGridPrefs] = useGridPreferences(storageKey, {
    columnVisibility: defaultColVisibility,
    columnOrder:      [],
    density:          'normal',
    pageSize:         25,
    showFilters:      false,
    viewMode:         'list',
  })

  const columnVisibility = gridPrefs.columnVisibility ?? defaultColVisibility
  const columnOrder      = gridPrefs.columnOrder      ?? []
  const density          = (gridPrefs.density          ?? 'normal') as 'compact' | 'normal' | 'comfortable'
  const pageSize         = gridPrefs.pageSize         ?? 25
  const showFilters      = gridPrefs.showFilters      ?? false
  const viewMode         = (gridPrefs.viewMode        ?? 'list') as 'list' | 'cards'

  const setColumnVisibility = (updater: Record<string,boolean> | ((p: Record<string,boolean>) => Record<string,boolean>)) =>
    setGridPrefs(prev => ({ ...prev, columnVisibility: typeof updater === 'function' ? updater(prev.columnVisibility ?? {}) : updater }))
  const setColumnOrder = (updater: string[] | ((p: string[]) => string[])) =>
    setGridPrefs(prev => ({ ...prev, columnOrder: typeof updater === 'function' ? updater(prev.columnOrder ?? []) : updater }))
  const setDensity = (v: 'compact' | 'normal' | 'comfortable') =>
    setGridPrefs(prev => ({ ...prev, density: v }))
  const setPageSize = (v: number) =>
    setGridPrefs(prev => ({ ...prev, pageSize: v }))
  const setShowFilters = (v: boolean) =>
    setGridPrefs(prev => ({ ...prev, showFilters: v }))
  const setViewMode = (v: 'list' | 'cards') =>
    setGridPrefs(prev => ({ ...prev, viewMode: v }))

  // When async fieldDefs arrive with new columns not yet in DB prefs,
  // merge them in so they don't default to visible.
  // (useGridPreferences handles the DB-side merge; this handles the React state side)
  const prevDefaultRef = useRef<Record<string,boolean>>({})
  useEffect(() => {
    if (!defaultColVisibility || Object.keys(defaultColVisibility).length === 0) return
    const prev = prevDefaultRef.current
    const newKeys = Object.entries(defaultColVisibility).filter(([k]) => !(k in prev))
    if (newKeys.length === 0) return
    prevDefaultRef.current = { ...prev, ...Object.fromEntries(newKeys) }
    setColumnVisibility(existing => {
      const merged = { ...existing }
      for (const [k, v] of newKeys) { if (!(k in merged)) merged[k] = v }
      return merged
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultColVisibility])

  // ── Ephemeral UI state ────────────────────────────────────────────────────
  const [columnFilters, setColumnFilters]       = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection]         = useState({})
  const [colPickerAnchor, setColPickerAnchor]   = useState<HTMLButtonElement | null>(null)
  const [exportAnchor, setExportAnchor]         = useState<HTMLButtonElement | null>(null)
  const dragColId                               = useRef<string | null>(null)

  const densityPy = density === 'compact' ? '2px' : density === 'comfortable' ? '14px' : '6px'

  // ── Two-phase column order ───────────────────────────────────────────────
  // Phase 1: seed from stored prefs, strip stale 'select'/'action' if
  //          an old build happened to save them.
  // Phase 2: useEffect (below table) resolves the COMPLETE order from
  //          table.getAllLeafColumns() — TanStack's own resolved IDs.
  const cleanedColumnOrder = useMemo(
    () => columnOrder.filter((id: string) => !['select', 'action'].includes(id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnOrder.join(',')]
  )
  const [resolvedColumnOrder, setResolvedColumnOrder] = useState<string[]>(cleanedColumnOrder)

  // ── TanStack table ────────────────────────────────────────────────────────
  const table = useReactTable<TData>({
    data,
    columns,
    filterFns: { fuzzy: fuzzyFilter, [MULTI_FILTER_KEY]: multiConditionFilterFn } as any,
    defaultColumn: { filterFn: MULTI_FILTER_KEY as any },
    state: {
      globalFilter: searchValue,
      rowSelection,
      columnVisibility,
      columnOrder: resolvedColumnOrder,  // always complete & correct after phase-2 effect
      columnFilters,
    },
    initialState: { pagination: { pageSize } },
    globalFilterFn: fuzzyFilter as any,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: onSearchChange,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: (updater) =>
      setColumnVisibility(typeof updater === 'function' ? updater(columnVisibility) : updater),
    onColumnOrderChange: (updater) => {
      const next = typeof updater === 'function' ? updater(resolvedColumnOrder) : updater
      // Persist only data columns (no select/action)
      setColumnOrder(next.filter((id: string) => !['select', 'action'].includes(id)))
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
  })

  // Phase-2 effect: once the table knows about all its columns, build the
  // definitive order (select → stored data cols → new data cols → action).
  // Runs whenever the column set changes (e.g. customFields loaded async)
  // or the user's stored preference changes. Guard prevents infinite loop.
  const leafIds = table.getAllLeafColumns().map(c => c.id).join(',')
  useEffect(() => {
    const allIds = leafIds ? leafIds.split(',') : []
    if (!allIds.length) return
    const dataIds = allIds.filter(id => !['select', 'action'].includes(id))
    const storedData = cleanedColumnOrder.filter(id => allIds.includes(id))
    const missing    = dataIds.filter(id => !storedData.includes(id))
    const full = [
      ...(allIds.includes('select') ? ['select'] : []),
      ...storedData,
      ...missing,
      ...(allIds.includes('action') ? ['action'] : []),
    ]
    if (full.join(',') !== resolvedColumnOrder.join(',')) setResolvedColumnOrder(full)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafIds, cleanedColumnOrder.join(',')])

  // ── Column sort key (safety-net sort, works alongside phase-2 effect) ───────
  const colSortKey = (colId: string): number => {
    if (colId === 'select') return -1
    if (colId === 'action') return 1_000_000
    const idx = resolvedColumnOrder.indexOf(colId)
    return idx === -1 ? 999_999 : idx
  }

  // Draggable ids = all data columns in sorted order (no select/action)
  const draggableColIds = table
    .getAllLeafColumns()
    .map(c => c.id)
    .filter(id => !['select', 'action'].includes(id))
    .sort((a, b) => colSortKey(a) - colSortKey(b))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      const cur = draggableColIds
      const oldIndex = cur.indexOf(active.id as string)
      const newIndex = cur.indexOf(over.id as string)
      if (oldIndex !== -1 && newIndex !== -1) setColumnOrder(arrayMove(cur, oldIndex, newIndex))
    }
  }

  // ── Bulk selection ────────────────────────────────────────────────────────
  const selectedRows = Object.keys(rowSelection)
    .map(id => table.getRowModel().rows.find(r => r.id === id)?.original)
    .filter(Boolean) as TData[]

  // ── Flashing helper ───────────────────────────────────────────────────────
  const flashBg = (id: string) => {
    const f = flashing.find(f => f.id === id)
    if (!f) return undefined
    return f.color === 'insert' ? 'rgba(76,175,80,0.18)' : 'rgba(244,67,54,0.18)'
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Card sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 128px)' }}>
        {/* ── Title + top pagination ──────────────────────────────────────── */}
        {title && (
          <div className='flex items-center justify-between px-6 pt-0.5 pb-0.5'>
            <div className='flex items-center gap-2'>
              <Typography variant='h5' fontWeight={600}>{title}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {table.getFilteredRowModel().rows.length} total
              </Typography>
            </div>
            <TablePagination
              component='div'
              count={table.getFilteredRowModel().rows.length}
              rowsPerPage={table.getState().pagination.pageSize}
              page={table.getState().pagination.pageIndex}
              onPageChange={(_, p) => table.setPageIndex(p)}
              onRowsPerPageChange={e => {
                const n = Number(e.target.value)
                table.setPageSize(n)
                setPageSize(n)
              }}
              sx={{ '& .MuiTablePagination-toolbar': { minHeight: 36 } }}
            />
          </div>
        )}
        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className='flex justify-between flex-col items-start md:flex-row md:items-center px-6 py-2 gap-3'>
          {/* Left: filter chips + search row */}
          <div className='flex flex-col gap-2'>
            {filterChips && (
              <div className='flex flex-wrap items-center gap-2'>
                {filterChips}
              </div>
            )}
            <div className='flex items-center gap-2'>
              <DebouncedInput
                value={searchValue ?? ''}
                onChange={v => onSearchChange(String(v))}
                placeholder={searchPlaceholder}
                className='max-sm:is-full min-w-[240px]'
              />
              <AISearchButton entityName={entityName} onResult={onAIResult} />
            </div>
          </div>

          {/* Right: icon group + export + new */}
          <div className='flex flex-wrap items-start gap-2'>
            {/* Unified icon box */}
            <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid var(--mui-palette-divider)', borderRadius: 1.5 }}>
              <Tooltip title='Show/Hide Columns'>
                <IconButton
                  size='small'
                  onClick={e => setColPickerAnchor(e.currentTarget)}
                  sx={{ px: 1, borderRadius: 0 }}
                >
                  <i className='tabler-columns-3 text-xl' />
                </IconButton>
              </Tooltip>
              <Divider orientation='vertical' flexItem />
              <Tooltip title={showFilters ? 'Hide column filters' : 'Show column filters'}>
                <IconButton
                  size='small'
                  onClick={() => setShowFilters(!showFilters)}
                  sx={{ px: 1, borderRadius: 0, bgcolor: showFilters ? 'primary.lightOpacity' : undefined }}
                >
                  <i className={`tabler-filter text-xl${showFilters ? ' text-primary' : ''}`} />
                </IconButton>
              </Tooltip>
              <Divider orientation='vertical' flexItem />
              <Tooltip title='Row Density'>
                <IconButton
                  size='small'
                  onClick={() => setDensity(density === 'compact' ? 'normal' : density === 'normal' ? 'comfortable' : 'compact')}
                  sx={{ px: 1, borderRadius: 0 }}
                >
                  <i className={`text-xl ${
                    density === 'compact' ? 'tabler-layout-rows' : density === 'comfortable' ? 'tabler-row-insert-bottom' : 'tabler-layout-list'
                  }`} />
                </IconButton>
              </Tooltip>
              <Divider orientation='vertical' flexItem />
              {/* List / Cards toggle */}
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, value) => value && setViewMode(value as 'list' | 'cards')}
                size='small'
                sx={{ border: 'none', '& .MuiToggleButton-root': { border: 'none', borderRadius: 0 } }}
              >
                <ToggleButton value='list'>
                  <i className='tabler-list text-[20px]' />
                </ToggleButton>
                <ToggleButton value='cards'>
                  <i className='tabler-layout-grid text-[20px]' />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Column picker popover */}
            <Popover
              open={Boolean(colPickerAnchor)}
              anchorEl={colPickerAnchor}
              onClose={() => setColPickerAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              slotProps={{ paper: { sx: { p: 2, minWidth: 220, maxHeight: '70vh', display: 'flex', flexDirection: 'column' } } }}
            >
              <Typography variant='caption' sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary' }}>
                Columns
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ overflowY: 'auto', flex: 1 }}>
              {table.getAllLeafColumns()
                .filter(col => !['select', 'action'].includes(col.id))
                .sort((a, b) => colSortKey(a.id) - colSortKey(b.id))
                .map((col: any) => (
                  <div
                    key={col.id}
                    draggable
                    onDragStart={() => { dragColId.current = col.id }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => {
                      if (!dragColId.current || dragColId.current === col.id) return
                      const allCols = table.getAllLeafColumns().map(c => c.id)
                      const currentOrder = columnOrder.length ? columnOrder : allCols
                      const fromIdx = currentOrder.indexOf(dragColId.current)
                      const toIdx = currentOrder.indexOf(col.id)
                      if (fromIdx === -1 || toIdx === -1) return
                      const next = [...currentOrder]
                      next.splice(fromIdx, 1)
                      next.splice(toIdx, 0, dragColId.current)
                      setColumnOrder(next)
                      dragColId.current = null
                    }}
                    style={{ display: 'flex', alignItems: 'center', cursor: 'grab', userSelect: 'none' }}
                  >
                    <i className='tabler-grip-vertical text-textDisabled text-base mr-1' style={{ cursor: 'grab', flexShrink: 0 }} />
                    <FormControlLabel
                      control={<Checkbox size='small' checked={col.getIsVisible()} onChange={col.getToggleVisibilityHandler()} />}
                      label={<Typography variant='body2'>{typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}</Typography>}
                      sx={{ flex: 1, m: 0, py: 0.25 }}
                    />
                  </div>
                ))
              }
              </Box>
            </Popover>

            {/* Export */}
            <Button
              color='secondary'
              variant='tonal'
              size='small'
              startIcon={<i className='tabler-upload' />}
              endIcon={<i className='tabler-chevron-down text-sm' />}
              onClick={e => setExportAnchor(e.currentTarget)}
              className='max-sm:is-full'
              sx={{ height: '100%' }}
            >
              Export
            </Button>
            <Menu
              anchorEl={exportAnchor}
              open={Boolean(exportAnchor)}
              onClose={() => setExportAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
              <MenuItem onClick={() => { onExportCsv(data); setExportAnchor(null) }}>
                <i className='tabler-file-type-csv mr-2 text-lg' /> Export CSV
              </MenuItem>
              <MenuItem onClick={() => { onExportJson(data); setExportAnchor(null) }}>
                <i className='tabler-braces mr-2 text-lg' /> Export JSON
              </MenuItem>
            </Menu>

            {/* Primary action */}
            <Button
              variant='contained'
              size='small'
              startIcon={<i className='tabler-plus' />}
              onClick={onNewClick}
              className='max-sm:is-full'
              sx={{ height: '100%' }}
            >
              {newButtonLabel}
            </Button>
          </div>
        </div>

        {/* ── Table / Card grid ─────────────────────────────────────────────── */}
        {viewMode === 'list' ? (
          <>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div style={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'auto' }}>
                <table className={tableStyles.table}>
                  <SortableContext items={draggableColIds} strategy={horizontalListSortingStrategy}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--mui-palette-background-paper)' }}>
                      {table.getHeaderGroups().map(hg => (
                        <tr key={hg.id}>
                          {[...hg.headers]
                            .sort((a, b) => colSortKey(a.column.id) - colSortKey(b.column.id))
                            .map(h =>
                              ['select', 'action'].includes(h.column.id)
                                ? <th key={h.id} style={{ width: h.getSize() }}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</th>
                                : <DraggableColumnHeader key={h.id} header={h} showFilters={showFilters} />
                            )}
                          {/* Spacer: absorbs remaining horizontal space so named columns stay flush-left */}
                          <th style={{ width: '100%', padding: 0, border: 'none' }} />
                        </tr>
                      ))}
                    </thead>
                  </SortableContext>
                  {table.getFilteredRowModel().rows.length === 0 ? (
                    <tbody>
                      <tr>
                        <td colSpan={table.getVisibleFlatColumns().length + 1} className='text-center py-10'>
                          {emptyMessage}
                        </td>
                      </tr>
                    </tbody>
                  ) : (
                    <tbody>
                      {table.getRowModel().rows.slice(0, table.getState().pagination.pageSize).map(row => (
                        <tr
                          key={row.id}
                          className='hover:bg-actionHover transition-colors'
                          onDoubleClick={() => onRowDoubleClick?.(row.original)}
                          style={{
                            cursor: 'default',
                            transition: 'background-color 0.6s',
                            backgroundColor:
                              flashBg(row.original.id) ??
                              (row.getIsSelected() ? 'var(--mui-palette-primary-lightOpacity)' : rowBg?.(row.original)),
                          }}
                        >
                          {[...row.getVisibleCells()]
                            .sort((a, b) => colSortKey(a.column.id) - colSortKey(b.column.id))
                            .map(cell => (
                              <td key={cell.id} style={{ paddingBlock: densityPy }}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          {/* Spacer td */}
                          <td style={{ padding: 0, border: 'none' }} />
                        </tr>
                      ))}
                    </tbody>
                  )}
                </table>
              </div>
            </DndContext>

            <TablePagination
              component='div'
              count={table.getFilteredRowModel().rows.length}
              rowsPerPage={table.getState().pagination.pageSize}
              page={table.getState().pagination.pageIndex}
              onPageChange={(_, p) => table.setPageIndex(p)}
              onRowsPerPageChange={e => {
                const n = Number(e.target.value)
                table.setPageSize(n)
                setPageSize(n)
              }}
              sx={{ '& .MuiTablePagination-toolbar': { minHeight: 28, paddingBlock: '2px' } }}
            />
          </>
        ) : (
          cardGrid ?? (
            <Box sx={{ p: 4 }}>
              <Typography variant='body2' color='text.secondary' align='center'>
                Card view not available for this entity.
              </Typography>
            </Box>
          )
        )}
      </Card>

      {/* ── Bulk selection bar ─────────────────────────────────────────────── */}
      {selectedRows.length > 0 && (
        <Paper elevation={8} sx={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1300, display: 'flex', alignItems: 'center', gap: 2,
          px: 3, py: 1.5, borderRadius: 3,
          bgcolor: 'background.paper',
          border: '1px solid var(--mui-palette-primary-main)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}>
          <Typography variant='body2' fontWeight={600} color='primary'>
            {selectedRows.length} selected
          </Typography>
          <Divider orientation='vertical' flexItem />
          <Tooltip title='Export CSV'>
            <IconButton size='small' onClick={() => onExportCsv(selectedRows)}>
              <i className='tabler-file-type-csv text-xl' />
            </IconButton>
          </Tooltip>
          <Tooltip title='Export JSON'>
            <IconButton size='small' onClick={() => onExportJson(selectedRows)}>
              <i className='tabler-braces text-xl' />
            </IconButton>
          </Tooltip>
          <Divider orientation='vertical' flexItem />
          <Tooltip title='Clear selection'>
            <IconButton size='small' onClick={() => setRowSelection({})}>
              <i className='tabler-x text-xl' />
            </IconButton>
          </Tooltip>
        </Paper>
      )}

      {/* ── Panels, drawers, etc. passed via children ──────────────────────── */}
      {children}
    </>
  )
}
