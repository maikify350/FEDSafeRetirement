import type { Metadata } from 'next'
import BracketsView from '@/views/blueprint/BracketsView'

export const metadata: Metadata = {
  title: 'IRS Tax Brackets - Blueprint - FEDSafe Retirement',
  description: 'View and manage IRS 2026 tax bracket reference data'
}

export default function BracketsPage() {
  return <BracketsView />
}
