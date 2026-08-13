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
import SolutionFullPageDetail from './SolutionFullPageDetail'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { api } from '@/lib/api'
import type { AISearchAction } from '@components/AISearchButton'
import type { Solution } from './SolutionFullPageDetail'

const downloadBlob = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.setAttribute('download', filename)
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}
const exportToCSV = (solutions: Solution[]) => {
  const headers = ['Topic', 'Answer', 'Visibility', 'Comments', 'Created']
  const rows = solutions.map(s => [s.topic, s.answer, s.isHidden ? 'Hidden' : 'Visible', String(s.comments?.length ?? 0), s.creAt ? new Date(s.creAt).toLocaleDateString() : ''].map(v => `"${(v ?? '').replace(/"/g, '""')}"`).join(','))
  downloadBlob([headers.join(','), ...rows].join('\n'), `solutions_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;')
}
const exportToJSON = (solutions: Solution[]) => {
  downloadBlob(JSON.stringify(solutions, null, 2), `solutions_${new Date().toISOString().split('T')[0]}.json`, 'application/json')
}

const fuzzyFilter: FilterFn<Solution> = (row, _colId, value, addMeta) => {
  const s = row.original
  const text = [s.topic, s.answer].filter(Boolean).join(' ')
  const itemRank = rankItem(text, value); addMeta({ itemRank }); return itemRank.passed
}
const columnHelper = createColumnHelper<Solution>()
interface FieldDef { fieldName: string; fieldLabel: string; showInGrid: boolean; isActive: boolean }
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

/**
 * Knowledge base / solutions list view with search and category filters.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/solutions/SolutionsView.tsx
 */
export default function SolutionsView() {
  const searchParams = useSearchParams()
  const [solutions, setSolutions] = useState<Solution[]>([])
  const { rows: rtSolutions, flashing } = useRealtimeTable<Solution>({ table: 'solution', data: solutions })
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Solution | null>(null)
  const [initialEditing, setInitialEditing] = useState(false)
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>([])

  useEffect(() => {
    fetch(`${BACKEND}/api/custom-fields/solution?includeSystem=true`)
      .then(r => r.ok ? r.json() : []).then(d => setFieldDefs(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const fetchSolutions = useCallback(async () => {
    const d = await api.get<{ data: Solution[]; total: number }>('/api/solutions?showHidden=true&limit=500')
    setSolutions(Array.isArray((d as any).data) ? (d as any).data : Array.isArray(d) ? d as any : [])
  }, [])

  useEffect(() => {
    fetchSolutions().finally(() => setLoading(false))
  }, [fetchSolutions])

  useEffect(() => {
    if (searchParams?.get('add') === '1') {
      setSelected(null); setInitialEditing(true); setDialogOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    const id = searchParams?.get('edit')
    if (id) {
      const found = rtSolutions.find((s: Solution) => s.id === id)
      if (found) { setSelected(found); setInitialEditing(true); setDialogOpen(true) }
    }
  }, [searchParams, rtSolutions])

  const handleSave = async () => {
    await fetchSolutions()
  }

  const openDetail = (s: Solution) => { setSelected(s); setInitialEditing(false); setDialogOpen(true) }
  const openEdit   = (s: Solution) => { setSelected(s); setInitialEditing(true);  setDialogOpen(true) }
  const openCreate = ()            => { setSelected(null); setInitialEditing(true);  setDialogOpen(true) }

  const filtered = useMemo(() => {
    let result = rtSolutions
    if (visibilityFilter === 'visible') result = result.filter((s: Solution) => !s.isHidden)
    else if (visibilityFilter === 'hidden') result = result.filter((s: Solution) => s.isHidden)
    if (globalFilter) {
      const q = globalFilter.toLowerCase()
      result = result.filter((s: Solution) => [s.topic, s.answer].some((v: any) => v?.toLowerCase().includes(q)))
    }
    return result
  }, [rtSolutions, visibilityFilter, globalFilter])

  const counts = useMemo(() => ({
    all:     solutions.length,
    visible: solutions.filter(s => !s.isHidden).length,
    hidden:  solutions.filter(s => s.isHidden).length,
  }), [solutions])

  const handleAIResult = useCallback((result: AISearchAction) => {
    if (result.action === 'filter') {
      if (result.filters.isHidden === 'true') setVisibilityFilter('hidden')
      else if (result.filters.isHidden === 'false') setVisibilityFilter('visible')
      else setVisibilityFilter('all')
      const terms = Object.entries(result.filters).filter(([k]) => k !== 'isHidden').map(([, v]) => v).join(' ')
      if (terms) setGlobalFilter(terms)
    } else if (result.action === 'open_edit') {
      const q = result.search.toLowerCase()
      const found = solutions.find(s => s.topic?.toLowerCase().includes(q))
      if (found) openEdit(found); else setGlobalFilter(result.search)
    }
  }, [solutions])

  const rendererMap = useMemo(() => ({
    topic: columnHelper.accessor(r => r.topic ?? '', { id: 'topic', header: 'Topic', size: 280, cell: ({ getValue }) => <Typography variant='body2' fontWeight={500} noWrap sx={{ maxWidth: 260 }}>{getValue() || '—'}</Typography> }),
    answer: columnHelper.accessor(r => r.answer ?? '', { id: 'answer', header: 'Answer', size: 340, cell: ({ getValue }) => <Typography variant='body2' color='text.secondary' noWrap sx={{ maxWidth: 320 }}>{getValue() || '—'}</Typography> }),
    isHidden: columnHelper.accessor(r => r.isHidden, { id: 'isHidden', header: 'Visibility', size: 110, cell: ({ getValue }) => getValue() ? <Chip label='Hidden' size='small' color='warning' variant='tonal' /> : <Chip label='Visible' size='small' color='success' variant='tonal' /> }),
    comments: columnHelper.accessor(r => r.comments?.length ?? 0, { id: 'comments', header: 'Comments', size: 110, cell: ({ getValue }) => <Chip label={String(getValue())} size='small' icon={<i className='tabler-message-circle text-sm' />} variant='outlined' /> }),
    category: columnHelper.accessor(r => (r as any).category ?? '', { id: 'category', header: 'Category', size: 140, cell: ({ getValue }) => getValue() ? <Chip label={getValue()} size='small' variant='tonal' /> : null }),
    tags: columnHelper.accessor(r => (r as any).tags ?? '', { id: 'tags', header: 'Tags', size: 160, cell: ({ getValue }) => <Typography variant='body2' noWrap>{getValue() || '—'}</Typography> }),
    creAt: columnHelper.accessor(r => r.creAt ?? '', { id: 'creAt', header: 'Created', size: 120, cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString() : '—' }),
    modAt: columnHelper.accessor(r => (r as any).modAt ?? '', { id: 'modAt', header: 'Last Modified', size: 130, cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString() : '—' }),
    creBy: columnHelper.accessor(r => (r as any).creBy ?? '', { id: 'creBy', header: 'Created By', size: 140, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
    modBy: columnHelper.accessor(r => (r as any).modBy ?? '', { id: 'modBy', header: 'Modified By', size: 140, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
  }), [])

  const actionCol = columnHelper.display({ id: 'actions', header: 'Actions', size: 90, enableSorting: false, cell: ({ row }) => (<Box sx={{ display: 'flex', alignItems: 'center' }}><IconButton size='small' onClick={e => { e.stopPropagation(); openEdit(row.original) }}><i className='tabler-edit text-textSecondary text-[22px]' /></IconButton><IconButton size='small' onClick={e => { e.stopPropagation(); openDetail(row.original) }}><i className='tabler-eye text-textSecondary text-[22px]' /></IconButton></Box>) })
  const selectCol = columnHelper.display({ id: 'select', header: ({ table }) => <input type='checkbox' checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} />, cell: ({ row }) => <input type='checkbox' checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} onClick={(e: React.MouseEvent) => e.stopPropagation()} /> })

  const columns = useMemo(() => {
    if (!fieldDefs.length) return [selectCol, rendererMap.topic, rendererMap.answer, rendererMap.isHidden, rendererMap.comments, rendererMap.creAt, actionCol]
    const active = fieldDefs.filter(f => f.isActive !== false)
    const cols = active.map(f => { const r = (rendererMap as any)[f.fieldName]; if (!r) return null; const c = { ...r, id: f.fieldName }; c.columnDef = { ...r.columnDef, header: f.fieldLabel }; return c }).filter(Boolean)
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
      <EntityListView<Solution>
        columns={columns as any}
        data={filtered}
        flashing={flashing as FlashRow[]}
        storageKey='jm-solutions'
        title='Solutions'
        defaultColVisibility={defaultColVisibility}
        filterChips={
          <>
            {(['all', 'visible', 'hidden'] as const).map(f => (
              <Chip key={f}
                label={`${f === 'all' ? 'All' : f === 'visible' ? 'Visible' : 'Hidden'} (${counts[f]})`}
                variant={visibilityFilter === f ? 'filled' : 'outlined'}
                color={f === 'visible' ? (visibilityFilter === f ? 'success' : 'default') : f === 'hidden' ? (visibilityFilter === f ? 'warning' : 'default') : (visibilityFilter === f ? 'primary' : 'default')}
                onClick={() => setVisibilityFilter(f)}
                size='small'
              />
            ))}
          </>
        }
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder='Search Solutions'
        entityName='solutions'
        onAIResult={handleAIResult}
        newButtonLabel='New Solution'
        onNewClick={openCreate}
        onExportCsv={exportToCSV}
        onExportJson={exportToJSON}
        emptyMessage='No solutions found'
        onRowDoubleClick={s => openDetail(s)}
      />

      <SolutionFullPageDetail
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelected(null) }}
        solution={selected}
        onSave={handleSave}
        initialEditing={initialEditing}
      />
    </>
  )
}
