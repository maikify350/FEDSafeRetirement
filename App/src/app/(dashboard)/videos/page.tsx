import type { Metadata } from 'next'

import VideosView from '@/views/videos/VideosView'

export const metadata: Metadata = {
  title: 'Videos | FEDSafe Retirement',
  description: 'Control plane for FEDSafe Retirement video production, narration scripts, ElevenLabs voices, and gallery asset sequences.',
}

export default function VideosPage() {
  return <VideosView />
}
