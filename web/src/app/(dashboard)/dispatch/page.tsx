import type { Metadata } from 'next'
import DispatchView from '@/views/dispatch/DispatchView'

export const metadata: Metadata = {
  title: 'Dispatch',
  description: 'Field service dispatch board for job assignments and real-time tracking'
}

export default function DispatchPage() {
  return <DispatchView />
}
