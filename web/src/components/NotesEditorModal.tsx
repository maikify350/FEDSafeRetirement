'use client'

import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import CustomTextField from '@core/components/mui/TextField'

interface NotesEditorModalProps {
  open: boolean
  onClose: () => void
  title: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

/**
 * Notes editor that slides in over the right side panel.
 * Constrained to panel width (33vw), full height, vertical scroll only.
 */
export default function NotesEditorModal({
  open,
  onClose,
  title,
  value,
  onChange,
  placeholder,
}: NotesEditorModalProps) {
  const [draft, setDraft] = useState(value)
  const [originalValue, setOriginalValue] = useState(value)

  // Sync draft and original value when modal opens
  useEffect(() => {
    if (open) {
      setDraft(value)
      setOriginalValue(value)
    }
  }, [open, value])

  const handleSaveAndClose = () => {
    onChange(draft)
    onClose()
  }

  const handleRevert = () => {
    setDraft(originalValue)
  }

  const hasChanges = draft !== originalValue

  return (
    <Dialog
      open={open}
      onClose={handleSaveAndClose}
      scroll='paper'
      PaperProps={{
        sx: {
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          m: 0,
          width: { xs: '100%', sm: '33.33vw' },
          minWidth: 280,
          maxWidth: '100vw',
          height: '100%',
          maxHeight: '100%',
          borderRadius: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
          bgcolor: 'background.default',
        }
      }}
      sx={{ '& .MuiDialog-container': { justifyContent: 'flex-end' } }}
    >
      {/* Top bar: revert left, title center, checkmark right */}
      <Box
        className='flex items-center justify-between px-4'
        sx={{
          minHeight: 56,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        {/* Left: Revert button */}
        <Tooltip title='Revert to original'>
          <span>
            <IconButton
              onClick={handleRevert}
              edge='start'
              aria-label='revert'
              disabled={!hasChanges}
            >
              <i className='tabler-rotate-clockwise-2 text-xl' />
            </IconButton>
          </span>
        </Tooltip>

        {/* Center: Title */}
        <Typography variant='h6' fontWeight={600}>
          {title}
        </Typography>

        {/* Right: Save and close (checkmark) */}
        <Tooltip title='Save and close'>
          <IconButton onClick={handleSaveAndClose} edge='end' aria-label='save and close'>
            <i className='tabler-check text-xl' />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Scrollable content area — no horizontal scroll */}
      <DialogContent sx={{ p: 2, overflow: 'hidden auto' }}>
        <CustomTextField
          fullWidth
          multiline
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={placeholder}
          sx={{
            '& .MuiInputBase-root': {
              alignItems: 'flex-start',
              minHeight: 'calc(100vh - 80px)',
              overflowX: 'hidden',
            },
            '& textarea': {
              overflowX: 'hidden !important',
              overflowY: 'auto !important',
              resize: 'none',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            },
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
