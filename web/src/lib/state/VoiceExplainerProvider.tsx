'use client'

import { useCallback, useState, type ReactNode } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import { VoiceExplainerContext } from '@/lib/state/voice-explainer-store'

let _stopFn: (() => void) | undefined

export function VoiceExplainerProvider({ children }: { children: ReactNode }): ReactNode {
  const [enabled, setEnabledRaw] = useLocalStorage<boolean>('voice-explainer-enabled', false)
  const [drawerAudioUrl, setDrawerAudio] = useState<string | null>(null)

  const stopAudio = useCallback(() => { _stopFn?.() }, [])

  const setEnabled = useCallback((v: boolean) => {
    if (!v) { stopAudio(); setDrawerAudio(null) }
    setEnabledRaw(v)
  }, [setEnabledRaw, stopAudio])

  const registerStop = useCallback((fn: () => void) => { _stopFn = fn }, [])

  return (
    <VoiceExplainerContext.Provider value={{ enabled, setEnabled, stopAudio, registerStop, drawerAudioUrl, setDrawerAudio }}>
      {children}
    </VoiceExplainerContext.Provider>
  )
}
