import type { Metadata } from 'next'

import NewsletterView from '@/views/newsletter/NewsletterView'

export const metadata: Metadata = {
  title: 'Newsletter - FEDSafe Retirement',
  description: 'View and manage newsletter subscribers'
}

export default function NewsletterPage() {
  return <NewsletterView />
}
