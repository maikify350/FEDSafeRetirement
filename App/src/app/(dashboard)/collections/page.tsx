import type { Metadata } from 'next'
import CollectionsView from '@/views/collections/CollectionsView'

export const metadata: Metadata = {
  title: 'Collections - FEDSafe Retirement',
  description: 'Manage lead collections and campaigns'
}

export default function CollectionsPage() {
  return <CollectionsView />
}
