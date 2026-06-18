import type { Metadata } from 'next'

import EchoLeadsView from '@/views/echo-leads/EchoLeadsView'

export const metadata: Metadata = {
  title: 'Echo Leads – FedSafe Retirement',
  description: 'Seminar registration leads captured by the echowin AI phone agent.',
}

export default function EchoLeadsPage() {
  return <EchoLeadsView />
}
