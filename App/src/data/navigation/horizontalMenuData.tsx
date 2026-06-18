// Type Imports
import type { HorizontalMenuDataType } from '@/types/menuTypes'

const horizontalMenuData = (): HorizontalMenuDataType[] => [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'tabler-dashboard'
  },
  {
    label: 'Leads',
    href: '/leads',
    icon: 'tabler-users-group'
  },
  {
    label: 'Collections',
    href: '/collections',
    icon: 'tabler-folders'
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: 'tabler-settings'
  }
]

export default horizontalMenuData
