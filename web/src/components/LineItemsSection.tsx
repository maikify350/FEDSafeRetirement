'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import CustomTextField from '@core/components/mui/TextField'
import SectionHeader from '@/components/SectionHeader'
import { api } from '@/lib/api'
import type { ServiceItem } from '@shared/contracts'

// ── Types ────────────────────────────────────────────────────────────────────

export type LineItemEntry = {
  id?: string
  description: string
  quantity: number
  unitPrice: number
  taxable: boolean
  serviceItemId?: string | null
  unitId?: string | null
}

/**
 * Editable line items table for quotes, jobs, and invoices with add/remove/reorder and totals.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/components/LineItemsSection.tsx
 */
export const emptyLineItem = (): LineItemEntry => ({
  description: '', quantity: 1, unitPrice: 0, taxable: false, serviceItemId: null, unitId: null
})

type LookupItem = { id: string; value: string; label?: string; isActive?: boolean; order?: number }
type Company    = { tradeTypeId?: string | null }

interface LineItemsSectionProps {
  lineItems: LineItemEntry[]
  onChange: (items: LineItemEntry[]) => void
  taxRate?: number
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LineItemsSection({ lineItems, onChange, taxRate }: LineItemsSectionProps) {
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [selectedTradeId, setSelectedTradeId] = useState<string | null | undefined>(undefined)

  // Company trade type for initial filter
  const { data: company } = useQuery<Company>({
    queryKey: ['company'],
    queryFn:  () => api.get('/api/company'),
  })

  // Once company loads, initialize the trade filter to the company's trade
  useEffect(() => {
    if (company !== undefined && selectedTradeId === undefined) {
      setSelectedTradeId(company.tradeTypeId ?? null)
    }
  }, [company]) // eslint-disable-line react-hooks/exhaustive-deps

  const tradeId = selectedTradeId ?? null

  // Trades for filter dropdown
  const { data: trades = [] } = useQuery<LookupItem[]>({
    queryKey: ['lookups', 'trade'],
    queryFn:  () => api.get('/api/lookups/trade'),
  })
  const activeTrades = trades
    .filter(t => t.isActive !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  // Service items — only fetched when catalog is open
  const { data: serviceItems = [], isLoading: loadingItems } = useQuery<ServiceItem[]>({
    queryKey: ['service-items-catalog', tradeId],
    queryFn: () => {
      const params = new URLSearchParams({ isActive: 'true' })
      if (tradeId) params.set('tradeTypeId', tradeId)
      return api.get<ServiceItem[]>(`/api/service-items?${params}`)
    },
    enabled: catalogOpen,
  })

  // Units
  const { data: units = [] } = useQuery<LookupItem[]>({
    queryKey: ['lookups', 'unit'],
    queryFn:  () => api.get('/api/lookups/unit'),
  })

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectFromCatalog = (item: ServiceItem) => {
    onChange([...lineItems, {
      description:   item.name,
      quantity:      1,
      unitPrice:     item.unitPrice ?? 0,
      taxable:       item.taxable ?? false,
      serviceItemId: item.id,
      unitId:        item.unitId ?? null,
    }])
    setCatalogOpen(false)
  }

  const handleAddCustom = () => onChange([...lineItems, emptyLineItem()])

  const handleRemove = (idx: number) => onChange(lineItems.filter((_, i) => i !== idx))

  const handleUpdate = (idx: number, patch: Partial<LineItemEntry>) =>
    onChange(lineItems.map((li, i) => i === idx ? { ...li, ...patch } : li))

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)
  const taxableSubtotal = taxRate ? lineItems.filter(li => li.taxable).reduce((s, li) => s + li.quantity * li.unitPrice, 0) : 0
  const taxAmount = taxRate ? taxableSubtotal * taxRate / 100 : 0
  const total = subtotal + taxAmount

  const selectedTradeName = tradeId
    ? (activeTrades.find(t => t.id === tradeId)?.label ?? activeTrades.find(t => t.id === tradeId)?.value ?? null)
    : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <SectionHeader>Line Items</SectionHeader>
      <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>

        {/* Line items list */}
        {lineItems.map((li, idx) => (
          <Box
            key={li.id ?? `li-${idx}`}
            sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: '2px', p: '6px 8px', bgcolor: 'background.paper' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '4px' }}>
              <Typography variant='caption' color='text.secondary' fontWeight={600}>Item {idx + 1}</Typography>
              <Tooltip title='Remove item'>
                <IconButton size='small' onClick={() => handleRemove(idx)} sx={{ color: 'error.main', p: 0.25 }}>
                  <i className='tabler-x text-base' />
                </IconButton>
              </Tooltip>
            </Box>

            <CustomTextField
              fullWidth label='Description' required
              value={li.description}
              onChange={e => handleUpdate(idx, { description: e.target.value })}
              placeholder='Description of work or material...'
              sx={{ mb: '2px' }}
            />

            <Box sx={{ display: 'flex', gap: '2px', mb: '2px' }}>
              <Box sx={{ width: 80, flexShrink: 0 }}>
                <CustomTextField
                  fullWidth label='Qty' type='number' inputProps={{ min: 0, step: 0.01 }}
                  value={li.quantity}
                  onChange={e => handleUpdate(idx, { quantity: parseFloat(e.target.value) || 0 })}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <CustomTextField
                  fullWidth label='Unit Price' type='number' inputProps={{ min: 0, step: 0.01 }}
                  value={li.unitPrice}
                  onChange={e => handleUpdate(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                  InputProps={{ startAdornment: <InputAdornment position='start'>$</InputAdornment> }}
                />
              </Box>
              <Box sx={{ width: 90, flexShrink: 0 }}>
                <CustomTextField select fullWidth label='Unit'
                  value={li.unitId || ''}
                  onChange={e => handleUpdate(idx, { unitId: e.target.value || null })}
                >
                  <MenuItem value=''>—</MenuItem>
                  {units.map(u => <MenuItem key={u.id} value={u.id}>{u.value}</MenuItem>)}
                </CustomTextField>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <FormControlLabel
                control={<Checkbox size='small' checked={!!li.taxable} onChange={e => handleUpdate(idx, { taxable: e.target.checked })} />}
                label={<Typography variant='caption'>Taxable</Typography>}
                sx={{ m: 0 }}
              />
              <Typography variant='body2' fontWeight={600} color='primary'>
                ${(li.quantity * li.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Box>
        ))}

        {/* Add buttons: From Catalog | Custom Item */}
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button
            size='small' variant='outlined' color='primary'
            startIcon={<i className='tabler-package' />}
            onClick={() => setCatalogOpen(true)}
            sx={{ flex: 1 }}
          >
            From Catalog
          </Button>
          <Button
            size='small' variant='outlined' color='secondary'
            startIcon={<i className='tabler-plus' />}
            onClick={handleAddCustom}
            sx={{ flex: 1 }}
          >
            Custom Item
          </Button>
        </Box>

        {/* Subtotal / Tax / Total */}
        {lineItems.length > 0 && (
          <Box sx={{ mt: 1, borderRadius: 1, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
            <Box sx={{ px: '10px', py: '7px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.hover' }}>
              <Typography variant='body2' color='text.secondary'>Subtotal</Typography>
              <Typography variant='body2' fontWeight={600}>
                ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
            {taxRate != null && taxRate > 0 && (
              <Box sx={{ px: '10px', py: '7px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: 1, borderColor: 'divider' }}>
                <Typography variant='body2' color='text.secondary'>Tax ({taxRate}%)</Typography>
                <Typography variant='body2' fontWeight={600}>
                  ${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
            )}
            <Box sx={{ px: '10px', py: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.lightOpacity', borderTop: 1, borderColor: 'divider' }}>
              <Typography variant='body2' color='text.secondary' fontWeight={600}>Total</Typography>
              <Typography variant='body1' fontWeight={700} color='primary'>
                ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* ── Catalog Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={catalogOpen} onClose={() => setCatalogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className='tabler-package text-xl' />
            <Typography variant='h6'>Products &amp; Services Catalog</Typography>
          </Box>
          <IconButton size='small' onClick={() => setCatalogOpen(false)}>
            <i className='tabler-x' />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 2 }}>
          {/* Trade filter */}
          <CustomTextField
            select fullWidth label='Filter by Trade'
            value={tradeId || ''}
            onChange={e => setSelectedTradeId(e.target.value || null)}
            sx={{ mb: 2 }}
          >
            <MenuItem value=''>All Trades</MenuItem>
            {activeTrades.map(t => (
              <MenuItem key={t.id} value={t.id}>{t.label ?? t.value}</MenuItem>
            ))}
          </CustomTextField>

          {/* Items list */}
          {loadingItems ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color='text.secondary'>Loading...</Typography>
            </Box>
          ) : serviceItems.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <i className='tabler-package-off text-4xl' style={{ color: 'var(--mui-palette-text-disabled)' }} />
              <Typography color='text.secondary' sx={{ mt: 1 }}>
                No items found{selectedTradeName ? ` for ${selectedTradeName}` : ''}
              </Typography>
            </Box>
          ) : (
            serviceItems.map(item => (
              <Box
                key={item.id}
                onClick={() => handleSelectFromCatalog(item)}
                sx={{
                  p: 2, mb: 1, borderRadius: 1, border: 1, borderColor: 'divider',
                  cursor: 'pointer', bgcolor: 'background.paper',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.lightOpacity' },
                  transition: 'all 0.15s',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1, mr: 2 }}>
                    <Typography fontWeight={600}>{item.name}</Typography>
                    {item.description && (
                      <Typography variant='body2' color='text.secondary' sx={{ mt: 0.25 }}>
                        {item.description}
                      </Typography>
                    )}
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                      ${(item.unitPrice ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} / {item.unit || 'each'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    {item.tradeType && (
                      <Chip label={item.tradeType} size='small' color='primary' variant='tonal' />
                    )}
                    {item.classification && (
                      <Chip label={item.classification} size='small' variant='outlined' />
                    )}
                  </Box>
                </Box>
              </Box>
            ))
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
