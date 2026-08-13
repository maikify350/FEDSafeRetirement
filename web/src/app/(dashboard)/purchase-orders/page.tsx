import type { Metadata } from 'next'
import PurchaseOrdersView from '@/views/purchase-orders/PurchaseOrdersView'

export const metadata: Metadata = { title: 'Purchase Orders' }

export default function Page() {
  return <PurchaseOrdersView />
}
