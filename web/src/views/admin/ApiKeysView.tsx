/**
 * API Keys Admin Page (Web App)
 *
 * Manage API keys for external integrations (Premium feature)
 */

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { toast } from 'react-toastify'
import { api } from '@/lib/api'
import { COLORS } from '../../theme/designTokens'


interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scope: 'read-only' | 'read-write'
  description?: string
  expiresAt?: string | null
  isActive: boolean
  creAt: string           // cre_at — project audit convention
  modAt: string           // mod_at — project audit convention
  creBy?: string | null
  modBy?: string | null
  lastUsedAt?: string | null
  requestCount: number
  revokedAt?: string | null
  revokedBy?: string | null
  revokedReason?: string | null
}

interface CreateKeyResponse {
  id: string
  apiKey: string
  keyPrefix: string
  scope: string
  name: string
  message: string
}

export default function ApiKeysView() {
  const qc = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [revealDialogOpen, setRevealDialogOpen] = useState(false)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)
  const [revealedKey, setRevealedKey] = useState<string>('')
  const [newKeyCreated, setNewKeyCreated] = useState<CreateKeyResponse | null>(null)

  // Form state for create dialog
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [scope, setScope] = useState<'read-only' | 'read-write'>('read-only')
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('')
  const [revokeReason, setRevokeReason] = useState('')

  // Fetch API keys — no subscriber headers needed (Tenant DB is single-tenant)
  const getAuthHeaders = () => ({})

  // Fetch API keys
  const { data: keys = [], isLoading, refetch } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await api.get('/api/v1/api-keys', { headers: getAuthHeaders() })
      return response.keys || []
    },
  })

  // Create key mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return await api.post<CreateKeyResponse>('/api/v1/api-keys', {
        name,
        description: description || undefined,
        scope,
        expiresInDays: expiresInDays || undefined,
      }, { headers: getAuthHeaders() })
    },
    onSuccess: (data) => {
      setNewKeyCreated(data)
      setCreateDialogOpen(false)
      setName('')
      setDescription('')
      setScope('read-only')
      setExpiresInDays('')
      toast.success('API key created successfully!')
      refetch()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create API key')
    },
  })

  // Reveal key mutation
  const revealMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post<{ apiKey: string }>(`/api/v1/api-keys/${id}/reveal`, {}, { headers: getAuthHeaders() })
    },
    onSuccess: (data) => {
      setRevealedKey(data.apiKey)
      setRevealDialogOpen(true)
    },
    onError: () => {
      toast.error('Failed to reveal API key')
    },
  })

  // Revoke key mutation
  const revokeMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await api.post(`/api/v1/api-keys/${id}/revoke`, { reason }, { headers: getAuthHeaders() })
    },
    onSuccess: () => {
      setRevokeDialogOpen(false)
      setRevokeReason('')
      toast.success('API key revoked')
      refetch()
    },
    onError: () => {
      toast.error('Failed to revoke API key')
    },
  })

  // Delete key mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/api/v1/api-keys/${id}`, { headers: getAuthHeaders() })
    },
    onSuccess: () => {
      setDeleteDialogOpen(false)
      toast.success('API key deleted')
      refetch()
    },
    onError: () => {
      toast.error('Failed to delete API key')
    },
  })

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success('API key copied to clipboard!')
  }

  const handleReveal = (key: ApiKey) => {
    setSelectedKey(key)
    revealMutation.mutate(key.id)
  }

  const handleRevoke = (key: ApiKey) => {
    setSelectedKey(key)
    setRevokeDialogOpen(true)
  }

  const handleDelete = (key: ApiKey) => {
    setSelectedKey(key)
    setDeleteDialogOpen(true)
  }

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'keyPrefix',
      headerName: 'Key Prefix',
      width: 180,
      renderCell: (params) => (
        <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{params.value}</Box>
      ),
    },
    {
      field: 'scope',
      headerName: 'Scope',
      width: 120,
      renderCell: (params) => {
        const color = params.value === 'admin' ? 'error' : params.value === 'read-write' ? 'warning' : 'success'
        return <Chip label={params.value} size='small' color={color} />
      },
    },
    {
      field: 'creAt',
      headerName: 'Created',
      width: 120,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'expiresAt',
      headerName: 'Expires',
      width: 120,
      renderCell: (params) => params.value ? new Date(params.value).toLocaleDateString() : 'Never',
    },
    {
      field: 'lastUsedAt',
      headerName: 'Last Used',
      width: 120,
      renderCell: (params) => params.value ? new Date(params.value).toLocaleDateString() : 'Never',
    },
    {
      field: 'requestCount',
      headerName: 'Requests',
      width: 100,
      type: 'number',
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => {
        if (params.row.revokedAt) return <Chip label='Revoked' size='small' color='error' />
        return params.value ? <Chip label='Active' size='small' color='success' /> : <Chip label='Inactive' size='small' color='default' />
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title='Reveal key'>
            <IconButton size='small' onClick={() => handleReveal(params.row)} disabled={!params.row.isActive}>
              <i className='tabler-eye text-base' />
            </IconButton>
          </Tooltip>
          <Tooltip title='Revoke key'>
            <IconButton size='small' onClick={() => handleRevoke(params.row)} disabled={!params.row.isActive}>
              <i className='tabler-ban text-base' />
            </IconButton>
          </Tooltip>
          <Tooltip title='Delete key'>
            <IconButton size='small' color='error' onClick={() => handleDelete(params.row)}>
              <i className='tabler-trash text-base' />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ]

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <i className='tabler-key text-3xl' style={{ color: 'var(--mui-palette-primary-main)' }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant='h4' fontWeight={700}>API Keys</Typography>
          <Typography variant='body2' color='text.secondary'>
            Manage API keys for external integrations
          </Typography>
        </Box>
        <i className='tabler-crown' style={{ color: COLORS.warningAmber, fontSize: '1.5rem' }} />
        <Button
          variant='contained'
          startIcon={<i className='tabler-plus' />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Key
        </Button>
      </Box>

      {/* API Keys Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={keys}
              columns={columns}
              autoHeight
              disableRowSelectionOnClick
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              pageSizeOptions={[5, 10, 25]}
              sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: 'action.hover',
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                },
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Create API Key</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label='Name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              placeholder='Production API Key'
            />
            <TextField
              label='Description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
              fullWidth
              placeholder='Optional description of what this key is used for'
            />
            <FormControl fullWidth>
              <InputLabel>Scope</InputLabel>
              <Select value={scope} onChange={(e) => setScope(e.target.value as any)} label='Scope'>
                <MenuItem value='read-only'>Read Only (GET requests only)</MenuItem>
                <MenuItem value='read-write'>Read &amp; Write (all requests)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label='Expires in (days)'
              type='number'
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : '')}
              fullWidth
              placeholder='Leave empty for no expiration'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            onClick={() => createMutation.mutate()}
            disabled={!name || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Key'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Show New Key Dialog */}
      <Dialog open={!!newKeyCreated} onClose={() => setNewKeyCreated(null)} maxWidth='sm' fullWidth>
        <DialogTitle>API Key Created!</DialogTitle>
        <DialogContent>
          <Alert severity='success' sx={{ mb: 2 }}>
            {newKeyCreated?.message}
          </Alert>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            Copy this key now. You can also reveal it later using the "Reveal" button.
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.875rem' }}>
            {newKeyCreated?.apiKey}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleCopyKey(newKeyCreated?.apiKey || '')} startIcon={<i className='tabler-copy' />}>
            Copy Key
          </Button>
          <Button variant='contained' onClick={() => setNewKeyCreated(null)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reveal Key Dialog */}
      <Dialog open={revealDialogOpen} onClose={() => { setRevealDialogOpen(false); setRevealedKey('') }} maxWidth='sm' fullWidth>
        <DialogTitle>Revealed API Key</DialogTitle>
        <DialogContent>
          <Alert severity='warning' sx={{ mb: 2 }}>
            This key will be hidden when you close this dialog.
          </Alert>
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.875rem' }}>
            {revealedKey}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleCopyKey(revealedKey)} startIcon={<i className='tabler-copy' />}>
            Copy Key
          </Button>
          <Button variant='contained' onClick={() => { setRevealDialogOpen(false); setRevealedKey('') }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke Key Dialog */}
      <Dialog open={revokeDialogOpen} onClose={() => setRevokeDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Revoke API Key</DialogTitle>
        <DialogContent>
          <Alert severity='error' sx={{ mb: 2 }}>
            This will permanently revoke the key: {selectedKey?.name}
          </Alert>
          <TextField
            label='Reason (optional)'
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            multiline
            rows={2}
            fullWidth
            placeholder='Why are you revoking this key?'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeDialogOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            color='error'
            onClick={() => selectedKey && revokeMutation.mutate({ id: selectedKey.id, reason: revokeReason })}
            disabled={revokeMutation.isPending}
          >
            {revokeMutation.isPending ? 'Revoking...' : 'Revoke Key'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Key Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Delete API Key</DialogTitle>
        <DialogContent>
          <Alert severity='error'>
            Permanently delete: {selectedKey?.name}? This cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            color='error'
            onClick={() => selectedKey && deleteMutation.mutate(selectedKey.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
