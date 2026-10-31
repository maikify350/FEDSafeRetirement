import type { Metadata } from 'next'

import ExplainerStudioView from '@/views/explainer/ExplainerStudioView'

export const metadata: Metadata = {
  title: 'Explainer Studio | FEDSafe Retirement',
  description: 'Generate immersive explainer videos for YouTube, Shorts, Instagram and TikTok: topic brief → script → hyperframe storyboard → Hyperframes / Higgsfield / Krea prompts.',
}

export default function ExplainerStudioPage() {
  return <ExplainerStudioView />
}
