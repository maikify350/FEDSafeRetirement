import type { Metadata } from 'next'
import RatesAnnuitantView from '@/views/blueprint/RatesAnnuitantView'

export const metadata: Metadata = {
  title: 'FEGLI Rates Annuitants - Blueprint - FEDSafe Retirement',
  description: 'View and manage FEGLI insurance rate tables for annuitants'
}

export default function RatesAnnuitantPage() {
  return <RatesAnnuitantView />
}
