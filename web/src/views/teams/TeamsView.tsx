'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'

import { createColumnHelper } from '@tanstack/react-table'
import type { FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'

import EntityListView, { type FlashRow } from '@/components/EntityListView'
import TeamFullPageDetail from './TeamFullPageDetail'
import { type TeamMember } from './TeamFullPageDetail'
import TeamCardGrid from './TeamCardGrid'
import ContactLink from '@components/ContactLink'
import CustomAvatar from '@core/components/mui/Avatar'
import AISearchButton, { type AISearchAction } from '@/components/AISearchButton'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import useLocalStorage from '@/hooks/useLocalStorage'
import { getInitials } from '@/utils/getInitials'
import { api } from '@/lib/api'

const downloadBlob = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.setAttribute('download', filename)
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}
const exportToCSV = (members: TeamMember[]) => {
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Department', 'Status']
  const rows = members.map(m => [m.firstName, m.lastName, m.email, m.phone, m.role, m.department, m.status].map(v => `"${(v ?? '').replace(/"/g, '""')}"`).join(','))
  downloadBlob([headers.join(','), ...rows].join('\n'), `team_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;')
}
const exportToJSON = (members: TeamMember[]) => {
  downloadBlob(JSON.stringify(members, null, 2), `team_${new Date().toISOString().split('T')[0]}.json`, 'application/json')
}

const fuzzyFilter: FilterFn<TeamMember> = (row, _colId, value, addMeta) => {
  const m = row.original
  const text = [m.firstName, m.lastName, m.email, m.phone, m.role, m.department, m.status].filter(Boolean).join(' ')
  const itemRank = rankItem(text, value); addMeta({ itemRank }); return itemRank.passed
}
const columnHelper = createColumnHelper<TeamMember>()
interface FieldDef { fieldName: string; fieldLabel: string; showInGrid: boolean; isActive: boolean }
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

/**
 * Team members list view with grid toggle and role/status filters.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/teams/TeamsView.tsx
 */
export default function TeamsView() {
  const searchParams = useSearchParams()
  const [members, setMembers] = useState<TeamMember[]>([])
  const { rows: rtMembers, flashing } = useRealtimeTable<TeamMember>({ table: 'team_member', data: members })
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>([])

  useEffect(() => {
    fetch(`${BACKEND}/api/custom-fields/team_member?includeSystem=true`)
      .then(r => r.ok ? r.json() : []).then(d => setFieldDefs(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  // Bulk login statuses for lock icon column
  type LoginStatus = { hasLoginAccount: boolean; isLocked: boolean; isDeactivated: boolean; failedLoginAttempts: number }
  const { data: loginStatuses = {} } = useQuery<Record<string, LoginStatus>>({
    queryKey: ['login-statuses-bulk'],
    queryFn: () => api.get('/api/users/login-statuses'),
    staleTime: 60_000,
  })

  useEffect(() => {
    api.get<TeamMember[]>('/api/users').then(d => setMembers(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { if (searchParams?.get('add') === '1') { setCreateOpen(true) } }, [searchParams])
  useEffect(() => {
    const id = searchParams?.get('edit')
    if (id) { const found = rtMembers.find((m: TeamMember) => m.id === id); if (found) { setSelectedMember(found); setDetailPanelOpen(true) } }
  }, [searchParams, rtMembers])

  const openDetail = useCallback((m: TeamMember) => { setSelectedMember(m); setDetailPanelOpen(true) }, [])
  
  const handleDetailClose = async () => {
    setDetailPanelOpen(false)
    const refreshed = await api.get<TeamMember[]>('/api/users')
    setMembers(Array.isArray(refreshed) ? refreshed : [])
  }

  const filteredMembers = useMemo(() => {
    let result = rtMembers
    if (statusFilter !== 'all') result = result.filter((m: TeamMember) => m.status === statusFilter)
    if (roleFilter !== 'all') result = result.filter((m: TeamMember) => m.role === roleFilter)
    if (globalFilter) {
      const q = globalFilter.toLowerCase()
      result = result.filter((m: TeamMember) => [m.firstName, m.lastName, m.email, m.phone, m.role, m.department].some((v: any) => v?.toLowerCase().includes(q)))
    }
    return result
  }, [rtMembers, statusFilter, roleFilter, globalFilter])

  const statusCounts = useMemo(() => ({
    all: members.length,
    ACTIVE: members.filter(m => m.status === 'ACTIVE').length,
    INACTIVE: members.filter(m => m.status === 'INACTIVE').length,
    ON_LEAVE: members.filter(m => m.status === 'ON_LEAVE').length,
  }), [members])

  const roleCounts = useMemo(() => {
    const roles = new Map<string, number>()
    roles.set('all', members.length)
    members.forEach(m => { if (m.role) roles.set(m.role, (roles.get(m.role) || 0) + 1) })
    return Object.fromEntries(roles)
  }, [members])

  const handleAIResult = useCallback((result: AISearchAction) => {
    if (result.action === 'filter' && result.filters) {
      if (result.filters.status) setStatusFilter(result.filters.status)
      if (result.filters.role) setRoleFilter(result.filters.role)
    } else if (result.action === 'open_edit' && result.search) {
      const found = filteredMembers.find((m: TeamMember) => {
        const fullName = `${m.firstName || ''} ${m.lastName || ''}`.trim()
        return fullName.toLowerCase().includes(result.search.toLowerCase())
      })
      if (found) openDetail(found)
    }
  }, [filteredMembers, openDetail])

  const handlePrint = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPrintingId(id)
    try {
      const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
      const response = await fetch(`${BACKEND}/api/reports/team-member/${id}?format=pdf`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jm_token')}` }
      })
      if (!response.ok) throw new Error('Failed to generate report')
      const blob = await response.blob()
      window.open(window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })), '_blank')
    } catch (error) {
      console.error('Print failed:', error)
      alert('Failed to generate report.')
    } finally {
      setPrintingId(null)
    }
  }

  const getAvatar = useCallback((member: TeamMember) => {
    const name = `${member.firstName || ''} ${member.lastName || ''}`.trim()
    if (member.avatar) {
      return <CustomAvatar size={34} src={member.avatar as string} alt={name} />
    }
    const color = member.gender === 'F' ? 'info' : 'success' // light blue for female, light green for male
    return <CustomAvatar size={34} skin='light' color={color as any}>{getInitials(name || '?')}</CustomAvatar>
  }, [])

  const rendererMap = useMemo(() => ({
    firstName: columnHelper.accessor(r => r.firstName ?? '', { id: 'firstName', header: 'First Name', size: 180, cell: ({ row }) => (<div className='flex items-center gap-3'>{getAvatar(row.original)}<Typography className='font-medium' color='text.primary'>{row.original.firstName || '—'}</Typography></div>) }),
    lastName: columnHelper.accessor(r => r.lastName ?? '', { id: 'lastName', header: 'Last Name', size: 180, cell: ({ getValue }) => <Typography className='font-medium' color='text.primary'>{getValue() || '—'}</Typography> }),
    email: columnHelper.accessor(r => r.email ?? '', { id: 'email', header: 'Email', size: 230, cell: ({ getValue }) => <ContactLink type='email' value={getValue()} /> }),
    phone: columnHelper.accessor(r => r.phone ?? '', { id: 'phone', header: 'Phone', size: 150, cell: ({ getValue }) => <ContactLink type='phone' value={getValue()} /> }),
    role: columnHelper.accessor(r => r.role ?? '', { id: 'role', header: 'Role', size: 150, cell: ({ getValue }) => getValue() ? <Chip label={getValue()} size='small' variant='tonal' color='primary' /> : <span className='text-textDisabled'>—</span> }),
    department: columnHelper.accessor(r => r.department ?? '', { id: 'department', header: 'Department', size: 150, cell: ({ getValue }) => getValue() || <span className='text-textDisabled'>—</span> }),
    status: columnHelper.accessor(r => r.status ?? '', { id: 'status', header: 'Status', size: 120, cell: ({ getValue }) => { const v = getValue(); if (!v) return <span className='text-textDisabled'>—</span>; const color = v === 'ACTIVE' ? 'success' : v === 'INACTIVE' ? 'default' : 'warning'; return <Chip label={v.replace('_', ' ')} size='small' color={color as any} variant='tonal' /> } }),
    gender: columnHelper.accessor(r => r.gender ?? '', { id: 'gender', header: 'Gender', size: 90, cell: ({ getValue }) => { const v = getValue(); if (!v) return <span className='text-textDisabled'>—</span>; return v === 'M' ? 'Male' : v === 'F' ? 'Female' : v } }),
    title: columnHelper.accessor(r => (r as any).title ?? '', { id: 'title', header: 'Title', size: 140, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
    employeeId: columnHelper.accessor(r => (r as any).employeeId ?? '', { id: 'employeeId', header: 'Employee ID', size: 120, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
    hireDate: columnHelper.accessor(r => (r as any).hireDate ?? '', { id: 'hireDate', header: 'Hire Date', size: 120, cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString() : '—' }),
    terminationDate: columnHelper.accessor(r => (r as any).terminationDate ?? '', { id: 'terminationDate', header: 'Termination Date', size: 140, cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString() : '—' }),
    street: columnHelper.accessor(r => (r as any).street ?? '', { id: 'street', header: 'Street', size: 180, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
    city: columnHelper.accessor(r => (r as any).city ?? '', { id: 'city', header: 'City', size: 130, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
    state: columnHelper.accessor(r => (r as any).state ?? '', { id: 'state', header: 'State', size: 80, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
    zipCode: columnHelper.accessor(r => (r as any).zipCode ?? '', { id: 'zipCode', header: 'Zip', size: 90, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
    hourlyRate: columnHelper.accessor(r => (r as any).hourlyRate ?? '', { id: 'hourlyRate', header: 'Hourly Rate', size: 110, cell: ({ getValue }) => getValue() ? `$${Number(getValue()).toFixed(2)}` : '—' }),
    overtimeRate: columnHelper.accessor(r => (r as any).overtimeRate ?? '', { id: 'overtimeRate', header: 'OT Rate', size: 100, cell: ({ getValue }) => getValue() ? `$${Number(getValue()).toFixed(2)}` : '—' }),
    emergencyContactName: columnHelper.accessor(r => (r as any).emergencyContactName ?? '', { id: 'emergencyContactName', header: 'Emergency Contact', size: 160, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
    emergencyContactPhone: columnHelper.accessor(r => (r as any).emergencyContactPhone ?? '', { id: 'emergencyContactPhone', header: 'Emergency Phone', size: 150, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
    creAt: columnHelper.accessor(r => (r as any).creAt ?? '', { id: 'creAt', header: 'Created Date', size: 130, cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString() : '—' }),
    modAt: columnHelper.accessor(r => (r as any).modAt ?? '', { id: 'modAt', header: 'Last Modified', size: 130, cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString() : '—' }),
    creBy: columnHelper.accessor(r => (r as any).creBy ?? '', { id: 'creBy', header: 'Created By', size: 140, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
    modBy: columnHelper.accessor(r => (r as any).modBy ?? '', { id: 'modBy', header: 'Modified By', size: 140, cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [getAvatar])

  const actionCol = {
    id: 'action', header: 'Actions', size: 130, enableSorting: false,
    cell: ({ row }: any) => {
      const lockStatus = loginStatuses[row.original.id]
      return (
        <div className='flex items-center'>
          <IconButton size='small' onClick={e => { e.stopPropagation(); openDetail(row.original) }}>
            <i className='tabler-edit text-textSecondary text-[22px]' />
          </IconButton>
          <IconButton size='small' onClick={e => handlePrint(row.original.id, e)} disabled={printingId === row.original.id}>
            {printingId === row.original.id ? <CircularProgress size={22} color='inherit' /> : <i className='tabler-printer text-textSecondary text-[22px]' />}
          </IconButton>
          {lockStatus?.isDeactivated && (<Tooltip title='Account deactivated'><i className='tabler-lock text-error text-[18px]' /></Tooltip>)}
          {lockStatus?.isLocked && !lockStatus?.isDeactivated && (<Tooltip title={`Locked (${lockStatus.failedLoginAttempts} failed attempts)`}><i className='tabler-lock text-warning text-[18px]' /></Tooltip>)}
        </div>
      )
    }
  }

  const selectCol = columnHelper.display({ id: 'select', header: ({ table }) => <input type='checkbox' checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} />, cell: ({ row }) => <input type='checkbox' checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} onClick={(e: React.MouseEvent) => e.stopPropagation()} /> })

  const columns = useMemo(() => {
    if (!fieldDefs.length) return [selectCol, rendererMap.firstName, rendererMap.lastName, rendererMap.email, rendererMap.phone, rendererMap.role, rendererMap.department, rendererMap.status, rendererMap.gender, actionCol]
    const active = fieldDefs.filter(f => f.isActive !== false)
    const cols = active.map(f => { const r = (rendererMap as any)[f.fieldName]; if (!r) return null; const c = { ...r, id: f.fieldName }; if (c.columnDef) c.columnDef = { ...r.columnDef, header: f.fieldLabel }; return c }).filter(Boolean)
    return [selectCol, ...cols, actionCol]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldDefs, rendererMap, printingId, loginStatuses])

  const defaultColVisibility = useMemo(() => {
    const vis: Record<string, boolean> = {}
    fieldDefs.forEach(f => { vis[f.fieldName] = f.showInGrid })
    return vis
  }, [fieldDefs])

  if (loading) return <Box className='flex items-center justify-center min-h-64'><CircularProgress /></Box>

  return (
    <>
      <EntityListView<TeamMember>
        columns={columns as any}
        data={filteredMembers}
        flashing={flashing as FlashRow[]}
        storageKey='jm-teams'
        title='Team Members'
        defaultColVisibility={fieldDefs.length ? defaultColVisibility : { lastName: true, department: false, phone: false, gender: false }}
        filterChips={
          <>
            {/* Status filters */}
            <Chip label={`All (${statusCounts.all || 0})`} variant={statusFilter === 'all' ? 'filled' : 'outlined'} color={statusFilter === 'all' ? 'primary' : 'default'} onClick={() => setStatusFilter('all')} size='small' />
            <Chip label={`Active (${statusCounts.ACTIVE || 0})`} variant={statusFilter === 'ACTIVE' ? 'filled' : 'outlined'} color={statusFilter === 'ACTIVE' ? 'success' : 'default'} onClick={() => setStatusFilter('ACTIVE')} size='small' />
            <Chip label={`Inactive (${statusCounts.INACTIVE || 0})`} variant={statusFilter === 'INACTIVE' ? 'filled' : 'outlined'} color='default' onClick={() => setStatusFilter('INACTIVE')} size='small' />
            <Chip label={`On Leave (${statusCounts.ON_LEAVE || 0})`} variant={statusFilter === 'ON_LEAVE' ? 'filled' : 'outlined'} color={statusFilter === 'ON_LEAVE' ? 'warning' : 'default'} onClick={() => setStatusFilter('ON_LEAVE')} size='small' />
            {/* Role divider + chips */}
            {Object.keys(roleCounts).filter(r => r !== 'all').length > 0 && (
              <Divider orientation='vertical' flexItem sx={{ mx: 1, height: 24, alignSelf: 'center' }} />
            )}
            {Object.entries(roleCounts).filter(([role]) => role !== 'all').sort((a, b) => b[1] - a[1]).slice(0, 5).map(([role, count]) => (
              <Chip key={role} label={`${role} (${count})`} variant={roleFilter === role ? 'filled' : 'outlined'} color={roleFilter === role ? 'info' : 'default'} onClick={() => setRoleFilter(role)} size='small' />
            ))}
          </>
        }
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder='Search team…'
        entityName='team'
        onAIResult={handleAIResult}
        newButtonLabel='New Member'
        onNewClick={() => setCreateOpen(true)}
        onExportCsv={exportToCSV}
        onExportJson={exportToJSON}
        emptyMessage='No team members found'
        onRowDoubleClick={m => openDetail(m)}
        cardGrid={<TeamCardGrid data={filteredMembers} onEdit={openDetail} />}
      />
      <TeamFullPageDetail
        memberId={selectedMember?.id || null}
        open={detailPanelOpen}
        onClose={handleDetailClose}
        onEdit={() => {}}
      />
      <TeamFullPageDetail
        open={createOpen}
        onClose={async () => { setCreateOpen(false); const d = await api.get<TeamMember[]>('/api/users'); setMembers(Array.isArray(d) ? d : []) }}
        onEdit={() => {}}
        initialEditing={true}
      />
    </>
  )
}
