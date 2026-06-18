import type { Metadata } from 'next'
import CalendarView from '@/views/calendar/CalendarView'

export const metadata: Metadata = { title: 'Calendar' }

export default function Page() {
  return <CalendarView />
}
