'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Paper from '@mui/material/Paper'

import { api } from '@/lib/api'
import { COLORS } from '@/theme/designTokens'

interface ReportTemplate {
  id: string
  name: string
  entity: string
  formats: string[]
  runCount?: number
  lastRunAt?: string
  lastRunBy?: string | null
}

/** Minimal record shape returned by list endpoints */
interface EntityOption {
  id: string
  label: string
}

/** Map template entity key → { apiPath, labelBuilder } */
const ENTITY_CONFIG: Record<string, { apiPath: string; labelFn: (r: any) => string }> = {
  clients:          { apiPath: '/api/clients',          labelFn: r => [r.firstName, r.lastName].filter(Boolean).join(' ') || r.companyName || r.id },
  invoices:         { apiPath: '/api/invoices',         labelFn: r => r.invoiceNumber || r.id },
  quotes:           { apiPath: '/api/quotes',           labelFn: r => r.quoteNumber  || r.id },
  jobs:             { apiPath: '/api/jobs',              labelFn: r => r.jobNumber    || r.title || r.id },
  vendors:          { apiPath: '/api/vendors',           labelFn: r => r.name         || r.id },
  'purchase-orders': { apiPath: '/api/purchase-orders',  labelFn: r => r.poNumber     || r.id },
  'team-members':   { apiPath: '/api/users',             labelFn: r => r.name || r.email || r.id },
  requests:         { apiPath: '/api/requests',          labelFn: r => r.title || r.id },
  vehicles:         { apiPath: '/api/vehicles',          labelFn: r => r.name || r.vin || r.id },
}

