'use client'

/**
 * CollectionsView — Client-side grid for managing collections.
 * Max ~40 records, uses EntityListView in client-side mode.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
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

export default function CollectionsView() {
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
