import type { Metadata } from 'next'
import FormsView from '@/views/forms/FormsView'

export const metadata: Metadata = {
  title: 'Federal Forms Library - FEDSafe Retirement',
  description: 'View, manage, and preview federal retirement forms including FEGLI, FERS, and FEHB documents.'
}

export default function FormsPage() {
  return <FormsView />
}
