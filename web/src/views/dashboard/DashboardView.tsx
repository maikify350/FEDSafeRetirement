'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import Typography from '@mui/material/Typography'
import Collapse from '@mui/material/Collapse'
import Chip from '@mui/material/Chip'

import { api } from '@/lib/api'
import type { DashboardStats } from '@shared/contracts'
import { COLORS } from '../../theme/designTokens'


const ORANGE = COLORS.orange

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon, color, href }: {
  title: string; value: string | number; subtitle?: string
  icon: string; color: string; href?: string
}) {
  const inner = (
    <div
      className='rounded-2xl pt-1 pb-2 px-3 shadow-sm transition-transform hover:scale-[1.02]'
      style={{ background: 'var(--mui-palette-background-paper)', borderLeft: `4px solid ${color}` }}
    >
      <div className='flex items-center justify-between'>
        <div className='w-9 h-9 rounded-full flex items-center justify-center' style={{ backgroundColor: `${color}20` }}>
          <i className={`${icon} text-xl`} style={{ color }} />
        </div>
        <span className='text-2xl font-bold' style={{ color: 'var(--mui-palette-text-primary)' }}>{value}</span>
      </div>
      <p className='text-base font-medium mt-0.5' style={{ color: 'var(--mui-palette-text-secondary)' }}>{title}</p>
      {subtitle && (
        <p className='text-sm' style={{ color: 'var(--mui-palette-text-disabled)' }}>{subtitle}</p>
      )}
    </div>
  )
  return href
    ? <Link href={href} className='contents'>{inner}</Link>
    : inner
}

// ─── Status row ───────────────────────────────────────────────────────────────
function StatusRow({ icon, color, label, count, href }: {
  icon: string; color: string; label: string; count: number; href?: string
}) {
  const inner = (
    <div
      className='flex items-center justify-between py-1 px-4 border-b last:border-b-0 transition-colors hover:bg-black/5 dark:hover:bg-white/5'
      style={{ borderColor: 'var(--mui-palette-divider)', opacity: count > 0 ? 1 : 0.4 }}
    >
      <div className='flex items-center gap-3'>
        <i className={`${icon} text-lg`} style={{ color }} />
        <span className='text-base' style={{ color: 'var(--mui-palette-text-secondary)' }}>{label}</span>
      </div>
      <span className='text-lg font-semibold' style={{ color: 'var(--mui-palette-text-primary)' }}>{count}</span>
    </div>
  )
  return href && count > 0 ? <Link href={href}>{inner}</Link> : inner
}

