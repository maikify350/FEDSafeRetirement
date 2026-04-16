// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'

const verticalMenuData = (): VerticalMenuDataType[] => [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'tabler-dashboard'
  },
  {
    isSection: true,
    label: 'USPS LEADS'
  },
  {
    label: 'Lead Search',
    href: '/leads',
    icon: 'tabler-users-group'
  },
  {
    isSection: true,
    label: 'CAMPAIGNS'
  },
  {
    label: 'Collections',
    href: '/collections',
    icon: 'tabler-folders'
  },
  {
    isSection: true,
    label: 'AGENTS'
  },
  {
    label: 'Events',
    href: '/events',
    icon: 'tabler-calendar-event'
  },
  {
    label: 'Event Check-In',
    href: '/event-checkin',
    icon: 'tabler-clipboard-check'
  },
  {
    isSection: true,
    label: 'BLUEPRINT'
  },
  {
    label: 'Rates',
    href: '/blueprint/rates',
    icon: 'tabler-heart-rate-monitor',
  },
  {
    label: 'Brackets',
    href: '/blueprint/brackets',
    icon: 'tabler-receipt-tax',
  },
  {
    isSection: true,
    label: 'ACCOUNT'
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: 'tabler-settings'
  },
  {
    label: 'Configuration',
    href: '/configuration',
    icon: 'tabler-adjustments-horizontal'
  },
  {
    label: 'User Management',
    href: '/users',
    icon: 'tabler-user-cog',
    // TODO: conditionally show based on admin role
  },
  {
    isSection: true,
    label: 'DEV TOOLS'
  },
  {
    label: 'Swagger',
    href: '/api/swagger',
    icon: 'tabler-api',
    target: '_blank',
  }
]

export default verticalMenuData
