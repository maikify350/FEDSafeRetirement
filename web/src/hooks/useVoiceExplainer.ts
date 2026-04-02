'use client'

/**
 * useVoiceExplainerAudio — Web Audio playback hook
 *
 * Wraps the HTML5 Audio API: play / pause / restart / seek + progress.
 * Uses a module-level singleton so audio survives route navigation.
 * Also registers the stop callback with VoiceExplainerProvider.
 *
 * @param audioUrl  Public URL of the MP3 to play, or null for no explainer.
 */

import { useEffect, useState, useCallback } from 'react'
import { useVoiceExplainer } from '@/lib/state/voice-explainer-store'

// ─── Module-level singleton ───────────────────────────────────────────────────
let gAudio: HTMLAudioElement | null = null

type ProgressListener = (currentTime: number, duration: number) => void
type PlayingListener  = (playing: boolean) => void

const progressListeners = new Set<ProgressListener>()
const playingListeners  = new Set<PlayingListener>()

function notifyProgress(c: number, d: number) { progressListeners.forEach(fn => fn(c, d)) }
function notifyPlaying(p: boolean)             { playingListeners.forEach(fn => fn(p)) }

// ─── Helper: fully stop & destroy current audio ──────────────────────────────
function stopGlobal() {
  if (!gAudio) return
  gAudio.pause()
  gAudio.src = ''   // detach media resource
  gAudio.load()     // abort any pending network request
  gAudio = null
  // Synchronously reset ALL listeners — no browser event needed
  notifyPlaying(false)
  notifyProgress(0, 0)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useVoiceExplainerAudio(audioUrl: string | null | undefined) {
  const { registerStop } = useVoiceExplainer()
  const [isPlaying,   setIsPlaying]   = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)

  // Subscribe to global state notifications
  useEffect(() => {
    const onProgress: ProgressListener = (c, d) => { setCurrentTime(c); setDuration(d) }
    const onPlaying:  PlayingListener  = (p) => setIsPlaying(p)
    progressListeners.add(onProgress)
    playingListeners.add(onPlaying)
    return () => {
      progressListeners.delete(onProgress)
      playingListeners.delete(onPlaying)
    }
  }, [])

  // Register stop fn with provider so disabling explainers stops audio
  useEffect(() => {
    registerStop(() => {
      stopGlobal()
    })
  }, [registerStop])

  // Load (or swap) audio when URL changes
  useEffect(() => {
    // ── Case 1: no explainer for this route ───────────────────────────────────
    if (!audioUrl) {
      stopGlobal()
      return
    }

    // ── Case 2: same file — just sync UI to current element state ─────────────
    if (gAudio && gAudio.dataset['src'] === audioUrl) {
      // Sync state with whatever the singleton is doing right now
      notifyPlaying(!gAudio.paused)
      notifyProgress(gAudio.currentTime, gAudio.duration || 0)
      return
    }

    // ── Case 3: new URL — kill whatever is playing, load fresh ────────────────
    stopGlobal()  // ← synchronous reset: isPlaying → false, time → 0

    const audio = new Audio(audioUrl)
    audio.dataset['src'] = audioUrl
    audio.preload = 'metadata'
    gAudio = audio

    audio.addEventListener('loadedmetadata', () =>
      notifyProgress(audio.currentTime, audio.duration)
    )
    audio.addEventListener('timeupdate', () =>
      notifyProgress(audio.currentTime, audio.duration || 0)
    )
    audio.addEventListener('play',  () => notifyPlaying(true))
    audio.addEventListener('pause', () => notifyPlaying(false))
    audio.addEventListener('ended', () => {
      audio.currentTime = 0
      notifyPlaying(false)
      notifyProgress(0, audio.duration || 0)
    })
  }, [audioUrl])

  const play = useCallback(() => {
    gAudio?.play().catch(console.error)
  }, [])

  const pause = useCallback(() => {
    gAudio?.pause()
  }, [])

  const restart = useCallback(() => {
    if (gAudio) { gAudio.currentTime = 0; gAudio.play().catch(console.error) }
  }, [])

  const seek = useCallback((seconds: number) => {
    if (gAudio) gAudio.currentTime = seconds
  }, [])

  return { isPlaying, currentTime, duration, play, pause, restart, seek }
}
