'use client'

/**
 * QuickActionsBar — colourful "New Entity" shortcut strip.
 *
 * Reusable across:
 *   • Global layout (below the top navbar, toggleable via user avatar menu)
 *   • Dashboard page (always visible)
 *   • Anywhere else that wants a quick-add row
 *
 * The bar reads its visibility from localStorage (`jm-show-quick-actions`)
 * and animates in/out with a smooth slide. Individual consumers can also
 * force it visible via the `forceShow` prop (e.g. the dashboard).
 */

import Link from 'next/link'
import Collapse from '@mui/material/Collapse'
import useLocalStorage from '@/hooks/useLocalStorage'
import { COLORS } from '../theme/designTokens'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { DashboardStats } from '@shared/contracts'


// ── Quick-action definitions (same as mobile) ──────────────────────────────
const ORANGE = COLORS.orange

export const QUICK_ACTIONS = [
  { href: '/clients?add=1',   icon: 'tabler-user-plus',      label: 'Client',  color: 'var(--mui-palette-primary-main)' },
  { href: '/requests?add=1',  icon: 'tabler-clipboard-plus', label: 'Request', color: COLORS.pink },
  { href: '/quotes?add=1',    icon: 'tabler-file-plus',      label: 'Quote',   color: ORANGE },
  { href: '/jobs?add=1',      icon: 'tabler-briefcase',      label: 'Job',     color: COLORS.info },
  { href: '/invoices?add=1',  icon: 'tabler-receipt-2',      label: 'Invoice', color: COLORS.violet },
  { href: '/purchase-orders?add=1', icon: 'tabler-shopping-cart', label: 'P.O.', color: COLORS.successDark },
] as const

// ── Persistence key (shared between bar + toggle) ──────────────────────────
export const QUICK_ACTIONS_KEY = 'jm-show-quick-actions'

// ── Hook for reading / writing the preference from anywhere ────────────────
export function useQuickActionsVisible() {
  return useLocalStorage<boolean>(QUICK_ACTIONS_KEY, true)   // default ON
}

// ── Individual button ──────────────────────────────────────────────────────
type QuickActionItem = typeof QUICK_ACTIONS[number];

// ── Individual button ──────────────────────────────────────────────────────
function QuickActionBtn({ href, icon, label, color, flash }: QuickActionItem & { flash?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 group relative`}
    >
      <div
        className='flex items-center justify-center rounded-full w-11 h-11 shadow transition-transform group-hover:scale-110 group-active:scale-95'
        style={{ backgroundColor: color }}
      >
        <i className={`${icon} text-xl text-white`} />
        {flash && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center">
            <i className="tabler-asterisk text-error animate-pulse text-[18px]" />
          </span>
        )}
      </div>
      <span
        className='font-semibold text-center leading-none'
        style={{ fontSize: 14, fontFamily: 'Nunito, Inter, sans-serif', letterSpacing: '0.06em', color: 'var(--mui-palette-text-secondary)' }}
      >
        <span style={{ fontWeight: 800, fontSize: 15 }}>+</span> {label}
      </span>
    </Link>
  )
}

// ── Main bar component ─────────────────────────────────────────────────────
interface QuickActionsBarProps {
  /** If true, always show regardless of the user preference (for Dashboard) */
  forceShow?: boolean
  /** Optional extra className */
  className?: string
}

export default function QuickActionsBar({ forceShow, className }: QuickActionsBarProps) {
  const [visible] = useQuickActionsVisible()

  // Subscribe to dashboard stats (cached by React Query if loaded on dashboard, or fetches if loaded from elsewhere)
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/api/dashboard/stats'),
  })

  const hasWebRequests = (stats?.webRequests ?? 0) > 0;
  const show = forceShow || visible

  if (!show) return null

  return (
    <div
      className={`flex items-center gap-[clamp(4px,1.2vw,26px)] py-1.5 px-[clamp(4px,1.2vw,20px)] rounded-full ${className ?? ''}`}
      style={{
        background: 'var(--mui-palette-action-hover)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}
    >
      {QUICK_ACTIONS.map(qa => (
        <QuickActionBtn key={qa.label} {...qa} flash={qa.label === 'Request' && hasWebRequests} />
      ))}
    </div>
  )
}
