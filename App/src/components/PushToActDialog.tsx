'use client'

/**
 * PushToActDialog — Fake progress spinner for ACT.COM CRM push.
 * Shows a progress spinner for 10 seconds, then a green checkmark with "Completed".
 * Will be replaced with real API integration later.
 */

import { useState, useEffect, useRef } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'

interface PushToActDialogProps {
  open: boolean
  onClose: () => void
  count: number   // number of records being pushed
}

export default function PushToActDialog({ open, onClose, count }: PushToActDialogProps) {
  const [phase, setPhase] = useState<'sending' | 'done'>('sending')
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!open) {
      setPhase('sending')
      setProgress(0)
      return
    }

    // Simulate progress over 10 seconds
    const startTime = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min((elapsed / 10000) * 100, 100)
      setProgress(pct)

      if (pct >= 100) {
        setPhase('done')
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }, 200)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [open])

  return (
    <Dialog
      open={open}
      onClose={phase === 'done' ? onClose : undefined}
      maxWidth='xs'
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
    >
      {phase === 'sending' && (
        <LinearProgress
          variant='determinate'
          value={progress}
          sx={{ height: 4 }}
        />
      )}

      <DialogContent sx={{ textAlign: 'center', py: 5, px: 4 }}>
        {phase === 'sending' ? (
          <>
            <CircularProgress size={64} thickness={4} sx={{ mb: 3, color: 'primary.main' }} />
            <Typography variant='h6' fontWeight={700} sx={{ mb: 1 }}>
              Sending to ACT.COM
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              Pushing {count} {count === 1 ? 'record' : 'records'} to ACT CRM…
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {Math.round(progress)}% complete
            </Typography>
          </>
        ) : (
          <>
            <Box sx={{
              width: 72, height: 72, borderRadius: '50%',
              bgcolor: 'success.lighter',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 3,
              animation: 'scaleIn 0.3s ease-out',
              '@keyframes scaleIn': {
                '0%': { transform: 'scale(0.5)', opacity: 0 },
                '100%': { transform: 'scale(1)', opacity: 1 },
              },
            }}>
              <i className='tabler-circle-check-filled' style={{ fontSize: 48, color: 'var(--mui-palette-success-main)' }} />
            </Box>
            <Typography variant='h6' fontWeight={700} color='success.main' sx={{ mb: 1 }}>
              Completed!
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Successfully pushed {count} {count === 1 ? 'record' : 'records'} to ACT.COM
            </Typography>
          </>
        )}
      </DialogContent>

      {phase === 'done' && (
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            variant='contained'
            color='success'
            onClick={onClose}
            startIcon={<i className='tabler-check' />}
            sx={{ borderRadius: '8px', minWidth: 120 }}
          >
            Done
          </Button>
        </DialogActions>
      )}
    </Dialog>
  )
}
