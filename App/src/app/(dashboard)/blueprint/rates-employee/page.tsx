import type { Metadata } from 'next'
import RatesEmployeeView from '@/views/blueprint/RatesEmployeeView'

export const metadata: Metadata = {
  title: 'FEGLI Rates Employees - Blueprint - FEDSafe Retirement',
  description: 'View and manage FEGLI insurance rate tables for employees'
}

export default function RatesEmployeePage() {
  return <RatesEmployeeView />
}
