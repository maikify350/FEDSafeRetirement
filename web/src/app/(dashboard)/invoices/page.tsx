import type { Metadata } from 'next'
import InvoicesView from '@/views/invoices/InvoicesView'

export const metadata: Metadata = { title: 'Invoices' }

export default function Page() {
  return <InvoicesView />
}
