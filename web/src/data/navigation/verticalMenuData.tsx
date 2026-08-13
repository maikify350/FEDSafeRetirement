import type { VerticalMenuDataType } from '@/types/menuTypes'

const verticalMenuData = (): VerticalMenuDataType[] => [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'tabler-layout-dashboard'
  },
  {
    label: 'Activity',
    href: '/activity',
    icon: 'tabler-activity'
  },
  { label: 'divider' } as unknown as VerticalMenuDataType,
  {
    label: 'Clients',
    href: '/clients',
    icon: 'tabler-users'
  },
  {
    label: 'Jobs',
    href: '/jobs',
    icon: 'tabler-tool'
  },
  {
    label: 'Quotes',
    href: '/quotes',
    icon: 'tabler-file-description'
  },
  {
    label: 'Invoices',
    href: '/invoices',
    icon: 'tabler-receipt'
  },
  {
    label: 'Requests',
    href: '/requests',
    icon: 'tabler-clipboard-list'
  },
  { label: 'divider' } as unknown as VerticalMenuDataType,
  {
    label: 'Vendors',
    href: '/vendors',
    icon: 'tabler-building-store'
  },
  {
    label: 'Purchase Orders',
    href: '/purchase-orders',
    icon: 'tabler-shopping-cart'
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: 'tabler-file-analytics'
  },
  { label: 'divider' } as unknown as VerticalMenuDataType,
  {
    label: 'Team',
    href: '/team',
    icon: 'tabler-user-check'
  },
  {
    label: 'Service Items',
    href: '/service-items',
    icon: 'tabler-package'
  },
  {
    label: 'Site Equipment',
    href: '/site-equipment',
    icon: 'tabler-device-desktop-analytics'
  },
  {
    label: 'Solutions',
    href: '/solutions',
    icon: 'tabler-bulb'
  },
  {
    label: 'Fleet',
    href: '/fleet',
    icon: 'tabler-car'
  },
  { label: 'divider' } as unknown as VerticalMenuDataType,
  {
    label: 'Configuration',
    href: '/configuration',
    icon: 'tabler-adjustments-horizontal'
  },
  {
    label: 'Settings',
    icon: 'tabler-settings',
    children: [
      { label: 'Company Settings', href: '/admin/company', icon: 'tabler-building' },
      { label: 'Tax Codes', href: '/admin/tax-codes', icon: 'tabler-calculator' },
      { label: 'Subscribers', href: '/admin/subscribers', icon: 'tabler-id' },
      { label: 'Referrals', href: '/admin/referrals', icon: 'tabler-share' },
      { label: 'Feedback', href: '/admin/feedback', icon: 'tabler-message' },
      { label: 'Templates', href: '/admin/templates', icon: 'tabler-file-text' },
    ]
  }
]

export default verticalMenuData
