'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'

import { api } from '@/lib/api'
import type { HistoryFeedResponse, HistoryTimePeriod, History } from '@shared/contracts'
import { COLORS } from '../../theme/designTokens'


// ── Time period options ───────────────────────────────────────────
const TIME_PERIODS: { value: HistoryTimePeriod; label: string; icon: string }[] = [
  { value: 'today', label: 'Today', icon: 'tabler-calendar-event' },
  { value: 'yesterday', label: 'Yesterday', icon: 'tabler-calendar-minus' },
  { value: 'last_week', label: 'Last 7 Days', icon: 'tabler-calendar-week' },
  { value: 'last_month', label: 'Last 30 Days', icon: 'tabler-calendar-month' },
  { value: 'last_3_months', label: 'Last 3 Months', icon: 'tabler-calendar-time' },
]

// ── Entity type filter options ────────────────────────────────────
const ENTITY_FILTERS: { value: string; label: string; icon: string; color: string }[] = [
  { value: 'all', label: 'All', icon: 'tabler-list', color: 'default' },
  { value: 'client', label: 'Clients', icon: 'tabler-users', color: COLORS.indigo },
  { value: 'request', label: 'Requests', icon: 'tabler-clipboard-list', color: COLORS.warning },
  { value: 'quote', label: 'Quotes', icon: 'tabler-file-description', color: COLORS.orange },
  { value: 'job', label: 'Jobs', icon: 'tabler-tool', color: COLORS.success },
  { value: 'invoice', label: 'Invoices', icon: 'tabler-receipt', color: COLORS.info },
  { value: 'purchase_order', label: 'POs', icon: 'tabler-shopping-cart', color: COLORS.violet },
  { value: 'vendor', label: 'Vendors', icon: 'tabler-building-store', color: COLORS.pink },
  { value: 'team_member', label: 'Team', icon: 'tabler-user-check', color: COLORS.cyan },
]

// ── Icon + color mapping ──────────────────────────────────────────
function getEntityStyle(entityType: string, action: string): { icon: string; color: string; bgColor: string } {
  // Special styles for specific actions
  if (action === 'sent') return { icon: 'tabler-send', color: COLORS.info, bgColor: 'rgba(59,130,246,0.1)' }
  if (action === 'paid') return { icon: 'tabler-circle-check', color: COLORS.success, bgColor: 'rgba(16,185,129,0.1)' }
  if (action === 'deleted') return { icon: 'tabler-trash', color: COLORS.error, bgColor: 'rgba(239,68,68,0.1)' }
  if (action === 'updated') return { icon: 'tabler-pencil', color: COLORS.warning, bgColor: 'rgba(245,158,11,0.1)' }

  switch (entityType) {
    case 'client': return { icon: 'tabler-user-plus', color: COLORS.indigo, bgColor: 'rgba(99,102,241,0.1)' }
    case 'request': return { icon: 'tabler-clipboard-list', color: COLORS.warning, bgColor: 'rgba(245,158,11,0.1)' }
    case 'quote': return { icon: 'tabler-file-description', color: COLORS.orange, bgColor: 'rgba(249,115,22,0.1)' }
    case 'job': return { icon: 'tabler-tool', color: COLORS.success, bgColor: 'rgba(16,185,129,0.1)' }
    case 'invoice': return { icon: 'tabler-receipt', color: COLORS.info, bgColor: 'rgba(59,130,246,0.1)' }
    case 'purchase_order': return { icon: 'tabler-shopping-cart', color: COLORS.violet, bgColor: 'rgba(139,92,246,0.1)' }
    case 'vendor': return { icon: 'tabler-building-store', color: COLORS.pink, bgColor: 'rgba(236,72,153,0.1)' }
    case 'team_member': return { icon: 'tabler-user-check', color: COLORS.cyan, bgColor: 'rgba(6,182,212,0.1)' }
    case 'company': return { icon: 'tabler-building', color: COLORS.cyan, bgColor: 'rgba(6,182,212,0.1)' }
    case 'tax_code': return { icon: 'tabler-calculator', color: COLORS.pink, bgColor: 'rgba(236,72,153,0.1)' }
    default: return { icon: 'tabler-file-text', color: COLORS.gray500, bgColor: 'rgba(107,114,128,0.1)' }
  }
}

// ── Relative time formatter ───────────────────────────────────────
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

