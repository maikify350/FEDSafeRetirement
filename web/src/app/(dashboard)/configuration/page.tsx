import ConfigurationView from '@/views/configuration/ConfigurationView'

export const metadata = {
  title: 'Configuration — JobMaster',
  description: 'Manage configurable lookup values used across the JobMaster platform.',
}

export default function ConfigurationPage() {
  return <ConfigurationView />
}
