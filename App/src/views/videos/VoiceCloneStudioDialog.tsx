'use client'

import { useState, useRef, useEffect } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Card from '@mui/material/Card'

interface VoiceCloneStudioDialogProps {
  open: boolean
  onClose: () => void
  onVoiceCloned?: (voice: { voice_id: string; name: string }) => void
}

const SCRIPT_SECTIONS = [
  {
    title: '1. Warm Hook & Introduction',
    cue: 'Conversational · Warm · Confident',
    duration: '30s',
    text: 'Hello everyone, I’m Mike Zaino, founding partner at FEDSafe Retirement. If you’re a federal employee under FERS or CSRS, whether you’ve served five years or thirty-five years, let me ask you an honest question: Do you know the exact date you can walk away with your full pension and keep your health insurance for life? Most feds think their agency HR has everything handled. But the truth is, nobody cares more about your retirement paycheck than you do.',
  },
  {
    title: '2. Numbers & Percentages',
    cue: 'Authoritative · Technical precision',
    duration: '45s',
    text: 'Let’s look at the hard numbers. In 2026, calculating your High-Three average isn’t just your base salary — you need to factor in locality pay and special rate tables. If you retire at your Minimum Retirement Age of 57 with 30 years of service, you receive an immediate unreduced annuity at 1.0% per year. But if you wait until age 62 with 20 years, your multiplier jumps by 10% to 1.1% across your entire career. On a $115,000 High-Three, that single percentage change can mean an extra $2,300 every single year for the rest of your life.',
  },
  {
    title: '3. Cautionary Warning (FEGLI & FEHB)',
    cue: 'Urgent · Warning shift',
    duration: '45s',
    text: 'Now, here is the hidden trap that shocks federal retirees every month: FEGLI Option B. When you hit age 50, then 55, and 60, the rate schedule doubles and triples. By age 65, maintaining five multiples can consume over $800 a month directly out of your annuity check! And don’t forget the strict FEHB 5-Year Rule. If you haven’t been continuously enrolled in Federal Employees Health Benefits or Postal Service Health Benefits for the five consecutive years immediately preceding retirement, you lose your coverage forever on your retirement date.',
  },
  {
    title: '4. Empathy & TSP Strategy',
    cue: 'Empathetic · Reassuring advisor',
    duration: '40s',
    text: 'I understand how confusing this can be. Looking at the TSP C-Fund, S-Fund, and G-Fund, wondering when to rebalance out of equities and how to avoid the 10% early withdrawal penalty under the Rule of 55 — it can feel overwhelming. But you didn’t work thirty years for the government just to leave your financial security to guesswork. You deserve clarity, peace of mind, and a customized blueprint built specifically for your agency.',
  },
  {
    title: '5. Call to Action (CTA)',
    cue: 'Warm · Confident Invitation',
    duration: '20s',
    text: 'Reach out to our team at FEDSafeRetirement.com or call us directly at (774) 273-8473. Request your complimentary, zero-cost Federal Retirement Blueprint today. Let’s make sure your retirement is completely protected, fully funded, and built to last.',
  },
]

