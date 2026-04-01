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
    label: 'LEADS'
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
    label: 'New Collection',
    href: '/collections/new',
    icon: 'tabler-folder-plus'
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
    label: 'User Management',
    href: '/users',
    icon: 'tabler-user-cog',
    // TODO: conditionally show based on admin role
  }
]

export default verticalMenuData
