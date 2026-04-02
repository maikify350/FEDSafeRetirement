'use client'

/**
 * useDrawerExplainer — sets the drawer audio override in context
 *
 * When `open` → true:  sets drawerAudioUrl in VoiceExplainerContext
 *                       VoiceExplainerPlayer picks it up and auto-plays after 600ms
 * When `open` → false: clears drawerAudioUrl → player falls back to route audio
 *
 * Does NOT call useVoiceExplainerAudio directly — VoiceExplainerPlayer is the
 * sole consumer so the audio singleton is never contested.
 *
 * Usage:
 *   useDrawerExplainer('ClientEditDrawer', open)
 */

import { useEffect } from 'react'
import { useVoiceExplainer } from '@/lib/state/voice-explainer-store'
import { DRAWER_AUDIO } from '@/components/VoiceExplainerPlayer'

export function useDrawerExplainer(
  drawerKey: keyof typeof DRAWER_AUDIO,
  open: boolean
) {
  const { enabled, setDrawerAudio } = useVoiceExplainer()

  useEffect(() => {
    if (!enabled) return

    if (open) {
      // Set context override — VoiceExplainerPlayer will swap to drawer audio
      setDrawerAudio(DRAWER_AUDIO[drawerKey] ?? null)
    } else {
      // Clear override — player falls back to route audio (ready to play)
      setDrawerAudio(null)
    }

    // On unmount (e.g. component removed) also clear
    return () => { if (open) setDrawerAudio(null) }
  }, [open, enabled, drawerKey]) // eslint-disable-line react-hooks/exhaustive-deps
}
