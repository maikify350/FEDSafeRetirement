import type { Metadata } from 'next'
import ConfigurationView from '@/views/configuration/ConfigurationView'

export const metadata: Metadata = {
  title: 'Configuration - FEDSafe Retirement',
  description: 'System configuration, lookups, and settings'
}

export default function ConfigurationPage() {
  return <ConfigurationView />
}
