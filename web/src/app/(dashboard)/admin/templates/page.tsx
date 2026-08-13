import TemplatesView from '@/views/templates/TemplatesView'

export const metadata = {
  title: 'Templates | JobMaster',
  description: 'Create and manage reusable templates for emails, invoices, and reports.',
}

export default function TemplatesPage() {
  return <TemplatesView />
}