// ── Action text formatter ─────────────────────────────────────────
function formatActionText(action: string, entityType: string): string {
  const entityLabels: Record<string, string> = {
    client: 'client', team_member: 'team member', tax_code: 'tax code',
    purchase_order: 'purchase order', request: 'request', quote: 'quote',
    job: 'job', invoice: 'invoice', vendor: 'vendor', company: 'company',
  }
  const label = entityLabels[entityType] || entityType
  switch (action) {
    case 'created': return `Created a ${label}`
    case 'updated': return `Updated a ${label}`
    case 'deleted': return `Deleted a ${label}`
    case 'sent': return `Sent an ${label}`
    case 'paid': return `Marked ${label} as paid`
    case 'completed': return `Completed a ${label}`
    case 'accepted': return `Accepted a ${label}`
    case 'declined': return `Declined a ${label}`
    default: return `${action} a ${label}`
  }
}

// ── Group activities by date label ────────────────────────────────
function groupByDate(items: History[]): { label: string; items: History[] }[] {
  const groups: Record<string, History[]> = {}
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)

  items.forEach(item => {
    const d = new Date(item.creAt); d.setHours(0, 0, 0, 0)
    let label: string
    if (d.getTime() === today.getTime()) label = 'Today'
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday'
    else label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    if (!groups[label]) groups[label] = []
    groups[label].push(item)
  })
  return Object.entries(groups).map(([label, items]) => ({ label, items }))
}

// ═════════════════════════════════════════════════════════════════
// ACTIVITY FEED VIEW
// ═════════════════════════════════════════════════════════════════
/**
 * Activity feed view showing recent actions across all entities in chronological order.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/activity/ActivityFeedView.tsx
 */
