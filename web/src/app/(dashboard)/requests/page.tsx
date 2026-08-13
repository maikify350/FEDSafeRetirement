import type { Metadata } from 'next'
import RequestsView from '@/views/requests/RequestsView'

export const metadata: Metadata = { title: 'Requests' }

export default function Page() {
  return <RequestsView />
}
