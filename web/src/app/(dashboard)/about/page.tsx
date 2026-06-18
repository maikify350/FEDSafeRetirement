import type { Metadata } from 'next'
import AboutView from '@/views/about/AboutView'

export const metadata: Metadata = { title: 'About | JobMaster' }

export default function Page() {
  return <AboutView />
}
