import type { Metadata } from 'next'
import EventCheckInView from '@/views/event-checkin/EventCheckInView'

export const metadata: Metadata = {
  title: 'Event Check-In – FedSafe Retirement',
  description: 'Mobile-first event check-in for tracking attendees, guests, and leads.',
}

export default function EventCheckInPage() {
  return <EventCheckInView />
}
