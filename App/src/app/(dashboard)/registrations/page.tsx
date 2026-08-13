import type { Metadata } from 'next'

import RegistrationsView from '@/views/registrations/RegistrationsView'

export const metadata: Metadata = {
  title: 'Registrations – FedSafe Retirement',
  description: 'Seminar registration leads captured by the echowin AI phone agent.',
}

export default function RegistrationsPage() {
  return <RegistrationsView />
}
