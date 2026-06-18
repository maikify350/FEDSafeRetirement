'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import InputAdornment from '@mui/material/InputAdornment'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import CustomTextField from '@core/components/mui/TextField'
import { api } from '@/lib/api'
import type { ServiceItem } from '@shared/contracts'

type LookupItem = { id: string; value: string; label?: string; isActive?: boolean }

interface FormData {
  name: string
  description: string
  unitPrice: string
  unitId: string
  tradeTypeId: string
  categoryId: string
  sku: string
  taxable: boolean
  isActive: boolean
}

const emptyForm: FormData = {
  name: '',
  description: '',
  unitPrice: '0',
  unitId: '',
  tradeTypeId: '',
  categoryId: '',
  sku: '',
  taxable: true,
  isActive: true,
}

/**
 * CRUD editor for the service item catalog with pricing, categories, and trade types.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/configuration/ServiceItemsEditor.tsx
 */
export default function ServiceItemsEditor() {
  const qc = useQueryClient()

  // ── State ──────────────────────────────────────────────────────────────
  const [filterTradeId, setFilterTradeId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null)

  // ── Queries ────────────────────────────────────────────────────────────
  const { data: company } = useQuery<any>({
    queryKey: ['company'],
    queryFn: () => api.get('/api/company'),
  })

  const { data: serviceItems = [], isLoading } = useQuery<ServiceItem[]>({
    queryKey: ['service-items'],
    queryFn: () => api.get('/api/service-items'),
  })

  const { data: trades = [] } = useQuery<LookupItem[]>({
    queryKey: ['lookups', 'trade'],
    queryFn: () => api.get('/api/lookups/trade'),
  })

  const { data: units = [] } = useQuery<LookupItem[]>({
    queryKey: ['lookups', 'unit'],
    queryFn: () => api.get('/api/lookups/unit'),
  })

  const { data: categories = [] } = useQuery<LookupItem[]>({
    queryKey: ['lookups', 'productCategory'],
    queryFn: () => api.get('/api/lookups/productCategory'),
  })

  // Set default filter to company's trade type
  useEffect(() => {
    if (company?.tradeTypeId && !filterTradeId) {
      setFilterTradeId(company.tradeTypeId)
    }
  }, [company?.tradeTypeId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtered & searched items ──────────────────────────────────────────
  const filteredItems = useMemo(() => {
    let items = serviceItems
    if (filterTradeId) {
      items = items.filter(i => i.tradeTypeId === filterTradeId)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.description && i.description.toLowerCase().includes(q)) ||
        (i.sku && i.sku.toLowerCase().includes(q))
      )
    }
    return items
  }, [serviceItems, filterTradeId, search])

  // ── Mutations ──────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/service-items', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-items'] }); resetForm() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/api/service-items/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-items'] }); resetForm() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/service-items/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-items'] }); setDeleteTarget(null) },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/api/service-items/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-items'] }),
  })

  // ── Helpers ────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(emptyForm)
    setEditing(false)
    setEditingId(null)
  }

  const handleEdit = (item: ServiceItem) => {
    setForm({
      name: item.name,
      description: item.description || '',
      unitPrice: String(item.unitPrice ?? 0),
      unitId: item.unitId || '',
      tradeTypeId: item.tradeTypeId || '',
      categoryId: item.categoryId || '',
      sku: item.sku || '',
      taxable: item.taxable ?? true,
      isActive: item.isActive ?? true,
    })
    setEditingId(item.id)
    setEditing(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    const price = parseFloat(form.unitPrice)
    if (isNaN(price) || price < 0) return

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      unitPrice: price,
      unitId: form.unitId || undefined,
      tradeTypeId: form.tradeTypeId || undefined,
      categoryId: form.categoryId || undefined,
      sku: form.sku.trim() || undefined,
      taxable: form.taxable,
      isActive: form.isActive,
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  const tradeLabel = (id?: string | null) => {
    if (!id) return 'All Trades'
    return trades.find(t => t.id === id)?.label ?? trades.find(t => t.id === id)?.value ?? id
  }

  const unitLabel = (id?: string | null) => {
    if (!id) return ''
    return units.find(u => u.id === id)?.label ?? units.find(u => u.id === id)?.value ?? ''
  }

  const categoryLabel = (id?: string | null) => {
    if (!id) return ''
    return categories.find(c => c.id === id)?.label ?? categories.find(c => c.id === id)?.value ?? ''
  }

  // ── Render ─────────────────────────────────────────────────────────────
  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>

  // ── Edit / Create Form ─────────────────────────────────────────────────
  if (editing) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant='h6' fontWeight={600}>
            {editingId ? 'Edit Item' : 'New Item'}
          </Typography>
          <IconButton size='small' onClick={resetForm}>
            <i className='tabler-x' />
          </IconButton>
        </Box>

        <CustomTextField
          fullWidth label='Name *' value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder='e.g., Lawn Care Visit'
        />

        <CustomTextField
          fullWidth multiline minRows={2} label='Description' value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder='Describe this product or service...'
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <CustomTextField
            fullWidth label='Unit Price' type='number' value={form.unitPrice}
            onChange={e => setForm({ ...form, unitPrice: e.target.value })}
            inputProps={{ step: '0.01', min: '0' }}
            InputProps={{ startAdornment: <InputAdornment position='start'>$</InputAdornment> }}
          />
          <CustomTextField
            select fullWidth label='Unit' value={form.unitId}
            onChange={e => setForm({ ...form, unitId: e.target.value })}
          >
            <MenuItem value=''>— None —</MenuItem>
            {units.filter(u => u.isActive !== false).map(u => (
              <MenuItem key={u.id} value={u.id}>{u.label ?? u.value}</MenuItem>
            ))}
          </CustomTextField>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <CustomTextField
            select fullWidth label='Trade Type' value={form.tradeTypeId}
            onChange={e => setForm({ ...form, tradeTypeId: e.target.value })}
          >
            <MenuItem value=''>— All Trades —</MenuItem>
            {trades.filter(t => t.isActive !== false).map(t => (
              <MenuItem key={t.id} value={t.id}>{t.label ?? t.value}</MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            select fullWidth label='Category' value={form.categoryId}
            onChange={e => setForm({ ...form, categoryId: e.target.value })}
          >
            <MenuItem value=''>— None —</MenuItem>
            {categories.filter(c => c.isActive !== false).map(c => (
              <MenuItem key={c.id} value={c.id}>{c.label ?? c.value}</MenuItem>
            ))}
          </CustomTextField>
        </Box>

        <CustomTextField
          fullWidth label='SKU' value={form.sku}
          onChange={e => setForm({ ...form, sku: e.target.value })}
          placeholder='Optional product code'
        />

        <Box sx={{ display: 'flex', gap: 3 }}>
          <FormControlLabel
            control={<Checkbox checked={form.taxable} onChange={(_, v) => setForm({ ...form, taxable: v })} />}
            label='Taxable'
          />
          <FormControlLabel
            control={<Checkbox checked={form.isActive} onChange={(_, v) => setForm({ ...form, isActive: v })} />}
            label='Active'
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 1 }}>
          <Button variant='tonal' color='secondary' onClick={resetForm} disabled={isSaving}>Cancel</Button>
          <Button variant='contained' onClick={handleSave} disabled={isSaving || !form.name.trim()}>
            {isSaving ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </Button>
        </Box>
      </Box>
    )
  }

  // ── List View ──────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 2 }}>
      {/* Toolbar: Filter + Search + Add */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <CustomTextField
          select label='Trade Type' value={filterTradeId}
          onChange={e => setFilterTradeId(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value=''>All Trades</MenuItem>
          {trades.filter(t => t.isActive !== false).map(t => (
            <MenuItem key={t.id} value={t.id}>{t.label ?? t.value}</MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          placeholder='Search items...'
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <i className='tabler-search text-lg' />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position='end'>
                <IconButton size='small' onClick={() => setSearch('')}>
                  <i className='tabler-x text-sm' />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        />

        <Chip
          label='+ Add Item' color='primary' variant='outlined'
          onClick={() => {
            setForm({ ...emptyForm, tradeTypeId: filterTradeId || '' })
            setEditing(true)
          }}
          sx={{ cursor: 'pointer', fontWeight: 600 }}
        />
      </Box>

      {/* Count */}
      <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>
        {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
        {filterTradeId ? ` for ${tradeLabel(filterTradeId)}` : ''}
      </Typography>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <Alert severity='info' sx={{ mt: 2 }}>
          {search ? 'No items match your search.' : 'No service items found. Click "+ Add Item" to create one.'}
        </Alert>
      ) : (
        <List disablePadding>
          {filteredItems.map((item, idx) => (
            <ListItem
              key={item.id}
              divider={idx < filteredItems.length - 1}
              sx={{
                py: 1.5, px: 1,
                opacity: item.isActive ? 1 : 0.55,
                '&:hover': { bgcolor: 'action.hover' },
                transition: 'background-color 0.15s',
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant='body1' fontWeight={500}>{item.name}</Typography>
                    {!item.isActive && (
                      <Chip label='Inactive' size='small' color='default' sx={{ fontSize: '0.65rem', height: 18 }} />
                    )}
                    {item.sku && (
                      <Typography variant='caption' color='text.disabled' sx={{ ml: 'auto', fontFamily: 'monospace' }}>
                        {item.sku}
                      </Typography>
                    )}
                  </Box>
                }
                secondary={
                  <Box component='span' sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.25 }}>
                    <Typography variant='body2' color='primary' component='span' fontWeight={500}>
                      ${(item.unitPrice ?? 0).toFixed(2)}
                      {unitLabel(item.unitId) ? ` / ${unitLabel(item.unitId)}` : ''}
                    </Typography>
                    <Typography variant='caption' color='text.secondary' component='span'>
                      {tradeLabel(item.tradeTypeId)}
                      {categoryLabel(item.categoryId) ? ` · ${categoryLabel(item.categoryId)}` : ''}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Tooltip title={item.isActive ? 'Deactivate' : 'Activate'}>
                  <Switch
                    size='small' checked={item.isActive}
                    onChange={(_, v) => toggleMutation.mutate({ id: item.id, isActive: v })}
                  />
                </Tooltip>
                <Tooltip title='Edit'>
                  <IconButton size='small' onClick={() => handleEdit(item)}>
                    <i className='tabler-pencil text-base' />
                  </IconButton>
                </Tooltip>
                <Tooltip title='Delete'>
                  <IconButton size='small' onClick={() => setDeleteTarget(item)} color='error'>
                    <i className='tabler-trash text-base' />
                  </IconButton>
                </Tooltip>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth='xs' fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className='tabler-alert-triangle text-error text-2xl' />
          Delete Item?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            variant='contained' color='error'
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
