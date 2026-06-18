'use client'

/**
 * FormsView — Grid of federal forms with Eye (preview), Pencil (edit), Trash (delete) actions.
 * All authenticated users can view. Only admins can edit / delete.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import { createColumnHelper } from '@tanstack/react-table'

import EntityListView from '@/components/EntityListView'
import FormEditDialog, { type FedForm } from './FormEditDialog'
import { useCurrentUser } from '@/hooks/useCurrentUser'

const columnHelper = createColumnHelper<FedForm>()

const formatDate = (v: string | null) => {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function FormsView() {
  const { isAdmin } = useCurrentUser()
  const [forms, setForms] = useState<FedForm[]>([])
  const [loading, setLoading] = useState(true)
  const [editForm, setEditForm] = useState<FedForm | null>(null)
  const [addNew, setAddNew] = useState(false)
  const [search, setSearch] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fetchForms = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/forms?includeAudit=true')
      const data = await res.json()
      if (Array.isArray(data)) setForms(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchForms() }, [fetchForms])

  const columns = useMemo(() => [
    columnHelper.accessor('form_id', {
      header: 'Form ID', size: 110,
      cell: ({ row }) => (
        <Typography className='text-sm font-bold' color='primary.main'>
          {row.original.form_id}
        </Typography>
      ),
    }),
    columnHelper.accessor('aka', {
      header: 'AKA', size: 130,
      cell: ({ row }) => (
        <Chip label={row.original.aka || '—'} size='small' variant='tonal' color='secondary'
          sx={{ fontSize: 11, height: 22 }} />
      ),
    }),
    columnHelper.accessor('title', {
      header: 'Title', size: 260,
      cell: ({ row }) => (
        <Typography className='text-sm'>{row.original.title}</Typography>
      ),
    }),
    columnHelper.accessor('tags', {
      header: 'Tags', size: 200,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {(row.original.tags ?? '').split(',').map(t => t.trim()).filter(Boolean).map(t => (
            <Chip key={t} label={t} size='small' variant='outlined' sx={{ fontSize: 10, height: 18 }} />
          ))}
        </Box>
      ),
    }),
    columnHelper.accessor('instruct_pages', {
      header: 'I-Pages', size: 90,
      cell: ({ row }) => (
        <Typography className='text-sm' sx={{ textAlign: 'center' }}>
          {row.original.instruct_pages || '—'}
        </Typography>
      ),
    }),
    columnHelper.accessor('fill_pages', {
      header: 'B-Pages', size: 90,
      cell: ({ row }) => (
        <Typography className='text-sm' sx={{ textAlign: 'center' }}>
          {row.original.fill_pages || '—'}
        </Typography>
      ),
    }),
    columnHelper.accessor('form_url', {
      header: 'PDF', size: 60,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          {row.original.form_url ? (
            <IconButton size='small' color='error' title='Preview PDF'
              onClick={(e) => { e.stopPropagation(); setPreviewUrl(row.original.form_url!) }}>
              <i className='tabler-file-type-pdf' style={{ fontSize: '1.2rem' }} />
            </IconButton>
          ) : <Typography className='text-sm' sx={{ color: 'text.disabled' }}>—</Typography>}
        </Box>
      ),
    }),
    columnHelper.accessor('mod_by', {
      header: 'Modified By', size: 150,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'center' }}>{row.original.mod_by || '—'}</Typography>,
    }),
    columnHelper.accessor('mod_dt', {
      header: 'Modified', size: 130,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'center' }}>{formatDate(row.original.mod_dt)}</Typography>,
    }),
  ], [])

  const defaultColVisibility = { mod_by: false }

  const handleSaved = useCallback(() => {
    setEditForm(null)
    setAddNew(false)
    fetchForms()
  }, [fetchForms])

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  if (loading && forms.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}><CircularProgress /></Box>
  }

  return (
    <>
      <EntityListView<FedForm>
        columns={columns as any}
        data={forms}
        storageKey='fs-federal-forms'
        defaultColVisibility={defaultColVisibility}
        title='Federal Forms Library'
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder='Search forms...'
        newButtonLabel='Add Form'
        onNewClick={() => isAdmin && setAddNew(true)}
        onExportCsv={(rows) => {
          const csv = ['FormID,AKA,Title,Tags,InstructPages,FillPages,SourceURL'].concat(
            rows.map(r => `"${r.form_id}","${r.aka ?? ''}","${r.title}","${r.tags ?? ''}","${r.instruct_pages ?? ''}","${r.fill_pages ?? ''}","${r.source_url ?? ''}"`)
          ).join('\n')
          downloadBlob(csv, 'federal_forms.csv', 'text/csv')
        }}
        onExportJson={(rows) => downloadBlob(JSON.stringify(rows, null, 2), 'federal_forms.json', 'application/json')}
        emptyMessage='No forms found.'
        onRowDoubleClick={isAdmin ? (r) => setEditForm(r) : undefined}
        onRowEdit={isAdmin ? (r) => setEditForm(r) : undefined}
      />

      <FormEditDialog
        open={!!editForm || addNew}
        onClose={() => { setEditForm(null); setAddNew(false) }}
        form={editForm}
        onSaved={handleSaved}
        isAdmin={isAdmin}
      />

      {/* PDF Preview Modal */}
      <Dialog open={!!previewUrl} onClose={() => setPreviewUrl(null)} maxWidth='lg' fullWidth>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant='subtitle1' fontWeight={700}>Form Preview</Typography>
          <IconButton onClick={() => setPreviewUrl(null)}><i className='tabler-x' /></IconButton>
        </Box>
        <DialogContent sx={{ p: 0, height: '80vh' }}>
          {previewUrl && (
            <iframe
              src={previewUrl}
              title='PDF Preview'
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
