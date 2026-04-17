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
    label: 'LEAD FUNNEL'
  },
  {
    label: 'Lead Funnel',
    href: '/lead-funnel',
    icon: 'tabler-filter'
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
    label: 'FEGLI Rates',
    icon: 'tabler-heart-rate-monitor',
    children: [
      {
        label: 'Employee',
        href: '/blueprint/rates-employee',
        icon: 'tabler-user-heart',
      },
      {
        label: 'Annuitant',
        href: '/blueprint/rates-annuitant',
        icon: 'tabler-old',
      },
    ],
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
