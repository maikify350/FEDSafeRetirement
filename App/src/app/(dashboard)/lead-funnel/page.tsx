import type { Metadata } from 'next'
import LeadFunnelView from '@/views/funnel/LeadFunnelView'

export const metadata: Metadata = {
  title: 'Lead Funnel - FEDSafe Retirement',
  description: 'View and manage incoming leads from webhook providers'
}

export default function LeadFunnelPage() {
  return <LeadFunnelView />
}
