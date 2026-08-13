'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import CircularProgress from '@mui/material/CircularProgress'

import { api } from '@/lib/api'
import type { HistoryFeedResponse, History } from '@shared/contracts'
import { COLORS } from '../theme/designTokens'


// ── Icon + color per entity/action ─────────────────────────────────
function getStyle(entityType: string, action: string): { icon: string; color: string; bg: string } {
  if (action === 'created') return { icon: 'tabler-circle-plus', color: COLORS.success, bg: 'rgba(16,185,129,0.1)' }
  if (action === 'updated') return { icon: 'tabler-pencil', color: COLORS.warning, bg: 'rgba(245,158,11,0.1)' }
  if (action === 'deleted') return { icon: 'tabler-trash', color: COLORS.error, bg: 'rgba(239,68,68,0.1)' }
  if (action === 'sent') return { icon: 'tabler-send', color: COLORS.info, bg: 'rgba(59,130,246,0.1)' }
  if (action === 'paid') return { icon: 'tabler-circle-check', color: COLORS.success, bg: 'rgba(16,185,129,0.1)' }
  switch (entityType) {
    case 'client': return { icon: 'tabler-user', color: COLORS.indigo, bg: 'rgba(99,102,241,0.1)' }
    case 'job': return { icon: 'tabler-tool', color: COLORS.success, bg: 'rgba(16,185,129,0.1)' }
    case 'quote': return { icon: 'tabler-file-description', color: COLORS.orange, bg: 'rgba(249,115,22,0.1)' }
    case 'invoice': return { icon: 'tabler-receipt', color: COLORS.info, bg: 'rgba(59,130,246,0.1)' }
    case 'request': return { icon: 'tabler-clipboard-list', color: COLORS.violet, bg: 'rgba(139,92,246,0.1)' }
    default: return { icon: 'tabler-file-text', color: COLORS.gray500, bg: 'rgba(107,114,128,0.1)' }
  }
}

function formatActionLabel(action: string, entityType: string): string {
  const verb = action.charAt(0).toUpperCase() + action.slice(1)
  const label = entityType === 'team_member' ? 'team member' : entityType.replace('_', ' ')
  return `${verb} ${label}`
}

function formatRelativeTime(dateString: string): string {
  const d = new Date(dateString), now = new Date()
  const ms = now.getTime() - d.getTime()
  const mins = Math.floor(ms / 60000), hrs = Math.floor(mins / 60), days = Math.floor(hrs / 24)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function groupByDate(items: History[]): { label: string; items: History[] }[] {
  const groups: Record<string, History[]> = {}
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  items.forEach((item: History) => {
    const d = new Date(item.creAt); d.setHours(0, 0, 0, 0)
    const label = d.getTime() === today.getTime() ? 'Today'
      : d.getTime() === yesterday.getTime() ? 'Yesterday'
        : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    if (!groups[label]) groups[label] = []
    groups[label].push(item)
  })
  return Object.entries(groups).map(([label, items]) => ({ label, items }))
}

// ═══════════════════════════════════════════════════════════════════
// ENTITY HISTORY PANEL
// Generic history panel that can show history for any entity.
// Pass entityId + entityType to filter by a specific record,
// or clientId to show all history for a client.
// ═══════════════════════════════════════════════════════════════════
interface EntityHistoryPanelProps {
  entityId?: string
  entityType?: string
  clientId?: string
  emptyMessage?: string
}

/**
 * Timeline panel showing the audit history (created, updated, status changed) for any entity.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/components/EntityHistoryPanel.tsx
 */
export default function EntityHistoryPanel({ entityId, entityType, clientId, emptyMessage }: EntityHistoryPanelProps) {
  // Build query string
  const queryParams = new URLSearchParams()
  if (entityId) queryParams.set('entityId', entityId)
  if (entityType) queryParams.set('entityType', entityType)
  if (clientId) queryParams.set('clientId', clientId)
  queryParams.set('limit', '200')

  const qsKey = queryParams.toString()

  const { data, isLoading } = useQuery({
    queryKey: ['histories', qsKey],
    queryFn: () => api.get<HistoryFeedResponse>(`/api/history?${qsKey}`),
    enabled: !!(entityId || clientId),
  })

  const histories = useMemo(() =>
    (data?.histories ?? []).sort((a: History, b: History) => new Date(b.creAt).getTime() - new Date(a.creAt).getTime()),
    [data]
  )

  const grouped = useMemo(() => groupByDate(histories), [histories])

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (histories.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <i className='tabler-history text-[32px]' style={{ color: 'var(--mui-palette-text-disabled)' }} />
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
          {emptyMessage || 'No activity history yet.'}
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      {grouped.map((group) => (
        <Box key={group.label}>
          {/* Date header */}
          <Box sx={{ px: 2, py: 0.75, bgcolor: 'action.hover' }}>
            <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.65rem' }}>
              {group.label}
            </Typography>
          </Box>

          {/* Timeline items */}
          {group.items.map((item: History, i: number) => {
            const s = getStyle(item.entityType, item.action)
            return (
              <Box
                key={item.id}
                sx={{
                  display: 'flex', alignItems: 'flex-start', gap: 1.5, px: 2, py: 1.5,
                  borderBottom: i < group.items.length - 1 ? 1 : 0, borderColor: 'divider',
                }}
              >
                <Avatar sx={{ width: 28, height: 28, bgcolor: s.bg, flexShrink: 0, mt: 0.25 }}>
                  <i className={`${s.icon} text-sm`} style={{ color: s.color }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant='body2' fontWeight={600} fontSize='0.8rem' noWrap>
                    {formatActionLabel(item.action, item.entityType)}
                  </Typography>
                  {item.entityName && (
                    <Typography variant='caption' color='text.secondary' fontStyle='italic' noWrap display='block'>
                      {item.entityName}
                    </Typography>
                  )}
                  <Typography variant='caption' color='text.disabled' fontSize='0.65rem'>
                    {item.performedBy} · {formatRelativeTime(item.creAt)}
                  </Typography>
                </Box>
              </Box>
            )
          })}
        </Box>
      ))}
    </Box>
  )
}
