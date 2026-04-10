import type { Metadata } from 'next'
import EventsView from '@/views/events/EventsView'

export const metadata: Metadata = {
  title: 'Events – FedSafe Retirement',
  description: 'Manage and assign events by state and city territory.',
}

export default function EventsPage() {
  return <EventsView />
}