export default function VoiceCloneStudioDialog({ open, onClose, onVoiceCloned }: VoiceCloneStudioDialogProps) {
  const [selectedSection, setSelectedSection] = useState<number | 'all'>('all')
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordDuration, setRecordDuration] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [cloning, setCloning] = useState(false)
  const [clonedVoice, setClonedVoice] = useState<{ voice_id: string; name: string } | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Start in-browser microphone recording
  const startRecording = async () => {
    setError('')
    setRecordedBlob(null)
    setAudioUrl(null)
    setSelectedFile(null)
    setRecordDuration(0)
    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setRecordedBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((track) => track.stop())
      }

      recorder.start(250)
      setIsRecording(true)

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1)
      }, 1000)
    } catch (err: any) {
      setError(err.message || 'Microphone access denied. Please allow microphone permissions or upload an audio file.')
    }
  }

  // Stop in-browser recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  // Handle uploaded file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setRecordedBlob(null)
      setAudioUrl(URL.createObjectURL(file))
      setError('')
    }
  }

  // Submit to Voice Cloning API
  const handleCloneVoice = async () => {
    const audioToUpload = selectedFile || recordedBlob
    if (!audioToUpload) {
      setError('Please record audio or upload an audio file first.')
      return
    }

    setCloning(true)
    setError('')

    const formData = new FormData()
    formData.append('file', audioToUpload, selectedFile?.name || 'mike_zaino_recording.webm')
    formData.append('name', 'Mike Zaino (Official)')
    formData.append('description', 'Founding Senior Partner Mike Zaino custom cloned voice')

    try {
      const res = await fetch('/api/voices/clone', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Cloning failed')

      setClonedVoice({ voice_id: data.voice_id, name: data.name })
      if (onVoiceCloned) onVoiceCloned({ voice_id: data.voice_id, name: data.name })
    } catch (err: any) {
      setError(err.message || 'Failed to clone voice with ElevenLabs.')
    } finally {
      setCloning(false)
    }
  }

  // Copy full script
  const handleCopyFullScript = () => {
    const fullText = SCRIPT_SECTIONS.map((s) => `[${s.title} (${s.cue})]\n${s.text}`).join('\n\n')
    navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  // Format recording timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog
      open={open}
      onClose={isRecording ? undefined : onClose}
      maxWidth='lg'
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          borderRadius: 2.5,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: 'primary.lighter',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className='tabler-microphone text-[20px]' />
          </Box>
          <Box>
            <Typography variant='h6' fontWeight={700}>
              Mike Zaino — Voice Calibration & Teleprompter Studio
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              Read directly from the teleprompter below or upload a phone Voice Memo to clone Mike’s voice in ~5s
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={copied ? 'Copied Full Script!' : 'Copy Script for iPad / Phone'}>
            <Button
              size='small'
              variant='outlined'
              color='inherit'
              startIcon={<i className={copied ? 'tabler-check' : 'tabler-copy'} />}
              onClick={handleCopyFullScript}
              sx={{ fontSize: 11 }}
            >
              {copied ? 'Copied!' : 'Copy Script'}
            </Button>
          </Tooltip>
          <IconButton size='small' onClick={onClose} disabled={isRecording}>
            <i className='tabler-x' />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && (
          <Alert severity='error' onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {clonedVoice && (
          <Alert severity='success' icon={<i className='tabler-sparkles' />}>
            <strong>Mike Zaino Voice Cloned Successfully!</strong> Voice ID: <code>{clonedVoice.voice_id}</code> is now ready across the Video Generator!
          </Alert>
        )}

        {/* Section Filter Tabs */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Tabs
            value={selectedSection}
            onChange={(_, val) => setSelectedSection(val)}
            sx={{ minHeight: 36 }}
            variant='scrollable'
            scrollButtons='auto'
          >
            <Tab value='all' label='Full Teleprompter (3 Min)' sx={{ minHeight: 36, py: 0.5, fontSize: 12 }} />
            {SCRIPT_SECTIONS.map((s, i) => (
              <Tab key={i} value={i} label={`Section ${i + 1} (${s.duration})`} sx={{ minHeight: 36, py: 0.5, fontSize: 12 }} />
            ))}
          </Tabs>

          <Chip
            label='Target: 440 words · 3:00 duration'
            size='small'
            color='primary'
            variant='outlined'
            sx={{ fontWeight: 600, fontSize: 11 }}
          />
        </Box>

        {/* Teleprompter Reading Box */}
        <Box
          sx={{
            p: 3,
            bgcolor: '#090d16',
            color: '#f8fafc',
            borderRadius: 2,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            minHeight: 240,
            maxHeight: 340,
            overflowY: 'auto',
            lineHeight: 1.8,
            fontSize: '17px',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {selectedSection === 'all' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {SCRIPT_SECTIONS.map((sec, idx) => (
                <Box key={idx}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant='caption' sx={{ color: 'primary.light', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {sec.title}
                    </Typography>
                    <Chip label={sec.cue} size='small' sx={{ height: 16, fontSize: 9, bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }} />
                  </Box>
                  <Typography sx={{ fontSize: '17px', color: '#f1f5f9', fontWeight: 400 }}>
                    "{sec.text}"
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant='subtitle2' sx={{ color: 'primary.light', fontWeight: 700 }}>
                  {SCRIPT_SECTIONS[selectedSection as number].title}
                </Typography>
                <Chip
                  label={SCRIPT_SECTIONS[selectedSection as number].cue}
                  size='small'
                  color='primary'
                  sx={{ height: 18, fontSize: 10 }}
                />
              </Box>
              <Typography sx={{ fontSize: '20px', lineHeight: 1.9, color: '#f8fafc', fontWeight: 400 }}>
                "{SCRIPT_SECTIONS[selectedSection as number].text}"
              </Typography>
            </Box>
          )}
        </Box>

        {/* Live Recording Studio & File Upload Controls */}
        <Card
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: isRecording ? 'error.main' : 'divider',
            bgcolor: isRecording ? 'rgba(239, 68, 68, 0.04)' : 'action.hover',
            borderRadius: 2,
            transition: 'all 0.2s ease',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            {/* Left: Recording Status & Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isRecording ? (
                <Button
                  variant='contained'
                  color='error'
                  startIcon={<i className='tabler-player-stop' />}
                  onClick={stopRecording}
                  sx={{
                    px: 3,
                    py: 1,
                    fontWeight: 700,
                    animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': {
                      '0%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)' },
                      '70%': { boxShadow: '0 0 0 10px rgba(239, 68, 68, 0)' },
                      '100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
                    },
                  }}
                >
                  Stop Recording ({formatTimer(recordDuration)})
                </Button>
              ) : (
                <Button
                  variant='contained'
                  color='primary'
                  startIcon={<i className='tabler-microphone' />}
                  onClick={startRecording}
                  disabled={cloning}
                  sx={{ px: 3, py: 1, fontWeight: 700 }}
                >
                  Record from Mic
                </Button>
              )}

              <Typography variant='caption' color='text.secondary'>
                or
              </Typography>

              <input
                type='file'
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept='audio/*'
                onChange={handleFileUpload}
              />

              <Button
                variant='outlined'
                color='secondary'
                startIcon={<i className='tabler-upload' />}
                onClick={() => fileInputRef.current?.click()}
                disabled={isRecording || cloning}
                size='small'
              >
                Upload Audio File (.mp3/.m4a)
              </Button>
            </Box>

            {/* Right: Audio Playback & Final Submit */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {audioUrl && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <audio src={audioUrl} controls style={{ height: 36, width: 200 }} />
                  {selectedFile && (
                    <Chip
                      label={selectedFile.name}
                      size='small'
                      variant='outlined'
                      sx={{ maxWidth: 120, fontSize: 10 }}
                    />
                  )}
                </Box>
              )}

              <Button
                variant='contained'
                color='success'
                startIcon={cloning ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-sparkles' />}
                onClick={handleCloneVoice}
                disabled={(!recordedBlob && !selectedFile) || isRecording || cloning}
                sx={{ px: 3, fontWeight: 700 }}
              >
                {cloning ? 'Cloning Voice…' : 'Generate Voice Clone'}
              </Button>
            </Box>
          </Box>
        </Card>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} color='inherit'>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
