'use client'

/**
 * useVoiceExplainerAudio — Web Audio playback hook
 *
 * Ported from LetterGenie/apps/letter-ai/src/hooks/useVoiceExplainer.ts
 *
 * Key design decisions:
 *   • Module-level singleton audio element — NOT in React state.
 *     Eliminates re-render loops from state-driven Audio objects.
 *   • Pub-sub: components subscribe to progress/playing events.
 *     React state updates come from browser audio events only.
 *   • Effect dependency is ONLY the audio URL — playing state never
 *     feeds back into the load effect, so the loop is impossible.
 *
 * @param audioUrl  Public URL of the MP3 to play, or null/undefined for none.
 */

import { useEffect, useState, useCallback } from 'react'

// ── Module-level singleton ────────────────────────────────────────────────────
let gAudio: HTMLAudioElement | null = null

type ProgressListener = (currentTime: number, duration: number) => void
type PlayingListener  = (playing: boolean) => void

const progressListeners = new Set<ProgressListener>()
const playingListeners  = new Set<PlayingListener>()

function notifyProgress(c: number, d: number) { progressListeners.forEach(fn => fn(c, d)) }
function notifyPlaying(p: boolean)            { playingListeners.forEach(fn => fn(p)) }

/** Fully stop & destroy the current audio element. Idempotent. */
export function stopVoiceExplainer() {
  if (!gAudio) return
  gAudio.pause()
  gAudio.src = ''
  gAudio.load()
  gAudio = null
  notifyPlaying(false)
  notifyProgress(0, 0)
}

export function useVoiceExplainerAudio(audioUrl: string | null | undefined) {
  const [isPlaying,   setIsPlaying]   = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)

  // Subscribe to global audio events
  useEffect(() => {
    const onProgress: ProgressListener = (c, d) => { setCurrentTime(c); setDuration(d) }
    const onPlaying:  PlayingListener  = (p) => setIsPlaying(p)
    progressListeners.add(onProgress)
    playingListeners.add(onPlaying)
    return () => { progressListeners.delete(onProgress); playingListeners.delete(onPlaying) }
  }, [])

  // Load (or swap) audio when URL changes — URL is the ONLY dependency
  useEffect(() => {
    if (!audioUrl) { stopVoiceExplainer(); return }

    // Same file already loaded — just sync UI state
    if (gAudio && gAudio.dataset['src'] === audioUrl) {
      notifyPlaying(!gAudio.paused)
      notifyProgress(gAudio.currentTime, gAudio.duration || 0)
      return
    }

    // New URL — destroy previous, load fresh
    stopVoiceExplainer()
    const audio = new Audio(audioUrl)
    audio.dataset['src'] = audioUrl
    audio.preload = 'metadata'
    gAudio = audio

    audio.addEventListener('loadedmetadata', () => notifyProgress(audio.currentTime, audio.duration))
    audio.addEventListener('timeupdate',     () => notifyProgress(audio.currentTime, audio.duration || 0))
    audio.addEventListener('play',           () => notifyPlaying(true))
    audio.addEventListener('pause',          () => notifyPlaying(false))
    audio.addEventListener('ended',          () => {
      audio.currentTime = 0
      notifyPlaying(false)
      notifyProgress(0, audio.duration || 0)
    })
  }, [audioUrl])

  const play    = useCallback(() => { gAudio?.play().catch(e => console.error('Explainer play failed:', e)) }, [])
  const pause   = useCallback(() => { gAudio?.pause() }, [])
  const restart = useCallback(() => { if (gAudio) { gAudio.currentTime = 0; gAudio.play().catch(console.error) } }, [])
  const seek    = useCallback((s: number) => { if (gAudio) gAudio.currentTime = s }, [])

  return { isPlaying, currentTime, duration, play, pause, restart, seek }
}
