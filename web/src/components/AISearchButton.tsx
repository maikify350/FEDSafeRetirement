'use client'

import { useState, useRef, useCallback } from 'react'
import Popover from '@mui/material/Popover'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import InputAdornment from '@mui/material/InputAdornment'
import Box from '@mui/material/Box'
import { api } from '@/lib/api'

export type AISearchAction =
  | { action: 'filter'; filters: Record<string, string>; message: string }
  | { action: 'open_edit'; search: string; message: string }
  | { action: 'clarify'; message: string }

type Props = {
  /** Entity name matching backend schema key: 'clients' | 'jobs' | 'quotes' | 'invoices' */
  entityName: string
  /** Called when AI returns a filter or open_edit action */
  onResult: (result: AISearchAction) => void
}

/**
 * Global reusable AI search button for any entity list page.
 * Shows a sparkle/brain icon that opens a popover with a text field.
 * Supports voice input via Web Speech API (Chrome/Edge).
 *
 * Usage:
 * <AISearchButton entityName="clients" onResult={handleAIResult} />
 */
const AISearchButton = ({ entityName, onResult }: Props) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const open = Boolean(anchorEl)

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget)
    setStatusMessage('')
    setQuery('')
  }

  const handleClose = () => {
    setAnchorEl(null)
    stopListening()
  }

  // Web Speech API voice input
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setStatusMessage('Voice input not supported in this browser. Try Chrome or Edge.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setQuery(transcript)
    }
    recognition.onerror = () => {
      setListening(false)
      setStatusMessage('Voice recognition failed. Please type your query.')
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const handleSearch = async () => {
    if (!query.trim() || loading) return
    setLoading(true)
    setStatusMessage('Thinking...')

    try {
      const result = await api.post<AISearchAction>('/api/ai/entity-search', {
        entity: entityName,
        query: query.trim()
      })

      setStatusMessage(result.message || '')

      if (result.action === 'filter' || result.action === 'open_edit') {
        onResult(result)
        // Auto-close after a short delay so user sees the status message
        setTimeout(() => handleClose(), 800)
      }
    } catch {
      setStatusMessage('AI search unavailable. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Tooltip title='AI Search — ask in plain English' placement='top'>
        <IconButton
          onClick={handleOpen}
          size='small'
          sx={{
            color: open ? 'primary.main' : 'text.secondary',
            background: open ? 'var(--mui-palette-primary-lightOpacity)' : 'transparent',
            '&:hover': { color: 'primary.main', background: 'var(--mui-palette-primary-lightOpacity)' },
            transition: 'all 0.2s'
          }}
        >
          <i className='tabler-sparkles text-[20px]' />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 380, p: 3, borderRadius: 2 } }}
      >
        {/* Header */}
        <Box className='flex items-center gap-2 mb-3'>
          <i className='tabler-sparkles text-primary text-[20px]' />
          <Typography variant='h6' fontSize={15}>
            AI Search
          </Typography>
        </Box>

        <Typography variant='body2' color='text.secondary' className='mb-3'>
          Ask in plain English — e.g. <em>"show commercial clients in Virginia"</em> or <em>"edit Mike Smith"</em>
        </Typography>

        {/* Input */}
        <TextField
          fullWidth
          placeholder={`Search ${entityName}...`}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          autoFocus
          size='small'
          disabled={loading}
          InputProps={{
            endAdornment: (
              <InputAdornment position='end'>
                {/* Mic button */}
                <Tooltip title={listening ? 'Stop listening' : 'Dictate your query'}>
                  <IconButton
                    size='small'
                    onClick={listening ? stopListening : startListening}
                    sx={{ color: listening ? 'error.main' : 'text.secondary' }}
                  >
                    <i className={`tabler-${listening ? 'microphone-off' : 'microphone'} text-[17px]`} />
                  </IconButton>
                </Tooltip>
                {/* Search button */}
                <Tooltip title='Search (Enter)'>
                  <span>
                    <IconButton
                      size='small'
                      onClick={handleSearch}
                      disabled={!query.trim() || loading}
                      sx={{ color: 'primary.main' }}
                    >
                      {loading
                        ? <CircularProgress size={16} />
                        : <i className='tabler-arrow-right text-[17px]' />
                      }
                    </IconButton>
                  </span>
                </Tooltip>
              </InputAdornment>
            )
          }}
        />

        {/* Status message */}
        {statusMessage && (
          <Typography
            variant='body2'
            color={statusMessage.includes('unavailable') || statusMessage.includes('failed') ? 'error' : 'text.secondary'}
            className='mt-2'
          >
            {statusMessage}
          </Typography>
        )}
      </Popover>
    </>
  )
}

export default AISearchButton