export default function ActivityFeedView() {
  const [selectedPeriod, setSelectedPeriod] = useState<HistoryTimePeriod>('last_week')
  const [entityFilter, setEntityFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['activities', selectedPeriod],
    queryFn: () => api.get<HistoryFeedResponse>(`/api/history?period=${selectedPeriod}&limit=200`),
  })

  const activities = data?.histories ?? []
  const total = data?.total ?? 0

  // Apply client-side filters
  const filtered = useMemo(() => {
    let result = activities
    if (entityFilter !== 'all') result = result.filter((a: History) => a.entityType === entityFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((a: History) =>
        a.entityName?.toLowerCase().includes(q) ||
        a.performedBy?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.action?.toLowerCase().includes(q)
      )
    }
    return result
  }, [activities, entityFilter, searchQuery])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  // Entity type counts for filter badges
  const entityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: activities.length }
    activities.forEach((a: History) => { counts[a.entityType] = (counts[a.entityType] || 0) + 1 })
    return counts
  }, [activities])

  const handleNavigate = useCallback((item: History) => {
    const routes: Record<string, string> = {
      client: '/clients', job: '/jobs', invoice: '/invoices', quote: '/quotes',
      request: '/requests', purchase_order: '/purchase-orders', vendor: '/vendors',
      team_member: '/team',
    }
    const base = routes[item.entityType]
    if (base && item.entityId) {
      // Open the entity detail via the list page (it handles detail panels)
      window.location.href = base
    }
  }, [])

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant='h4' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <i className='tabler-activity text-[28px]' style={{ color: 'var(--mui-palette-primary-main)' }} />
            Activity Feed
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            {total} activities {selectedPeriod === 'today' ? 'today' : `in the ${TIME_PERIODS.find(p => p.value === selectedPeriod)?.label?.toLowerCase()}`}
          </Typography>
        </Box>
        <Tooltip title='Refresh'>
          <IconButton onClick={() => refetch()} sx={{ bgcolor: 'action.hover' }}>
            <i className='tabler-refresh text-xl' />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Time period chips ──────────────────────────────── */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {TIME_PERIODS.map(period => (
          <Chip
            key={period.value}
            label={period.label}
            icon={<i className={`${period.icon} text-[14px]`} />}
            size='small'
            variant={selectedPeriod === period.value ? 'filled' : 'outlined'}
            color={selectedPeriod === period.value ? 'primary' : 'default'}
            onClick={() => setSelectedPeriod(period.value)}
            sx={{ fontWeight: selectedPeriod === period.value ? 600 : 400 }}
          />
        ))}
      </Box>

      {/* ── Entity type filters ────────────────────────────── */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
        {ENTITY_FILTERS.map(ef => {
          const count = entityCounts[ef.value] ?? 0
          if (ef.value !== 'all' && count === 0) return null
          return (
            <Chip
              key={ef.value}
              label={`${ef.label} (${count})`}
              icon={<i className={`${ef.icon} text-[13px]`} />}
              size='small'
              variant={entityFilter === ef.value ? 'filled' : 'outlined'}
              color={entityFilter === ef.value ? 'primary' : 'default'}
              onClick={() => setEntityFilter(ef.value)}
              sx={{ fontSize: '0.75rem' }}
            />
          )
        })}
      </Box>

      {/* ── Search bar ─────────────────────────────────────── */}
      <TextField
        placeholder='Search activities...'
        size='small'
        fullWidth
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: <InputAdornment position='start'><i className='tabler-search text-lg' /></InputAdornment>,
          endAdornment: searchQuery ? (
            <InputAdornment position='end'>
              <IconButton size='small' onClick={() => setSearchQuery('')}><i className='tabler-x text-sm' /></IconButton>
            </InputAdornment>
          ) : null,
        }}
      />

      {/* ── Activity list ──────────────────────────────────── */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 12 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }} color='text.secondary'>Loading activities...</Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 12 }}>
          <i className='tabler-activity-heartbeat text-[48px]' style={{ color: 'var(--mui-palette-text-disabled)' }} />
          <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No Activity Found</Typography>
          <Typography variant='body2' color='text.disabled'>
            {searchQuery ? 'No activities match your search.' : 'Activities will appear here when you create or update records.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ borderRadius: 2, border: 1, borderColor: 'divider', overflow: 'hidden', bgcolor: 'background.paper' }}>
          {grouped.map((group, gi) => (
            <Box key={group.label}>
              {/* Date group header */}
              <Box sx={{ px: 2.5, py: 1.25, bgcolor: 'action.hover', borderBottom: 1, borderTop: gi > 0 ? 1 : 0, borderColor: 'divider' }}>
                <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {group.label}
                  <Typography component='span' variant='caption' color='text.disabled' sx={{ ml: 1 }}>
                    ({group.items.length})
                  </Typography>
                </Typography>
              </Box>

              {/* Activity items */}
              {group.items.map((item, i) => {
                const style = getEntityStyle(item.entityType, item.action)
                const descLines = item.description?.split('\n').filter(Boolean) ?? []

                return (
                  <Box
                    key={item.id}
                    onClick={() => handleNavigate(item)}
                    sx={{
                      display: 'flex', alignItems: 'flex-start', gap: 2, px: 2.5, py: 2,
                      cursor: 'pointer',
                      borderBottom: i < group.items.length - 1 ? 1 : 0, borderColor: 'divider',
                      transition: 'background-color 0.15s',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    {/* Icon avatar */}
                    <Avatar sx={{ width: 40, height: 40, bgcolor: style.bgColor, flexShrink: 0 }}>
                      <i className={`${style.icon} text-xl`} style={{ color: style.color }} />
                    </Avatar>

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant='body2' fontWeight={600} noWrap>
                        {item.performedBy}{' '}
                        <Typography component='span' variant='body2' color='text.secondary' fontWeight={400}>
                          {formatActionText(item.action, item.entityType).toLowerCase()}
                        </Typography>
                        {descLines[0]?.startsWith('- $') && (
                          <Typography component='span' variant='body2' fontWeight={600} sx={{ ml: 0.5 }}>
                            {descLines[0]}
                          </Typography>
                        )}
                      </Typography>

                      {item.entityName && (
                        <Typography variant='body2' color='text.secondary' fontStyle='italic' noWrap sx={{ mt: 0.25 }}>
                          {item.entityName}
                        </Typography>
                      )}

                      {descLines.length > 1 && (
                        <Typography variant='caption' color='text.disabled' noWrap>
                          {descLines.slice(1).join(' · ')}
                        </Typography>
                      )}
                    </Box>

                    {/* Timestamp */}
                    <Typography variant='caption' color='text.disabled' sx={{ flexShrink: 0, mt: 0.25 }}>
                      {formatRelativeTime(item.creAt)}
                    </Typography>
                  </Box>
                )
              })}
            </Box>
          ))}
        </Box>
      )}

      {/* ── Footer summary ─────────────────────────────────── */}
      {filtered.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <Typography variant='caption' color='text.disabled'>
            Showing {filtered.length} of {total} activities
          </Typography>
        </Box>
      )}
    </Box>
  )
}
