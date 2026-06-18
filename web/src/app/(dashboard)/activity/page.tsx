import type { Metadata } from 'next'
import ActivityFeedView from '@/views/activity/ActivityFeedView'

export const metadata: Metadata = { title: 'Activity Feed — JobMaster' }

export default function Page() {
  return <ActivityFeedView />
}
