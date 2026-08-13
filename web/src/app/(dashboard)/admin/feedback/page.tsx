import type { Metadata } from 'next'
import FeedbackView from '@/views/admin/FeedbackView'

export const metadata: Metadata = { title: 'Feedback & Suggestions — JobMaster' }

export default function Page() {
  return <FeedbackView />
}
