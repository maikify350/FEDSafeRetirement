import type { Metadata } from 'next'
import UsersView from '@/views/users/UsersView'

export const metadata: Metadata = {
  title: 'User Management - FEDSafe Retirement',
  description: 'Manage application users and roles'
}

export default function UsersPage() {
  return <UsersView />
}
