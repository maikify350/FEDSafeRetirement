'use client'

/**
 * RatesEmployeeView — Client-side grid for FEGLI employee rate reference data.
 * All users can view. Only admin users see the edit pencil and +Add button.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { createColumnHelper } from '@tanstack/react-table'

import EntityListView from '@/components/EntityListView'
import RatesEmployeeEditDialog from './RatesEmployeeEditDialog'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface FegliRateEmployee {
  id: string
  age_min: number
  age_max: number
  basic: number
  opt_a: number
  opt_b: number
  opt_c: number
  notes: string
  cre_by: string
  cre_dt: string
  mod_by: string
  mod_dt: string | null
}

const columnHelper = createColumnHelper<FegliRateEmployee>()

const formatDate = (v: string | null) => {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatRate = (v: number) => {
  if (v === 0) return '—'
  return `$${v.toFixed(3)}`
}

/** Open a print-friendly PDF-style window with a formatted table */
function printRatesTable(rows: FegliRateEmployee[]) {
  const html = `<!DOCTYPE html>
<html><head><title>FEGLI Rates – Employees</title>
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
  <h1>FEGLI Rates – Employees</h1>
  <table>
    <thead><tr>
      <th>Age Min</th><th>Age Max</th>
      <th class="right">Basic</th><th class="right">Option-A</th><th class="right">Option-B</th><th class="right">Option-C</th>
    </tr></thead>
    <tbody>
      ${rows.map(r => `<tr>
        <td>${r.age_min}</td><td>${r.age_max}</td>
        <td class="right">${r.basic === 0 ? '—' : '$' + r.basic.toFixed(3)}</td>
        <td class="right">${r.opt_a === 0 ? '—' : '$' + r.opt_a.toFixed(3)}</td>
        <td class="right">${r.opt_b === 0 ? '—' : '$' + r.opt_b.toFixed(3)}</td>
        <td class="right">${r.opt_c === 0 ? '—' : '$' + r.opt_c.toFixed(3)}</td>
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

export default function RatesEmployeeView() {
  const { isAdmin } = useCurrentUser()
  const [rates, setRates] = useState<FegliRateEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [editRate, setEditRate] = useState<FegliRateEmployee | null>(null)
  const [addNew, setAddNew] = useState(false)
  const [search, setSearch] = useState('')

  const fetchRates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/fegli-rates-employee?includeAudit=true')
      const data = await res.json()
      if (Array.isArray(data)) setRates(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchRates() }, [fetchRates])

  const columns = useMemo(() => [
    columnHelper.accessor('age_min', {
      header: 'Age Min', size: 100,
      cell: ({ row }) => <Typography className='font-semibold text-sm' sx={{ textAlign: 'center' }}>{row.original.age_min}</Typography>,
    }),
    columnHelper.accessor('age_max', {
      header: 'Age Max', size: 100,
      cell: ({ row }) => <Typography className='font-semibold text-sm' sx={{ textAlign: 'center' }}>{row.original.age_max}</Typography>,
    }),
    columnHelper.accessor('basic', {
      header: 'Basic', size: 120,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'right' }}>{formatRate(row.original.basic)}</Typography>,
    }),
    columnHelper.accessor('opt_a', {
      header: 'Option-A', size: 120,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'right' }}>{formatRate(row.original.opt_a)}</Typography>,
    }),
    columnHelper.accessor('opt_b', {
      header: 'Option-B', size: 120,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'right' }}>{formatRate(row.original.opt_b)}</Typography>,
    }),
    columnHelper.accessor('opt_c', {
      header: 'Option-C', size: 120,
      cell: ({ row }) => <Typography className='text-sm' sx={{ textAlign: 'right' }}>{formatRate(row.original.opt_c)}</Typography>,
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
    setEditRate(null)
    setAddNew(false)
    fetchRates()
  }, [fetchRates])

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  if (loading && rates.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}><CircularProgress /></Box>
  }

  return (
    <>
      <EntityListView<FegliRateEmployee>
        columns={columns as any}
        data={rates}
        storageKey='fs-fegli-rates-employee'
        defaultColVisibility={defaultColVisibility}
        title='FEGLI Rates – Employees'
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder='Search rates...'
        newButtonLabel='Add Rate'
        onNewClick={() => isAdmin && setAddNew(true)}
        onExportCsv={(rows) => {
          const csv = ['AgeMin,AgeMax,Basic,OptA,OptB,OptC'].concat(
            rows.map(r => `${r.age_min},${r.age_max},${r.basic},${r.opt_a},${r.opt_b},${r.opt_c}`)
          ).join('\n')
          downloadBlob(csv, 'fegli_rates_employee.csv', 'text/csv')
        }}
        onExportJson={(rows) => downloadBlob(JSON.stringify(rows, null, 2), 'fegli_rates_employee.json', 'application/json')}
        emptyMessage='No FEGLI employee rates found.'
        onRowDoubleClick={isAdmin ? (r) => setEditRate(r) : undefined}
        onRowEdit={isAdmin ? (r) => setEditRate(r) : undefined}
        onPrint={(rows) => printRatesTable(rows)}
      />

      <RatesEmployeeEditDialog
        open={!!editRate || addNew}
        onClose={() => { setEditRate(null); setAddNew(false) }}
        rate={editRate}
        onSaved={handleSaved}
        isAdmin={isAdmin}
      />
    </>
  )
}
