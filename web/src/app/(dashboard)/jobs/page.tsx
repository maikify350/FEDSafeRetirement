import type { Metadata } from 'next'
import JobsView from '@/views/jobs/JobsView'

export const metadata: Metadata = { title: 'Jobs' }

export default function Page() {
  return <JobsView />
}
