import type { Metadata } from 'next'

import GalleryView from '@/views/gallery/GalleryView'

export const metadata: Metadata = {
  title: 'Media Gallery | FEDSafe Retirement',
  description: 'Asset gallery for FEDSafe Retirement reference images, video clips, and media storage.',
}

export default function GalleryPage() {
  return <GalleryView />
}
