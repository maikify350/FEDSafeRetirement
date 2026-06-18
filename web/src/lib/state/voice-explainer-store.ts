'use client'

/**
 * Voice Explainer context
 *
 * Two-explainer-per-entity model:
 *   • Route audio  — plays when on a list/view page (stored in EXPLAINER_ROUTES)
 *   • Drawer audio — plays when an edit drawer is open (stored in DRAWER_AUDIO)
 *
 * Drawers set `drawerAudioUrl` in context. VoiceExplainerPlayer prefers
 * that over the route URL, so only ONE consumer ever drives useVoiceExplainerAudio.
 */

import { createContext, useContext } from 'react'

export interface VoiceExplainerCtx {
  enabled: boolean
  setEnabled: (v: boolean) => void
  stopAudio: () => void
  registerStop: (fn: () => void) => void
  /** Set by edit drawers — overrides route audio while drawer is open */
  drawerAudioUrl: string | null
  setDrawerAudio: (url: string | null) => void
}

export const VoiceExplainerContext = createContext<VoiceExplainerCtx>({
  enabled: false,
  setEnabled: () => {},
  stopAudio:  () => {},
  registerStop: () => {},
  drawerAudioUrl: null,
  setDrawerAudio: () => {},
})

export const useVoiceExplainer        = () => useContext(VoiceExplainerContext)
export const useVoiceExplainerEnabled = () => useContext(VoiceExplainerContext).enabled
export const useToggleVoiceExplainer  = () => useContext(VoiceExplainerContext).setEnabled
