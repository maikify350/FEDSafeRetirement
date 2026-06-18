import type { Metadata } from 'next'
import ReferralView from '@/views/admin/ReferralView'

export const metadata: Metadata = { title: 'Refer a Friend — JobMaster' }

export default function Page() {
  return <ReferralView />
}
