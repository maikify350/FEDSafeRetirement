import type { Metadata } from 'next'
import CompanyView from '@/views/company/CompanyView'

export const metadata: Metadata = { title: 'Company Settings' }

export default function Page() {
  return <CompanyView />
}
