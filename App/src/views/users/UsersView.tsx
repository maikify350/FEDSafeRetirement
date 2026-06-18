'use client'

/**
 * UsersView — Client-side grid for user management.
 * Very small dataset (~1-10 users).
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import { createColumnHelper } from '@tanstack/react-table'

import EntityListView from '@/components/EntityListView'
import UserEditDialog from './UserEditDialog'
import AddUserDialog from './AddUserDialog'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  alternate_phone: string | null
  role: string
  color: string | null
  avatar_url: string | null
  bio: string | null
  bio_short: string | null
  bio_long: string | null
  last_login_at: string | null
  cre_dt: string
  cre_by: string
  mod_by: string
  mod_dt: string | null
}

const columnHelper = createColumnHelper<User>()

const roleColors: Record<string, 'error' | 'primary' | 'secondary' | 'success' | 'default'> = {
  admin: 'error',
  partner: 'secondary',
  agent: 'success',
  advisor: 'primary',
  viewer: 'default',
}

const formatDate = (v: string | null) => {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function UsersView() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [deleteError, setDeleteError]     = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      if (Array.isArray(data)) setUsers(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }: any) => <Checkbox checked={table.getIsAllRowsSelected()} indeterminate={table.getIsSomeRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />,
      cell: ({ row }: any) => <Checkbox checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} onClick={(e: React.MouseEvent) => e.stopPropagation()} />,
      size: 50, enableSorting: false, enableColumnFilter: false,
    },
    columnHelper.accessor('email', {
      header: 'User', size: 280,
      cell: ({ row }) => (
        <Box className='flex items-center gap-3'>
          <Avatar src={row.original.avatar_url || undefined} sx={{ width: 34, height: 34, fontSize: 14, bgcolor: row.original.color || 'primary.main' }}>
            {(row.original.first_name?.[0] || row.original.email?.[0] || '?').toUpperCase()}
          </Avatar>
          <Box>
            <Typography className='font-semibold text-sm'>
              {row.original.first_name} {row.original.last_name}
            </Typography>
            <Typography variant='caption' color='text.secondary'>{row.original.email}</Typography>
          </Box>
        </Box>
      ),
    }),
    columnHelper.accessor('role', {
      header: 'Role', size: 110,
      cell: ({ row }) => (
        <Chip label={row.original.role} size='small' color={roleColors[row.original.role] || 'default'} variant='tonal'
          sx={{ fontSize: 11, height: 22, textTransform: 'capitalize' }} />
      ),
    }),
    columnHelper.accessor('phone', {
      header: 'Personal Phone#', size: 150,
      cell: ({ row }) => <Typography className='text-sm'>{row.original.phone || '—'}</Typography>,
    }),
    columnHelper.accessor('alternate_phone', {
      header: 'Alternate Phone#', size: 150,
      cell: ({ row }) => <Typography className='text-sm'>{row.original.alternate_phone || '—'}</Typography>,
    }),
    columnHelper.accessor('last_login_at', {
      header: 'Last Login', size: 180,
      cell: ({ row }) => <Typography className='text-sm'>{formatDate(row.original.last_login_at)}</Typography>,
    }),
    columnHelper.accessor('cre_dt', {
      header: 'Created', size: 150,
      cell: ({ row }) => <Typography className='text-sm'>{formatDate(row.original.cre_dt)}</Typography>,
    }),
    // Delete action column
    {
      id: 'delete',
      header: '',
      size: 50,
      enableSorting: false,
      enableColumnFilter: false,
      enableHiding: false,
      enableResizing: false,
      cell: ({ row }: any) => (
        <Tooltip title='Delete user'>
          <IconButton
            size='small'
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              setDeleteError('')
              setConfirmDelete(row.original)
            }}
            sx={{
              color: '#ef4444',
              p: '4px',
              '&:hover': { color: '#b91c1c', background: '#fee2e2' },
              transition: 'all 0.15s',
            }}
          >
            <i className='tabler-trash' style={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      ),
    },
  ], [])

  const handleSaved = useCallback(() => {
    setEditUser(null)
    fetchUsers()
  }, [fetchUsers])

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/users/${confirmDelete.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok) {
        setDeleteError(result.error || 'Failed to delete user')
        return
      }
      setUsers(prev => prev.filter(u => u.id !== confirmDelete.id))
      setConfirmDelete(null)
    } catch {
      setDeleteError('Network error. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading && users.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}><CircularProgress /></Box>
  }

  return (
    <>
      <EntityListView<User>
        columns={columns as any}
        data={users}
        storageKey='fs-users'
        title='User Management'
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder='Search users...'
        newButtonLabel='User'
        onNewClick={() => setAddOpen(true)}
        onExportCsv={(rows) => {
          const csv = ['Email,First,Last,Role,Personal Phone#,Alternate Phone#,Created'].concat(
            rows.map(r => `"${r.email}","${r.first_name}","${r.last_name}","${r.role}","${r.phone || ''}","${r.alternate_phone || ''}","${r.cre_dt}"`)
          ).join('\n')
          const blob = new Blob([csv], { type: 'text/csv' })
          const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'users.csv'; a.click(); URL.revokeObjectURL(url)
        }}
        onExportJson={(rows) => {
          const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'users.json'; a.click(); URL.revokeObjectURL(url)
        }}
        emptyMessage='No users found'
        onRowDoubleClick={(u) => setEditUser(u)}
        onRowEdit={(u) => setEditUser(u)}
      />

      <AddUserDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={fetchUsers}
      />

      <UserEditDialog
        open={!!editUser}
        onClose={() => setEditUser(null)}
        user={editUser}
        onSaved={handleSaved}
        usedColors={users
          .filter(u => (u.role === 'agent' || u.role === 'partner') && u.color && u.id !== editUser?.id)
          .map(u => u.color as string)
        }
      />

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <Dialog open onClose={() => { setConfirmDelete(null); setDeleteError('') }} maxWidth='xs' fullWidth>
          <DialogTitle>Delete user?</DialogTitle>
          <DialogContent>
            {deleteError && <Alert severity='error' sx={{ mb: 2 }}>{deleteError}</Alert>}
            <Typography variant='body2'>
              This will permanently remove{' '}
              <strong>
                {[confirmDelete.first_name, confirmDelete.last_name].filter(Boolean).join(' ') || confirmDelete.email}
              </strong>{' '}
              ({confirmDelete.email}) from the portal and revoke their login access. This cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setConfirmDelete(null); setDeleteError('') }} disabled={deleting}>
              Cancel
            </Button>
            <Button
              color='error'
              variant='contained'
              onClick={handleDelete}
              disabled={deleting}
              startIcon={deleting ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-trash' />}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}