// ─── Expandable accordion ──────────────────────────────────────────────────────
function ExpandableSection({ title, count, children, forceOpen, alertActive }: {
  title: string; count: number; children: React.ReactNode; forceOpen: boolean; alertActive?: boolean
}) {
  const [localOpen, setLocalOpen] = useState(false)
  const open = forceOpen || localOpen

  return (
    <div
      className='rounded-2xl overflow-hidden shadow-sm'
      style={{ background: 'var(--mui-palette-background-paper)', border: '1px solid var(--mui-palette-divider)' }}
    >
      <button
        onClick={() => setLocalOpen(o => !o)}
        className='w-full flex items-center justify-between px-4 py-2 text-left'
      >
        <span className='font-semibold text-base flex items-center gap-2' style={{ color: 'var(--mui-palette-text-primary)' }}>
          <span>{title}&nbsp;<span className='font-normal' style={{ color: 'var(--mui-palette-text-secondary)' }}>({count})</span></span>
          {alertActive && (
            <span className="relative flex h-3 w-3 ml-1" title="New Web Requests">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-error items-center justify-center">
                <i className='tabler-bell-ringing text-white text-[10px] absolute -top-[5px] -left-[4px]' />
              </span>
            </span>
          )}
        </span>
        <i className={`tabler-chevron-${open ? 'up' : 'down'} text-base`} style={{ color: 'var(--mui-palette-text-secondary)' }} />
      </button>
      <Collapse in={open}>
        <div>{children}</div>
      </Collapse>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
/**
 * Main dashboard view with KPI cards, charts, quick actions, and today's job queue.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/dashboard/DashboardView.tsx
 */
export default function DashboardView() {
  const [allExpanded, setAllExpanded] = useState(false)

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/api/dashboard/stats'),
  })

  const fmt = (n = 0) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  if (isLoading || !stats) {
    return (
      <div className='flex justify-center items-center min-h-[60vh]'>
        <div className='animate-spin rounded-full h-12 w-12 border-4 border-t-transparent' style={{ borderColor: 'var(--mui-palette-primary-main)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const totalRequests = (stats.newRequests ?? 0) + (stats.assessmentCompleteRequests ?? 0) + (stats.convertedRequests ?? 0) + (stats.archivedRequests ?? 0)
  const totalQuotes   = (stats.draftQuotes ?? 0) + (stats.sentQuotes ?? 0) + (stats.acceptedQuotes ?? 0) + (stats.declinedQuotes ?? 0) + (stats.expiredQuotes ?? 0)
  const totalJobs     = (stats.scheduledJobs ?? 0) + (stats.inProgressJobs ?? 0) + (stats.onHoldJobs ?? 0) + (stats.completedJobs ?? 0)
  const totalInv      = (stats.draftInvoices ?? 0) + (stats.sentInvoices ?? 0) + (stats.paidInvoices ?? 0) + (stats.overdueInvoices ?? 0) + (stats.cancelledInvoices ?? 0)
  const totalPOs      = (stats.draftPurchaseOrders ?? 0) + (stats.issuedPurchaseOrders ?? 0) + (stats.partialReceivedPurchaseOrders ?? 0) + (stats.receivedCompletePurchaseOrders ?? 0)

  return (
    <div className='flex flex-col gap-4 pb-8 w-full max-w-4xl mx-auto'>

      {/* ── Overview ── */}
      <Typography variant='h6' fontWeight={600} className='!mb-0' sx={{ fontSize: '1.44rem' }}>Overview</Typography>
      <div className='grid grid-cols-2 gap-2'>
        <StatCard title='Total Clients'   value={stats.totalClients}                                                                icon='tabler-users'            color='var(--mui-palette-primary-main)' href='/clients' />
        <StatCard title='Active Jobs'     value={(stats.scheduledJobs ?? 0) + (stats.inProgressJobs ?? 0)}  subtitle={`${stats.completedJobs ?? 0} completed`} icon='tabler-briefcase'        color={COLORS.info}                      href='/jobs' />
        <StatCard title='Draft Quotes'    value={stats.draftQuotes ?? 0}                                    subtitle={`${stats.acceptedQuotes ?? 0} accepted`}  icon='tabler-file-description' color={ORANGE}                       href='/quotes' />
        <StatCard title='Unpaid Invoices' value={stats.unpaidInvoices ?? 0}                                 subtitle={`${stats.paidInvoices ?? 0} paid`}        icon='tabler-receipt-2'        color={COLORS.violet}                      href='/invoices' />
      </div>

      {/* ── Revenue ── */}
      <Typography variant='h6' fontWeight={600} className='!mb-0' sx={{ fontSize: '1.44rem' }}>Revenue</Typography>
      <div className='grid grid-cols-2 gap-2'>
        <StatCard title='Total Revenue' value={fmt(stats.totalRevenue)}       icon='tabler-trending-up' color={COLORS.successGreen} />
        <StatCard title='Outstanding'   value={fmt(stats.outstandingAmount)}  icon='tabler-alert-circle' color={COLORS.warning} />
      </div>

      {/* ── Expand / Collapse All ── */}
      <div className='flex justify-end'>
        <Chip
          key={allExpanded ? 'collapse' : 'expand'}
          label={allExpanded ? 'Collapse All' : 'Expand All'}
          size='small'
          onClick={() => setAllExpanded(!allExpanded)}
          icon={<i className={allExpanded ? 'tabler-chevrons-up' : 'tabler-chevrons-down'} />}
          sx={{
            borderRadius: '999px',
            fontSize: '0.75rem',
            height: 22,
            cursor: 'pointer',
            bgcolor: allExpanded ? 'primary.main' : 'primary.lighter',
            color: allExpanded ? COLORS.white : 'primary.main',
            '&:hover': { bgcolor: allExpanded ? 'primary.dark' : 'primary.light' },
            '& .MuiChip-icon': {
              marginLeft: '6px',
              marginRight: '-4px',
              color: allExpanded ? COLORS.white + ' !important' : 'primary.main !important',
              fontSize: '1rem'
            }
          }}
        />
      </div>

      {/* ── Status Accordions ── */}
      <div className='flex flex-col gap-3'>

        <ExpandableSection title='Requests Status' count={totalRequests} forceOpen={allExpanded} alertActive={(stats?.webRequests ?? 0) > 0}>
          <StatusRow icon='tabler-world'           color={COLORS.info} label='Web (Online Booking)' count={stats.webRequests ?? 0} href='/requests?status=web' />
          <StatusRow icon='tabler-sparkles'        color={COLORS.pink} label='New'                 count={stats.newRequests ?? 0} href='/requests?status=New' />
          <StatusRow icon='tabler-clipboard-check' color={COLORS.info} label='Assessment Complete' count={stats.assessmentCompleteRequests ?? 0} href='/requests?status=Assessment Complete' />
          <StatusRow icon='tabler-arrows-exchange' color={COLORS.successGreen} label='Converted'           count={stats.convertedRequests ?? 0} href='/requests?status=Converted' />
          <StatusRow icon='tabler-archive'       color={COLORS.graySlate} label='Archived'            count={stats.archivedRequests ?? 0} href='/requests?status=Archived' />
        </ExpandableSection>

        <ExpandableSection title='Quotes Status' count={totalQuotes} forceOpen={allExpanded}>
          <StatusRow icon='tabler-file-pencil'   color={COLORS.graySlate} label='Draft'    count={stats.draftQuotes ?? 0} href='/quotes?status=Draft' />
          <StatusRow icon='tabler-send'          color={COLORS.info} label='Sent'     count={stats.sentQuotes ?? 0} href='/quotes?status=Sent' />
          <StatusRow icon='tabler-circle-check'  color={COLORS.successGreen} label='Accepted' count={stats.acceptedQuotes ?? 0} href='/quotes?status=Accepted' />
          <StatusRow icon='tabler-circle-x'      color={COLORS.error} label='Declined' count={stats.declinedQuotes ?? 0} href='/quotes?status=Declined' />
          <StatusRow icon='tabler-alert-circle'  color={ORANGE}  label='Expired'  count={stats.expiredQuotes ?? 0} href='/quotes?status=Expired' />
        </ExpandableSection>

        <ExpandableSection title='Jobs Status' count={totalJobs} forceOpen={allExpanded}>
          <StatusRow icon='tabler-clock'         color={COLORS.info} label='Scheduled'   count={stats.scheduledJobs ?? 0} href='/jobs?status=Scheduled' />
          <StatusRow icon='tabler-alert-circle'  color={ORANGE}  label='In Progress' count={stats.inProgressJobs ?? 0} href='/jobs?status=In Progress' />
          <StatusRow icon='tabler-player-pause'  color={COLORS.warning} label='On Hold'     count={stats.onHoldJobs ?? 0} href='/jobs?status=On Hold' />
          <StatusRow icon='tabler-circle-check'  color={COLORS.successGreen} label='Completed'   count={stats.completedJobs ?? 0} href='/jobs?status=Completed' />
        </ExpandableSection>

        <ExpandableSection title='Invoice Status' count={totalInv} forceOpen={allExpanded}>
          <StatusRow icon='tabler-file-pencil'   color={COLORS.graySlate} label='Draft'     count={stats.draftInvoices ?? 0} href='/invoices?status=Draft' />
          <StatusRow icon='tabler-send'          color={COLORS.info} label='Sent'      count={stats.sentInvoices ?? 0} href='/invoices?status=Sent' />
          <StatusRow icon='tabler-currency-dollar' color={COLORS.successGreen} label='Paid'    count={stats.paidInvoices ?? 0} href='/invoices?status=Paid' />
          <StatusRow icon='tabler-alert-circle'  color={COLORS.error} label='Overdue'   count={stats.overdueInvoices ?? 0} href='/invoices?status=Overdue' />
          <StatusRow icon='tabler-circle-x'      color={COLORS.graySlate} label='Cancelled' count={stats.cancelledInvoices ?? 0} href='/invoices?status=Cancelled' />
        </ExpandableSection>

        <ExpandableSection title='Purchase Order Status' count={totalPOs} forceOpen={allExpanded}>
          <StatusRow icon='tabler-file-pencil'   color={COLORS.graySlate} label='Draft'             count={stats.draftPurchaseOrders ?? 0} href='/purchase-orders?status=Draft' />
          <StatusRow icon='tabler-send'          color={COLORS.info} label='Issued'            count={stats.issuedPurchaseOrders ?? 0} href='/purchase-orders?status=Issued' />
          <StatusRow icon='tabler-package'       color={ORANGE}  label='Partial Received'  count={stats.partialReceivedPurchaseOrders ?? 0} href='/purchase-orders?status=Partial Received' />
          <StatusRow icon='tabler-package-import' color={COLORS.successGreen} label='Received Complete' count={stats.receivedCompletePurchaseOrders ?? 0} href='/purchase-orders?status=Received Complete' />
        </ExpandableSection>

      </div>
    </div>
  )
}
