import type { Metadata } from 'next'
import AgentAssignmentView from '@/views/agent-assignment/AgentAssignmentView'

export const metadata: Metadata = {
  title: 'Agent Assignment – FedSafe Retirement',
}

export default function AgentAssignmentPage() {
  return <AgentAssignmentView />
}
