'use client'

/**
 * ConfirmDialog — Styled MUI confirmation dialog.
 * UI/UX RULE: NEVER use window.alert() or window.confirm(). Always use this component.
 */

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string | React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: 'error' | 'primary' | 'warning' | 'success'
  icon?: string
  loading?: boolean
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'error',
  icon = 'tabler-alert-triangle',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='xs'
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box
          sx={{
            width: 40, height: 40,
            borderRadius: '50%',
            bgcolor: `${confirmColor}.lighter`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <i className={`${icon} text-xl`} style={{ color: `var(--mui-palette-${confirmColor}-main)` }} />
        </Box>
        <Typography variant='h6' fontWeight={700}>{title}</Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {typeof message === 'string' ? (
          <Typography color='text.secondary'>{message}</Typography>
        ) : message}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant='outlined'
          onClick={onClose}
          disabled={loading}
          sx={{ borderRadius: '8px' }}
        >
          {cancelLabel}
        </Button>
        <Button
          variant='contained'
          color={confirmColor}
          onClick={onConfirm}
          disabled={loading}
          sx={{ borderRadius: '8px', minWidth: 100 }}
        >
          {loading ? 'Please wait...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
