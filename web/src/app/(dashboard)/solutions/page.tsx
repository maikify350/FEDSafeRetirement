import type { Metadata } from 'next'
import SolutionsView from '@/views/solutions/SolutionsView'

export const metadata: Metadata = { title: 'Solutions — JobMaster' }

export default function Page() {
  return <SolutionsView />
}