export default function ReportsView() {
  const templateScrollRef = useRef<HTMLDivElement>(null)
  const [templates, setTemplates]           = useState<ReportTemplate[]>([])
  const [loading, setLoading]               = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [selectedFormat, setSelectedFormat]     = useState<string>('html')
  const [entityId, setEntityId]                 = useState<string>('')
  const [generating, setGenerating]             = useState(false)
  const [errorMsg, setErrorMsg]                 = useState<string | null>(null)
  const [historyOpen, setHistoryOpen]           = useState(false)

  // Entity options for the combobox
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const data = await api.get<ReportTemplate[]>('/api/reports/templates')
      
      // Sort templates to match the order of entities in the left nav menu
      const entityOrder: Record<string, number> = {
        'clients': 1,
        'requests': 2,
        'quotes': 3,
        'jobs': 4,
        'invoices': 5,
        'vendors': 6,
        'purchase-orders': 7,
        'team-members': 8,
        'vehicles': 9
      }

      data.sort((a, b) => {
        const orderA = entityOrder[a.entity] ?? 99
        const orderB = entityOrder[b.entity] ?? 99
        return orderA - orderB || a.name.localeCompare(b.name)
      })

      setTemplates(data)
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedTemplateObj = useMemo(
    () => templates.find(t => t.id === selectedTemplate),
    [templates, selectedTemplate]
  )

  // Fetch entity options when template changes
  useEffect(() => {
    if (!selectedTemplateObj) {
      setEntityOptions([])
      return
    }

    const cfg = ENTITY_CONFIG[selectedTemplateObj.entity]
    if (!cfg) {
      setEntityOptions([])
      return
    }

    let cancelled = false
    setOptionsLoading(true)

    api.get<any>(cfg.apiPath + '?limit=500')
      .then((resp: any) => {
        if (cancelled) return
        // Most list endpoints return { data: [...] } or an array directly
        const rows: any[] = Array.isArray(resp) ? resp : (resp.data ?? resp.rows ?? [])
        const options: EntityOption[] = rows.map(r => ({
          id: r.id,
          label: cfg.labelFn(r),
        }))
        // Sort alphabetically
        options.sort((a, b) => a.label.localeCompare(b.label))
        setEntityOptions(options)
      })
      .catch(err => {
        if (!cancelled) console.error('Failed to load entity options:', err)
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedTemplateObj])

  const handleGenerateReport = async () => {
    if (!selectedTemplate || !entityId) return

    setGenerating(true)
    try {
      const template = templates.find(t => t.id === selectedTemplate)
      if (!template) return

      const entityRouteMap: Record<string, string> = {
        'clients': 'client',
        'invoices': 'invoice',
        'quotes': 'quote',
        'jobs': 'job',
        'vendors': 'vendor',
        'purchase-orders': 'po',
        'team-members': 'team-member',
        'requests': 'request',
        'vehicles': 'vehicle'
      }

      const route = entityRouteMap[template.entity]
      const url = `/api/reports/${route}/${entityId}?format=html`

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}${url}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jm_token')}`
        }
      })

      if (!response.ok) {
        let detail = `Server returned ${response.status}`
        try {
          const body = await response.json()
          detail = body.error || detail
        } catch { /* ignore parse error */ }
        throw new Error(detail)
      }

      const blob = await response.blob()

      // Force HTML format in a new browser tab
      const htmlBlob = new Blob([blob], { type: 'text/html' })
      const previewUrl = window.URL.createObjectURL(htmlBlob)
      window.open(previewUrl, '_blank')
    } catch (error: any) {
      console.error('Failed to generate report:', error)
      setErrorMsg(error?.message || 'An unknown error occurred while generating the report.')
    } finally {
      setGenerating(false)
    }
  }

  // Friendly entity label for the autocomplete
  const entityLabel = selectedTemplateObj
    ? selectedTemplateObj.entity.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
    : 'Record'

  if (loading) {
    return (
      <Box className='flex justify-center items-center' sx={{ height: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Report Generator'
            sx={{ pt: '2px', pb: 2 }}
          />
          <CardContent>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Report Template</InputLabel>
                  <Select
                    value={selectedTemplate}
                    label='Report Template'
                    onChange={(e) => {
                      setSelectedTemplate(e.target.value)
                      setEntityId('')
                      setSelectedFormat('pdf')
                    }}
                  >
                    {templates.map(template => (
                      <MenuItem key={template.id} value={template.id}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {selectedTemplateObj && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Autocomplete
                      sx={{ width: '100%' }}
                      options={entityOptions}
                      loading={optionsLoading}
                      getOptionLabel={(option) => option.label}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      value={entityOptions.find(o => o.id === entityId) ?? null}
                      onChange={(_, newValue) => setEntityId(newValue?.id ?? '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={`Select ${entityLabel}`}
                          placeholder={`Search ${entityLabel.toLowerCase()}s…`}
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {optionsLoading ? <CircularProgress size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Button
                      variant='contained'
                      size='large'
                      fullWidth
                      startIcon={generating ? <CircularProgress size={20} /> : <i className='tabler-file-download' />}
                      onClick={handleGenerateReport}
                      disabled={!entityId || generating}
                    >
                      {generating ? 'Generating...' : 'Generate & Preview'}
                    </Button>
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader 
            title='Available Report Templates' 
            sx={{ pt: '2px', pb: 2 }} 
            action={
              <Tooltip title="View Report Usage History">
                <IconButton onClick={() => setHistoryOpen(true)} color="primary">
                  <i className='tabler-book' />
                </IconButton>
              </Tooltip>
            }
          />
          <CardContent>
            {/* Horizontal scrollable template cards with left/right nav */}
            <Box sx={{ position: 'relative', mb: 3 }}>
              {/* Left nav arrow */}
              <IconButton
                size='small'
                onClick={() => templateScrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' })}
                sx={{ position: 'absolute', left: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 1, bgcolor: 'background.paper', border: 1, borderColor: 'divider', boxShadow: 2, '&:hover': { bgcolor: 'action.hover' } }}
              >
                <i className='tabler-chevron-left text-lg' />
              </IconButton>

              {/* Scrollable row */}
              <Box
                ref={templateScrollRef}
                sx={{ display: 'flex', flexWrap: 'nowrap', gap: 2, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, px: 1 }}
              >
                {templates.map(template => (
                  <Card
                    key={template.id}
                    variant='outlined'
                    onClick={() => {
                      setSelectedTemplate(template.id)
                      setEntityId('')
                      setSelectedFormat('pdf')
                    }}
                    sx={{
                      minWidth: 180,
                      maxWidth: 200,
                      flexShrink: 0,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      borderColor: selectedTemplate === template.id ? 'primary.main' : 'divider',
                      borderWidth: selectedTemplate === template.id ? 2 : 1,
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 3,
                        borderColor: selectedTemplate === template.id ? 'primary.main' : 'text.disabled'
                      }
                    }}
                  >
                    <CardContent>
                      <Typography variant='h6' gutterBottom color={selectedTemplate === template.id ? 'primary.main' : 'text.primary'}>
                        {template.name}
                      </Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                        Entity: {template.entity}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {template.formats.map(format => (
                          <Chip key={format} label={format.toUpperCase()} size='small' color={selectedTemplate === template.id ? 'primary' : 'default'} variant={selectedTemplate === template.id ? 'filled' : 'outlined'} />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>

              {/* Right nav arrow */}
              <IconButton
                size='small'
                onClick={() => templateScrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}
                sx={{ position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 1, bgcolor: 'background.paper', border: 1, borderColor: 'divider', boxShadow: 2, '&:hover': { bgcolor: 'action.hover' } }}
              >
                <i className='tabler-chevron-right text-lg' />
              </IconButton>
            </Box>

            <Grid container spacing={3}>{/* template preview below */}

              {selectedTemplate && (
                <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
                  <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Empty Template Preview
                  </Typography>
                  <Paper 
                    variant='outlined' 
                    sx={{ 
                      width: '100%', 
                      height: 500, 
                      overflow: 'hidden',
                      backgroundColor: COLORS.white, // Force white background for HTML printable template previews
                      position: 'relative'
                    }}
                  >
                    <iframe
                      src={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/api/reports/raw-template/${selectedTemplate}`}
                      title='Template Preview'
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  </Paper>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* ── History Dialog ───────────────────────────────────── */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth='md' fullWidth scroll='paper'>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <i className='tabler-book' style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--mui-palette-primary-main)' }} />
            Report Execution History
            <Tooltip title="Copy History Info to Clipboard">
              <IconButton 
                size='small' 
                sx={{ ml: 2 }}
                onClick={() => {
                  const header = 'Entity\tReport Name\tCount\tLast Run\tUser\n'
                  const rows = templates.map(row => {
                    const dateStr = row.lastRunAt 
                      ? (() => {
                          const d = new Date(row.lastRunAt)
                          const pad = (n: number) => n.toString().padStart(2, '0')
                          let hours = d.getHours()
                          const ampm = hours >= 12 ? 'pm' : 'am'
                          hours = hours % 12
                          hours = hours ? hours : 12 // the hour '0' should be '12'
                          return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear().toString().slice(-2)} ${pad(hours)}:${pad(d.getMinutes())} ${ampm}`
                        })()
                      : 'Never'
                    const userStr = row.runCount && row.runCount > 0 
                      ? (row.lastRunBy ? row.lastRunBy.split('-')[0] : 'admin') 
                      : '—'
                    return `${row.entity.replace('-', ' ')}\t${row.name}\t${row.runCount || 0}\t${dateStr}\t${userStr}`
                  }).join('\n')
                  navigator.clipboard.writeText(header + rows)
                }}
              >
                <i className='tabler-copy text-textSecondary text-[20px]' />
              </IconButton>
            </Tooltip>
          </div>
          <IconButton onClick={() => setHistoryOpen(false)} size='small'>
            <i className='tabler-x' />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <TableContainer component={Paper} elevation={0} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Entity</TableCell>
                  <TableCell>Report Name</TableCell>
                  <TableCell align="right">Count</TableCell>
                  <TableCell align="right">Last Run</TableCell>
                  <TableCell align="right">User</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{row.entity.replace('-', ' ')}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">{row.runCount || 0}</TableCell>
                    <TableCell align="right">
                      {row.lastRunAt 
                        ? (() => {
                            const d = new Date(row.lastRunAt)
                            const pad = (n: number) => n.toString().padStart(2, '0')
                            let hours = d.getHours()
                            const ampm = hours >= 12 ? 'pm' : 'am'
                            hours = hours % 12
                            hours = hours ? hours : 12 // the hour '0' should be '12'
                            return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear().toString().slice(-2)} ${pad(hours)}:${pad(d.getMinutes())} ${ampm}`
                          })()
                        : 'Never'}
                    </TableCell>
                    <TableCell align="right">
                      {row.runCount && row.runCount > 0 
                        ? (row.lastRunBy ? row.lastRunBy.split('-')[0] : 'admin') 
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {templates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      No templates available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>

      {/* ── Error Dialog ───────────────────────────────────── */}
      <Dialog open={!!errorMsg} onClose={() => setErrorMsg(null)} maxWidth='sm' fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className='tabler-alert-triangle' style={{ color: 'var(--mui-palette-error-main)', fontSize: 24 }} />
          Report Generation Error
        </DialogTitle>
        <DialogContent>
          <Typography>{errorMsg}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorMsg(null)} variant='contained'>OK</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}
