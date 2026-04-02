'use client'

/**
 * EntityListView — shared data-grid shell used by every entity list page.
 *
 * Adapted from JobMater for FEDSafe Retirement.
 * Stripped: custom fields, AI search.
 * Added: server-side pagination mode for large datasets (472K+ leads).
 *
 * What lives HERE (write once, fix everywhere):
 *   • Toolbar: col-picker, filter-row toggle, density cycle, list/cards toggle,
 *              export dropdown, primary action button
 *   • Column-picker popover (with drag-to-reorder)
 *   • TanStack table + DnD column reordering
 *   • Top + Bottom TablePagination
 *   • Bulk-selection floating bar
 *
 * What the PARENT provides (per-entity differences only):
 *   • columns           – TanStack ColumnDef[]
 *   • data              – rows for current page
 *   • totalRows         – total matching rows (for server-side pagination)
 *   • storageKey        – prefix like 'fs-leads' → drives all preference keys
 *   • defaultColVisibility – columns hidden by default
 *   • filterChips       – JSX rendered as the top chip row
 *   • searchValue / onSearchChange
 *   • emptyMessage      – "No leads found"
 *   • newButtonLabel    – "Add Lead"
 *   • onNewClick
 *   • onRowDoubleClick  – (row: TData) => void
 *   • onExportCsv / onExportJson
 *   • onPageChange      – for server-side pagination
 *   • onSortChange      – for server-side sorting
 *   • onColumnFilterChange – for server-side column filtering
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
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
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
  type SortingState,
  type FilterFn,
} from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'

import DebouncedInput from '@/components/DebouncedInput'
import { DraggableColumnHeader } from '@/components/DraggableColumnHeader'
import { useGridPreferences } from '@/hooks/useGridPreferences'
import { multiConditionFilterFn, MULTI_FILTER_KEY } from '@/lib/columnFilter'
import ExportFieldPickerDialog, { type ExportField } from '@/components/ExportFieldPickerDialog'
import tableStyles from '@core/styles/table.module.css'

// ── Module augmentation ─────────────────────────────────────────────────────
declare module '@tanstack/table-core' {
  interface FilterFns { fuzzy: FilterFn<unknown>; multiCondition: FilterFn<unknown> }
}

const fuzzyFilter: FilterFn<unknown> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

export interface EntityListViewProps<TData extends { id: string }> {
  // ── Data
  columns: ColumnDef<TData, any>[]
  data: TData[]

  // ── Server-side pagination
  totalRows?: number                            // if provided, enables server-side pagination
  currentPage?: number
  isLoading?: boolean                           // if provided, shows a loading overlay
  defaultSorting?: SortingState                 // initial sort state (shows arrow on first load)
  onPageChange?: (page: number, pageSize: number) => void
  onSortChange?: (sorting: SortingState) => void
  onColumnFilterChange?: (filters: ColumnFiltersState) => void

  // ── Identity / storage
  storageKey: string
  defaultColVisibility?: Record<string, boolean>
  title?: string

  // ── Toolbar left side
  filterChips?: ReactNode
  searchValue: string
  onSearchChange: (v: string) => void
  searchPlaceholder?: string

  // ── Toolbar right side actions
  newButtonLabel: string
  onNewClick: () => void
  onExportCsv: (rows: TData[]) => void
  onExportJson: (rows: TData[]) => void

  // ── Table behaviour
  emptyMessage?: string
  onRowDoubleClick?: (row: TData) => void
  rowBg?: (row: TData) => string | undefined

  // ── Row actions
  onRowEdit?: (row: TData) => void

  // ── Bulk actions (shown in floating selection bar)
  bulkActions?: { label: string; icon: string; onClick: (rows: TData[]) => void }[]

  // ── Export field configuration
  exportFields?: ExportField[]    // if provided, shows field picker dialog for exports

  // ── Extra content
  children?: ReactNode
}

export default function EntityListView<TData extends { id: string }>({
  columns,
  data,
  totalRows,
  currentPage = 0,
  isLoading = false,
  defaultSorting = [],
  onPageChange,
  onSortChange,
  onColumnFilterChange,
  storageKey,
  defaultColVisibility = {},
  title,
  filterChips,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  newButtonLabel,
  onNewClick,
  onExportCsv,
  onExportJson,
  emptyMessage = 'No records found',
  onRowDoubleClick,
  onRowEdit,
  rowBg,
  bulkActions,
  exportFields,
  children,
}: EntityListViewProps<TData>) {
  const isServerSide = totalRows !== undefined

  // ── Auto-append actions column when onRowEdit is provided ─────────────
  const columnsWithActions = useMemo(() => {
    if (!onRowEdit) return columns
    const hasAction = columns.some((c: any) => c.id === 'action')
    if (hasAction) return columns
    return [
      ...columns,
      {
        id: 'action',
        header: '',
        size: 60,
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
        cell: ({ row }: any) => (
          <Tooltip title='Edit'>
            <IconButton
              size='small'
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                onRowEdit(row.original)
              }}
              sx={{ color: 'primary.main', p: '2px' }}
            >
              <i className='tabler-pencil text-lg' />
            </IconButton>
          </Tooltip>
        ),
      } as ColumnDef<TData, any>,
    ]
  }, [columns, onRowEdit])

  // ── Persisted preferences ──────────────────────────────────────────────────
  const [gridPrefs, setGridPrefs] = useGridPreferences(storageKey, {
    columnVisibility: defaultColVisibility,
    columnOrder:      [],
    sorting:          defaultSorting,
    density:          'compact',
    pageSize:         25,
    showFilters:      false,
    viewMode:         'list',
  })

  const columnVisibility = gridPrefs.columnVisibility ?? defaultColVisibility
  const columnOrder      = gridPrefs.columnOrder      ?? []
  const columnSizing     = gridPrefs.columnSizing     ?? {}
  const persistedSorting = gridPrefs.sorting          ?? defaultSorting
  const density          = (gridPrefs.density          ?? 'normal') as 'compact' | 'normal' | 'comfortable'
  const pageSize         = gridPrefs.pageSize         ?? 25
  const showFilters      = gridPrefs.showFilters      ?? false

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
  const setColumnSizing = (updater: Record<string,number> | ((p: Record<string,number>) => Record<string,number>)) =>
    setGridPrefs(prev => ({ ...prev, columnSizing: typeof updater === 'function' ? updater(prev.columnSizing ?? {}) : updater }))
  const persistSorting = (s: SortingState) =>
    setGridPrefs(prev => ({ ...prev, sorting: s }))

  // Merge new default columns
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
  const [sorting, setSorting]                   = useState<SortingState>(persistedSorting)
  const [rowSelection, setRowSelection]         = useState({})
  const [colPickerAnchor, setColPickerAnchor]   = useState<HTMLButtonElement | null>(null)
  const [exportAnchor, setExportAnchor]         = useState<HTMLButtonElement | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportDialogRows, setExportDialogRows] = useState<TData[]>([])
  const dragColId                               = useRef<string | null>(null)

  const densityPy = density === 'compact' ? '1px' : '4px'

  // ── Two-phase column order ────────────────────────────────────────────────
  const cleanedColumnOrder = useMemo(
    () => columnOrder.filter((id: string) => !['select', 'favorite', 'action'].includes(id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnOrder.join(',')]
  )
  const [resolvedColumnOrder, setResolvedColumnOrder] = useState<string[]>(cleanedColumnOrder)

  // ── TanStack table ────────────────────────────────────────────────────────
  const table = useReactTable<TData>({
    data,
    columns: columnsWithActions,
    filterFns: { fuzzy: fuzzyFilter, [MULTI_FILTER_KEY]: multiConditionFilterFn } as any,
    defaultColumn: { filterFn: MULTI_FILTER_KEY as any },
    state: {
      globalFilter: searchValue,
      rowSelection,
      columnVisibility,
      columnOrder: resolvedColumnOrder,
      columnSizing,
      columnFilters,
      sorting,
      pagination: { pageIndex: currentPage, pageSize },
    },
    manualPagination: isServerSide,
    manualSorting: isServerSide,
    manualFiltering: isServerSide,
    enableSortingRemoval: false,
    initialState: { pagination: { pageSize } },
    globalFilterFn: fuzzyFilter as any,
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onColumnSizingChange: (updater) =>
      setColumnSizing(typeof updater === 'function' ? updater(columnSizing) : updater),
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: isServerSide ? undefined : onSearchChange,
    onColumnFiltersChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnFilters) : updater
      setColumnFilters(next)
      if (isServerSide && onColumnFilterChange) onColumnFilterChange(next)
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      setSorting(next)
      persistSorting(next)
      if (isServerSide && onSortChange) onSortChange(next)
    },
    onColumnVisibilityChange: (updater) =>
      setColumnVisibility(typeof updater === 'function' ? updater(columnVisibility) : updater),
    onColumnOrderChange: (updater) => {
      const next = typeof updater === 'function' ? updater(resolvedColumnOrder) : updater
      setColumnOrder(next.filter((id: string) => !['select', 'action'].includes(id)))
    },
    getCoreRowModel: getCoreRowModel(),
    ...(isServerSide ? {} : {
      getFilteredRowModel: getFilteredRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getFacetedRowModel: getFacetedRowModel(),
      getFacetedUniqueValues: getFacetedUniqueValues(),
      getFacetedMinMaxValues: getFacetedMinMaxValues(),
    }),
  })

  // Phase-2 effect: resolve column order
  const leafIds = table.getAllLeafColumns().map(c => c.id).join(',')
  useEffect(() => {
    const allIds = leafIds ? leafIds.split(',') : []
    if (!allIds.length) return
    const dataIds = allIds.filter(id => !['select', 'favorite', 'action'].includes(id))
    const storedData = cleanedColumnOrder.filter(id => allIds.includes(id))
    const missing    = dataIds.filter(id => !storedData.includes(id))
    const full = [
      ...(allIds.includes('select') ? ['select'] : []),
      ...(allIds.includes('favorite') ? ['favorite'] : []),
      ...storedData,
      ...missing,
      ...(allIds.includes('action') ? ['action'] : []),
    ]
    if (full.join(',') !== resolvedColumnOrder.join(',')) setResolvedColumnOrder(full)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafIds, cleanedColumnOrder.join(',')])

  // ── Column sort key ───────────────────────────────────────────────────────
  const colSortKey = (colId: string): number => {
    if (colId === 'select') return -2
    if (colId === 'favorite') return -1
    if (colId === 'action') return 1_000_000
    const idx = resolvedColumnOrder.indexOf(colId)
    return idx === -1 ? 999_999 : idx
  }

  const draggableColIds = table
    .getAllLeafColumns()
    .map(c => c.id)
    .filter(id => !['select', 'favorite', 'action'].includes(id))
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

  // ── Row counts ────────────────────────────────────────────────────────────
  const displayedRowCount = isServerSide ? (totalRows ?? 0) : table.getFilteredRowModel().rows.length
  const displayedRows = isServerSide ? table.getCoreRowModel().rows : table.getRowModel().rows

  // ── Bulk selection ────────────────────────────────────────────────────────
  const selectedRows = Object.keys(rowSelection)
    .map(id => table.getRowModel().rows.find(r => r.id === id)?.original)
    .filter(Boolean) as TData[]

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
                {displayedRowCount.toLocaleString()} total
              </Typography>
            </div>
            <TablePagination
              component='div'
              count={displayedRowCount}
              rowsPerPage={pageSize}
              page={isServerSide ? currentPage : table.getState().pagination.pageIndex}
              onPageChange={(_, p) => {
                if (isServerSide && onPageChange) {
                  onPageChange(p, pageSize)
                } else {
                  table.setPageIndex(p)
                }
              }}
              onRowsPerPageChange={e => {
                const n = Number(e.target.value)
                if (isServerSide && onPageChange) {
                  setPageSize(n)
                  onPageChange(0, n)
                } else {
                  table.setPageSize(n)
                  setPageSize(n)
                }
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
            </div>
          </div>

          {/* Right: icon group + export + new */}
          <div className='flex flex-wrap items-start gap-2' style={{ flex: 1, justifyContent: 'flex-end', paddingRight: 10 }}>
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
                  onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
                  sx={{ px: 1, borderRadius: 0 }}
                >
                  <i className={`text-xl ${density === 'compact' ? 'tabler-layout-rows' : 'tabler-layout-list'}`} />
                </IconButton>
              </Tooltip>
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
                .filter(col => !['select', 'favorite', 'action'].includes(col.id))
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
              {exportFields ? (
                <MenuItem onClick={() => {
                  setExportDialogRows(selectedRows.length > 0 ? selectedRows : data)
                  setExportDialogOpen(true)
                  setExportAnchor(null)
                }}>
                  <i className='tabler-settings-2 mr-2 text-lg' /> Export with Field Picker…
                </MenuItem>
              ) : (
                <>
                  <MenuItem onClick={() => { onExportCsv(selectedRows.length > 0 ? selectedRows : data); setExportAnchor(null) }}>
                    <i className='tabler-file-type-csv mr-2 text-lg' /> Export CSV
                  </MenuItem>
                  <MenuItem onClick={() => { onExportJson(selectedRows.length > 0 ? selectedRows : data); setExportAnchor(null) }}>
                    <i className='tabler-braces mr-2 text-lg' /> Export JSON
                  </MenuItem>
                </>
              )}
              {selectedRows.length > 0 && (
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', px: 2, py: 0.5 }}>
                  {selectedRows.length} selected rows will be exported
                </Typography>
              )}
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

        {/* ── Table ─────────────────────────────────────────────────────────── */}
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div style={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}>
            {isLoading && (
              <Box sx={{
                position: 'absolute', inset: 0, zIndex: 10,
                display: 'flex', justifyContent: 'center', alignItems: 'flex-start', pt: 10,
                backgroundColor: 'var(--mui-palette-background-paper)', opacity: 0.6,
                backdropFilter: 'blur(2px)'
              }}>
                <CircularProgress size={40} disableShrink />
              </Box>
            )}
            <table className={tableStyles.table} style={{ width: table.getCenterTotalSize() || '100%', tableLayout: 'fixed' }}>
              <SortableContext items={draggableColIds} strategy={horizontalListSortingStrategy}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--mui-palette-background-paper)' }}>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {[...hg.headers]
                        .sort((a, b) => colSortKey(a.column.id) - colSortKey(b.column.id))
                        .map(h =>
                          ['select', 'favorite', 'action'].includes(h.column.id)
                            ? <th key={h.id} style={{ width: h.getSize() }}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</th>
                            : <DraggableColumnHeader key={h.id} header={h} showFilters={showFilters} />
                        )}
                      <th style={{ width: '100%', padding: 0, border: 'none' }} />
                    </tr>
                  ))}
                </thead>
              </SortableContext>
              {displayedRows.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={table.getVisibleFlatColumns().length + 1} className='text-center py-10'>
                      {emptyMessage}
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {displayedRows.map(row => (
                    <tr
                      key={row.id}
                      className='hover:bg-actionHover transition-colors'
                      onDoubleClick={() => onRowDoubleClick?.(row.original)}
                      style={{
                        cursor: 'default',
                        transition: 'background-color 0.6s',
                        backgroundColor:
                          row.getIsSelected() ? 'var(--mui-palette-primary-lightOpacity)' : rowBg?.(row.original),
                      }}
                    >
                      {[...row.getVisibleCells()]
                        .sort((a, b) => colSortKey(a.column.id) - colSortKey(b.column.id))
                        .map(cell => (
                          <td key={cell.id} style={{ paddingBlock: densityPy }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      <td style={{ padding: 0, border: 'none' }} />
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </DndContext>

        {/* ── Bottom pagination ──────────────────────────────────────────── */}
        <TablePagination
          component='div'
          count={displayedRowCount}
          rowsPerPage={pageSize}
          page={isServerSide ? currentPage : table.getState().pagination.pageIndex}
          onPageChange={(_, p) => {
            if (isServerSide && onPageChange) {
              onPageChange(p, pageSize)
            } else {
              table.setPageIndex(p)
            }
          }}
          onRowsPerPageChange={e => {
            const n = Number(e.target.value)
            if (isServerSide && onPageChange) {
              setPageSize(n)
              onPageChange(0, n)
            } else {
              table.setPageSize(n)
              setPageSize(n)
            }
          }}
          sx={{ '& .MuiTablePagination-toolbar': { minHeight: 28, paddingBlock: '2px' } }}
        />
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
          <Tooltip title='Export selected'>
            <IconButton size='small' onClick={() => {
              if (exportFields) {
                setExportDialogRows(selectedRows)
                setExportDialogOpen(true)
              } else {
                onExportCsv(selectedRows)
              }
            }}>
              <i className='tabler-file-type-csv text-xl' />
            </IconButton>
          </Tooltip>
          <Tooltip title='Export JSON'>
            <IconButton size='small' onClick={() => onExportJson(selectedRows)}>
              <i className='tabler-braces text-xl' />
            </IconButton>
          </Tooltip>
          {bulkActions && bulkActions.length > 0 && (
            <>
              <Divider orientation='vertical' flexItem />
              {bulkActions.map((action, i) => (
                <Tooltip key={i} title={action.label}>
                  <Button
                    size='small'
                    variant='tonal'
                    color='primary'
                    startIcon={<i className={`${action.icon} text-lg`} />}
                    onClick={() => action.onClick(selectedRows)}
                    sx={{ borderRadius: 2, fontWeight: 600, fontSize: 12 }}
                  >
                    {action.label}
                  </Button>
                </Tooltip>
              ))}
            </>
          )}
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

      {/* ── Export Field Picker Dialog ──────────────────────────────────────── */}
      {exportFields && (
        <ExportFieldPickerDialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          storageKey={storageKey}
          availableFields={exportFields}
          rows={exportDialogRows}
          onExport={(rows, keys, fmt) => {
            if (fmt === 'csv') {
              // Build CSV with selected fields in order
              const headers = keys.map(k => exportFields.find(f => f.key === k)?.label || k)
              const csvRows = rows.map(r => keys.map(k => {
                const val = (r as any)[k]
                return `"${String(val ?? '').replace(/"/g, '""')}"`
              }).join(','))
              const csv = [headers.join(','), ...csvRows].join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url
              a.download = `${storageKey}_export_${new Date().toISOString().slice(0,10)}.csv`
              document.body.appendChild(a); a.click(); document.body.removeChild(a)
              URL.revokeObjectURL(url)
            } else {
              // Build JSON with only selected fields
              const filtered = rows.map(r => {
                const obj: any = {}
                keys.forEach(k => { obj[k] = (r as any)[k] })
                return obj
              })
              const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url
              a.download = `${storageKey}_export_${new Date().toISOString().slice(0,10)}.json`
              document.body.appendChild(a); a.click(); document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }
          }}
        />
      )}
    </>
  )
}
