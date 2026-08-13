'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import IconButton from '@mui/material/IconButton'
import Popover from '@mui/material/Popover'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Badge from '@mui/material/Badge'
import { api } from '@/lib/api'

type QuickNotesPopupProps = {
  jobId: string
  currentNotes?: string | null
  jobNumber?: string
  size?: 'small' | 'medium'
}

/**
 * Popover for quick dispatcher notes on a job.
 * Includes template buttons for common notes (Gate Code, Dog Alert, Call Ahead).
 * Saves directly to the job's `notes` field via PATCH.
 *
 * @module components/QuickNotesPopup
 */
export default function QuickNotesPopup({ jobId, currentNotes, jobNumber, size = 'small' }: QuickNotesPopupProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [notes, setNotes] = useState(currentNotes || '')
  const queryClient = useQueryClient()

  const hasNotes = Boolean(currentNotes && currentNotes.trim())

  const saveMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      return api.patch(`/api/jobs/${jobId}`, {
        notes: newNotes
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      setAnchorEl(null)
    }
  })

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setAnchorEl(e.currentTarget)
    setNotes(currentNotes || '')
  }

  const handleClose = () => {
    setAnchorEl(null)
    setNotes(currentNotes || '')
  }

  const handleSave = () => {
    saveMutation.mutate(notes)
  }

  const open = Boolean(anchorEl)

  return (
    <>
      <Tooltip title={hasNotes ? 'View/Edit Notes' : 'Add Dispatcher Notes'}>
        <Badge
          badgeContent={hasNotes ? '!' : 0}
          color='primary'
          variant='dot'
        >
          <IconButton
            size={size}
            onClick={handleClick}
            className={hasNotes ? 'text-primary-main' : 'text-gray-500'}
          >
            <i className='tabler-note' />
          </IconButton>
        </Badge>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Card sx={{ minWidth: 320, maxWidth: 400 }}>
          <CardContent>
            <Typography variant='subtitle2' className='font-bold mb-2'>
              Dispatcher Notes
              {jobNumber && (
                <Typography component='span' variant='caption' color='text.secondary' className='ml-2'>
                  {jobNumber}
                </Typography>
              )}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='Add notes (gate code, special instructions, etc.)'
              variant='outlined'
              size='small'
              disabled={saveMutation.isPending}
              helperText='Saved to job notes field'
            />
            <Box className='mt-2'>
              <Typography variant='caption' color='text.secondary' className='block mb-1'>
                Quick Templates:
              </Typography>
              <Box className='flex flex-wrap gap-1'>
                <Button
                  size='small'
                  variant='outlined'
                  onClick={() => setNotes(prev => (prev ? prev + '\n' : '') + 'Gate code: ')}
                  disabled={saveMutation.isPending}
                >
                  🚪 Gate Code
                </Button>
                <Button
                  size='small'
                  variant='outlined'
                  onClick={() => setNotes(prev => (prev ? prev + '\n' : '') + 'Dog on property - beware')}
                  disabled={saveMutation.isPending}
                >
                  🐕 Dog Alert
                </Button>
                <Button
                  size='small'
                  variant='outlined'
                  onClick={() => setNotes(prev => (prev ? prev + '\n' : '') + 'Call customer 30 min before arrival')}
                  disabled={saveMutation.isPending}
                >
                  📞 Call Ahead
                </Button>
              </Box>
            </Box>
          </CardContent>
          <CardActions className='justify-between'>
            <Button
              size='small'
              onClick={handleClose}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size='small'
              variant='contained'
              onClick={handleSave}
              disabled={saveMutation.isPending || notes === currentNotes}
              startIcon={saveMutation.isPending ? <CircularProgress size={16} /> : <i className='tabler-check' />}
            >
              Save
            </Button>
          </CardActions>
        </Card>
      </Popover>
    </>
  )
}
