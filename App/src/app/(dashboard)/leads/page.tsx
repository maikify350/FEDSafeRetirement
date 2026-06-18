import type { Metadata } from 'next'
import LeadsView from '@/views/leads/LeadsView'

export const metadata: Metadata = {
  title: 'Lead Search - FEDSafe Retirement',
  description: 'Search and filter federal employee leads'
}

export default function LeadsPage() {
  return <LeadsView />
}
