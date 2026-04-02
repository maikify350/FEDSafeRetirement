import type { Metadata } from 'next'
import VendorsView from '@/views/vendors/VendorsView'

export const metadata: Metadata = { title: 'Vendors' }

export default function Page() {
  return <VendorsView />
}
