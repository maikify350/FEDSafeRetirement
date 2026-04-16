import type { Metadata } from 'next'
import RatesView from '@/views/blueprint/RatesView'

export const metadata: Metadata = {
  title: 'FEGLI Rates - Blueprint - FEDSafe Retirement',
  description: 'View and manage FEGLI insurance rate tables'
}

export default function RatesPage() {
  return <RatesView />
}
