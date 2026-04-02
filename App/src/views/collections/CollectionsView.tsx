'use client'

/**
 * CollectionsView — Client-side grid for managing collections.
 * Max ~40 records, uses EntityListView in client-side mode.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { createColumnHelper } from '@tanstack/react-table'

import EntityListView from '@/components/EntityListView'
import CollectionEditDialog from './CollectionEditDialog'

interface Collection {
  id: string
  name: string
  description: string | null
  status: string
  tags: string[] | null
  filter_criteria: any
  created_by_user_id: string | null
  users?: { email: string; first_name: string; last_name: string } | null
  cre_dt: string
  cre_by: string
  mod_by: string
  mod_dt: string | null
}

const columnHelper = createColumnHelper<Collection>()

const statusColors: Record<string, 'success' | 'warning' | 'default'> = {
  active: 'success',
  draft: 'warning',
  archived: 'default',
}

const formatDate = (v: string | null) => {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Turn a saved filter_criteria into human-readable chips */
function filterSummary(fc: any): string[] {
  if (!fc || typeof fc !== 'object') return []
  const chips: string[] = []
  if (fc.state && fc.state !== 'all') chips.push(`State: ${fc.state}`)
  if (fc.gender && fc.gender !== 'all') chips.push(`Gender: ${fc.gender === 'M' ? 'Male' : 'Female'}`)
  if (fc.favorite === true) chips.push('Favorites only')
  if (fc.search?.trim()) chips.push(`Search: "${fc.search.trim()}"`)
  if (Array.isArray(fc.columnFilters)) {
    for (const cf of fc.columnFilters) {
      const conds = cf?.value?.conditions?.filter((c: any) =>
        c.op === 'isEmpty' || c.op === 'isNotEmpty' || c.value?.trim()
      ) ?? []
      for (const cond of conds) {
        const opLabel: Record<string, string> = {
          contains: 'contains', notContains: 'not contains',
          startsWith: 'starts with', endsWith: 'ends with',
          equals: 'equals', notEquals: 'not equals',
          isEmpty: 'is empty', isNotEmpty: 'is not empty',
        }
        const col = cf.id?.replace(/_/g, ' ')
        const label = cond.op === 'isEmpty' || cond.op === 'isNotEmpty'
          ? `${col} ${opLabel[cond.op] ?? cond.op}`
          : `${col} ${opLabel[cond.op] ?? cond.op} "${cond.value}"`
        chips.push(label)
      }
    }
  }
  return chips
}

export default function CollectionsView() {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [editCollection, setEditCollection] = useState<Collection | null>(null)
  const [addNew, setAddNew] = useState(false)
  const [search, setSearch] = useState('')

  const fetchCollections = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/collections')
      const data = await res.json()
      if (Array.isArray(data)) setCollections(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchCollections() }, [fetchCollections])

  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }: any) => <Checkbox checked={table.getIsAllRowsSelected()} indeterminate={table.getIsSomeRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />,
      cell: ({ row }: any) => <Checkbox checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} onClick={(e: React.MouseEvent) => e.stopPropagation()} />,
      size: 50, enableSorting: false, enableColumnFilter: false,
    },
    columnHelper.accessor('name', {
      header: 'Name', size: 220,
      cell: ({ row }) => <Typography className='font-semibold text-sm'>{row.original.name}</Typography>,
    }),
    columnHelper.accessor('description', {
      header: 'Description', size: 300,
      cell: ({ row }) => <Typography className='text-sm' noWrap>{row.original.description || '—'}</Typography>,
    }),
    columnHelper.accessor('status', {
      header: 'Status', size: 110,
      cell: ({ row }) => (
        <Chip label={row.original.status} size='small' color={statusColors[row.original.status] || 'default'} variant='tonal'
          sx={{ fontSize: 11, height: 22, textTransform: 'capitalize' }} />
      ),
    }),
    columnHelper.accessor('tags', {
      header: 'Tags', size: 200,
      cell: ({ row }) => (
        <Box className='flex gap-1 flex-wrap'>
          {(row.original.tags || []).map((t, i) => (
            <Chip key={i} label={t} size='small' variant='outlined' sx={{ fontSize: 10, height: 20 }} />
          ))}
        </Box>
      ),
    }),
    columnHelper.accessor('filter_criteria', {
      header: 'Filters', size: 320, enableSorting: false,
      cell: ({ row }) => {
        const chips = filterSummary(row.original.filter_criteria)
        if (chips.length === 0) return <Typography className='text-sm' color='text.secondary'>— no filters saved —</Typography>
        return (
          <Box className='flex flex-wrap gap-1'>
            {chips.map((c, i) => (
              <Chip key={i} label={c} size='small' color='primary' variant='tonal'
                sx={{ fontSize: 10, height: 20, maxWidth: 200 }} />
            ))}
          </Box>
        )
      },
    }),
    {
      id: 'apply',
      header: '',
      size: 130,
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }: any) => {
        const hasFilters = filterSummary(row.original.filter_criteria).length > 0
        if (!hasFilters) return null
        return (
          <Tooltip title='Open Leads with these filters applied'>
            <Button
              size='small'
              variant='tonal'
              color='primary'
              startIcon={<i className='tabler-filter-check text-sm' />}
              onClick={(e) => { e.stopPropagation(); router.push(`/leads?collection=${row.original.id}`) }}
              sx={{ fontSize: 11, py: 0.25, px: 1, whiteSpace: 'nowrap' }}
            >
              Apply in Leads
            </Button>
          </Tooltip>
        )
      },
    },
    columnHelper.accessor('cre_dt', {
      header: 'Created', size: 130,
      cell: ({ row }) => <Typography className='text-sm'>{formatDate(row.original.cre_dt)}</Typography>,
    }),
    columnHelper.accessor('cre_by', {
      header: 'Created By', size: 160,
      cell: ({ row }) => {
        const u = row.original.users
        return <Typography className='text-sm'>{u ? `${u.first_name} ${u.last_name}` : row.original.cre_by || '—'}</Typography>
      },
    }),
  ], [])

  const handleSaved = useCallback(() => {
    setEditCollection(null)
    setAddNew(false)
    fetchCollections()
  }, [fetchCollections])

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  if (loading && collections.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}><CircularProgress /></Box>
  }

  return (
    <>
      <EntityListView<Collection>
        columns={columns as any}
        data={collections}
        storageKey='fs-collections'
        title='Collections'
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder='Search collections...'
        newButtonLabel='New Collection'
        onNewClick={() => setAddNew(true)}
        onExportCsv={(rows) => {
          const csv = ['Name,Description,Status,Tags,Created'].concat(
            rows.map(r => `"${r.name}","${r.description || ''}","${r.status}","${(r.tags || []).join(';')}","${r.cre_dt}"`)
          ).join('\n')
          downloadBlob(csv, 'collections.csv', 'text/csv')
        }}
        onExportJson={(rows) => downloadBlob(JSON.stringify(rows, null, 2), 'collections.json', 'application/json')}
        emptyMessage='No collections yet. Create your first collection!'
        onRowDoubleClick={(c) => setEditCollection(c)}
        onRowEdit={(c) => setEditCollection(c)}
      />

      <CollectionEditDialog
        open={!!editCollection || addNew}
        onClose={() => { setEditCollection(null); setAddNew(false) }}
        collection={editCollection}
        onSaved={handleSaved}
      />
    </>
  )
}
