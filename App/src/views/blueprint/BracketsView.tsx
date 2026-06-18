'use client'

/**
 * BracketsView — Client-side grid for IRS tax bracket reference data.
 * All users can view. Only admin users see the edit pencil and +Add button.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { createColumnHelper } from '@tanstack/react-table'

import EntityListView from '@/components/EntityListView'
import BracketEditDialog from './BracketEditDialog'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface IrsBracket {
  id: string
  filing_status: string
  floor: number
  ceiling: number
  base_tax: number
  marginal_rate: number
  notes: string
  cre_by: string
  cre_dt: string
  mod_by: string
  mod_dt: string | null
}

const columnHelper = createColumnHelper<IrsBracket>()

const statusColors: Record<string, 'primary' | 'secondary'> = {
  Single: 'primary',
  Married: 'secondary',
}

const formatDate = (v: string | null) => {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatCurrency = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const formatPercent = (v: number) => {
  if (v === 0) return '0%'
  return `${(v * 100).toFixed(1)}%`
}

/** Open a print-friendly PDF-style window with a formatted table */
function printBracketsTable(rows: IrsBracket[]) {
  const fmtCur = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const fmtPct = (v: number) => v === 0 ? '0%' : `${(v * 100).toFixed(1)}%`
  const html = `<!DOCTYPE html>
<html><head><title>IRS 2026 Brackets</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; }
  h1 { font-size: 14pt; text-align: center; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th, td { border: 1px solid #999; padding: 6px 10px; }
  th { background: #e8e8e8; font-weight: bold; text-align: left; }
  td.right, th.right { text-align: right; }
  @media print { body { margin: 20px; } }
</style></head>
<body>
  <h1>IRS 2026 Brackets</h1>
  <table>
    <thead><tr>
      <th>Filing Status</th>
      <th class="right">Income Floor</th><th class="right">Income Ceiling</th>
      <th class="right">Base Tax</th><th class="right">Marginal Rate</th>
    </tr></thead>
    <tbody>
      ${rows.map(r => `<tr>
        <td>${r.filing_status}</td>
        <td class="right">${fmtCur(r.floor)}</td>
        <td class="right">${fmtCur(r.ceiling)}</td>
        <td class="right">${fmtPct(r.base_tax)}</td>
        <td class="right">${fmtPct(r.marginal_rate)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</body></html>`
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  iframe.style.left = '-9999px'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (doc) {
    doc.open()
    doc.write(html)
    doc.close()
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
  }
  setTimeout(() => document.body.removeChild(iframe), 1000)
}

export default function BracketsView() {
  const { isAdmin } = useCurrentUser()
  const [brackets, setBrackets] = useState<IrsBracket[]>([])
  const [loading, setLoading] = useState(true)
  const [editBracket, setEditBracket] = useState<IrsBracket | null>(null)
  const [addNew, setAddNew] = useState(false)
  const [search, setSearch] = useState('')

  const fetchBrackets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/irs-brackets?includeAudit=true')
      const data = await res.json()
      if (Array.isArray(data)) setBrackets(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchBrackets() }, [fetchBrackets])

  const columns = useMemo(() => [
    columnHelper.accessor('filing_status', {
      header: 'Filing Status', size: 140,
      cell: ({ row }) => (
        <Box sx={{ textAlign: 'center' }}>
          <Chip label={row.original.filing_status} size='small'
            color={statusColors[row.original.filing_status] || 'default'} variant='tonal'
            sx={{ fontSize: 11, height: 22, textTransform: 'capitalize' }} />
        </Box>
      ),
    }),
    columnHelper.accessor('floor', {
      header: 'Income Floor', size: 140,
      cell: ({ row }) => <Typography className='text-sm font-medium' sx={{ textAlign: 'right' }}>{formatCurrency(row.original.floor)}</Typography>,
    }),
    columnHelper.accessor('ceiling', {
      header: 'Income Ceiling', size: 140,
      cell: ({ row }) => <Typography className='text-sm font-medium' sx={{ textAlign: 'right' }}>{formatCurrency(row.original.ceiling)}</Typography>,
    }),
    columnHelper.accessor('base_tax', {
      header: 'Base Tax', size: 110,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'right' }}>{formatPercent(row.original.base_tax)}</Typography>,
    }),
    columnHelper.accessor('marginal_rate', {
      header: 'Marginal Rate', size: 130,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'right' }}>{formatPercent(row.original.marginal_rate)}</Typography>,
    }),
    columnHelper.accessor('mod_by', {
      header: 'Modified By', size: 150,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'center' }}>{row.original.mod_by || '—'}</Typography>,
    }),
    columnHelper.accessor('mod_dt', {
      header: 'Modified', size: 140,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'center' }}>{formatDate(row.original.mod_dt)}</Typography>,
    }),
    columnHelper.accessor('notes', {
      header: 'Notes', size: 200,
      cell: ({ row }) => <Typography className='text-sm'>{row.original.notes || '—'}</Typography>,
    }),
    columnHelper.accessor('cre_by', {
      header: 'Created By', size: 150,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'center' }}>{row.original.cre_by || '—'}</Typography>,
    }),
    columnHelper.accessor('cre_dt', {
      header: 'Created', size: 140,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'center' }}>{formatDate(row.original.cre_dt)}</Typography>,
    }),
  ], [])

  const defaultColVisibility = { notes: false, cre_by: false, cre_dt: false }

  const handleSaved = useCallback(() => {
    setEditBracket(null)
    setAddNew(false)
    fetchBrackets()
  }, [fetchBrackets])

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  if (loading && brackets.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}><CircularProgress /></Box>
  }

  return (
    <>
      <EntityListView<IrsBracket>
        columns={columns as any}
        data={brackets}
        storageKey='fs-irs-brackets'
        defaultColVisibility={defaultColVisibility}
        title='IRS 2026 Tax Brackets'
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder='Search brackets...'
        newButtonLabel='Add Bracket'
        onNewClick={() => isAdmin && setAddNew(true)}
        onExportCsv={(rows) => {
          const csv = ['FilingStatus,Floor,Ceiling,BaseTax,MarginalRate'].concat(
            rows.map(r => `"${r.filing_status}",${r.floor},${r.ceiling},${r.base_tax},${r.marginal_rate}`)
          ).join('\n')
          downloadBlob(csv, 'irs_brackets.csv', 'text/csv')
        }}
        onExportJson={(rows) => downloadBlob(JSON.stringify(rows, null, 2), 'irs_brackets.json', 'application/json')}
        emptyMessage='No tax brackets found.'
        onRowDoubleClick={isAdmin ? (r) => setEditBracket(r) : undefined}
        onRowEdit={isAdmin ? (r) => setEditBracket(r) : undefined}
        onPrint={(rows) => printBracketsTable(rows)}
      />

      <BracketEditDialog
        open={!!editBracket || addNew}
        onClose={() => { setEditBracket(null); setAddNew(false) }}
        bracket={editBracket}
        onSaved={handleSaved}
        isAdmin={isAdmin}
      />
    </>
  )
}
