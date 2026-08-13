import type { Metadata } from 'next'
import ClientsView from '@views/clients/ClientsView'

export const metadata: Metadata = { title: 'Clients' }

export default function Page() {
  return <ClientsView />
}
