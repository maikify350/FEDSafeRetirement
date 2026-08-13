'use client'

import { useState, useEffect, useRef } from 'react'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'

interface DictationButtonProps {
  onTranscript: (text: string) => void
  size?: 'small' | 'medium' | 'large'
}

/**
 * Speech-to-text dictation button using the Web Speech API.
 * Renders a microphone icon with pulsing animation when actively listening.
 * Gracefully hides if the browser doesn't support SpeechRecognition.
 *
 * @module components/DictationButton
 */
export default function DictationButton({ onTranscript, size = 'small' }: DictationButtonProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Check if browser supports Web Speech API
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      setIsSupported(!!SpeechRecognition)

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join(' ')
          onTranscript(transcript)
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current = recognition
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [onTranscript])

  const toggleListening = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  if (!isSupported) {
    return null // Don't show button if not supported
  }

  return (
    <Tooltip title={isListening ? 'Stop dictation' : 'Start dictation (speech-to-text)'}>
      <IconButton
        onClick={toggleListening}
        size={size}
        sx={{
          color: isListening ? 'error.main' : 'primary.main',
          animation: isListening ? 'pulse 1.5s ease-in-out infinite' : 'none',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.5 }
          }
        }}
      >
        <i className={isListening ? 'tabler-microphone-filled' : 'tabler-microphone'} />
      </IconButton>
    </Tooltip>
  )
}
