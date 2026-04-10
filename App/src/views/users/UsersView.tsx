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
import { createColumnHelper } from '@tanstack/react-table'

import EntityListView from '@/components/EntityListView'
import UserEditDialog from './UserEditDialog'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: string
  color: string | null
  avatar_url: string | null
  last_login_at: string | null
  cre_dt: string
  cre_by: string
  mod_by: string
  mod_dt: string | null
}

const columnHelper = createColumnHelper<User>()

const roleColors: Record<string, 'error' | 'primary' | 'default'> = {
  admin: 'error',
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
  const [search, setSearch] = useState('')

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
          <Avatar src={row.original.avatar_url || undefined} sx={{ width: 34, height: 34, fontSize: 14, bgcolor: 'primary.main' }}>
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
      header: 'Phone', size: 150,
      cell: ({ row }) => <Typography className='text-sm'>{row.original.phone || '—'}</Typography>,
    }),
    columnHelper.accessor('last_login_at', {
      header: 'Last Login', size: 180,
      cell: ({ row }) => <Typography className='text-sm'>{formatDate(row.original.last_login_at)}</Typography>,
    }),
    columnHelper.accessor('cre_dt', {
      header: 'Created', size: 150,
      cell: ({ row }) => <Typography className='text-sm'>{formatDate(row.original.cre_dt)}</Typography>,
    }),
  ], [])

  const handleSaved = useCallback(() => {
    setEditUser(null)
    fetchUsers()
  }, [fetchUsers])

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
        newButtonLabel='Invite User'
        onNewClick={() => { /* TODO: invite flow */ }}
        onExportCsv={(rows) => {
          const csv = ['Email,First,Last,Role,Phone,Created'].concat(
            rows.map(r => `"${r.email}","${r.first_name}","${r.last_name}","${r.role}","${r.phone || ''}","${r.cre_dt}"`)
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

      <UserEditDialog
        open={!!editUser}
        onClose={() => setEditUser(null)}
        user={editUser}
        onSaved={handleSaved}
        usedColors={users
          .filter(u => u.role === 'agent' && u.color && u.id !== editUser?.id)
          .map(u => u.color as string)
        }
      />
    </>
  )
}
