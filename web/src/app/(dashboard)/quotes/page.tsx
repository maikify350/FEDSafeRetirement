import type { Metadata } from 'next'
import QuotesView from '@/views/quotes/QuotesView'

export const metadata: Metadata = { title: 'Quotes' }

export default function Page() {
  return <QuotesView />
}
