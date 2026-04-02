'use client'

/**
 * EntityEditDialog — Reusable full-page draggable dialog shell for editing any entity.
 *
 * Used by: LeadEditDialog, CollectionEditDialog, UserEditDialog, etc.
 *
 * The parent provides:
 *   - title, subtitle, icon
 *   - save/cancel handlers + state
 *   - form content via children
 *   - footer audit info
 *
 * This component handles:
 *   - Draggable dialog with configurable width
 *   - Header with icon, title, save/cancel/close buttons
 *   - Footer with audit trail + entity ID
 *   - Unsaved changes warning on close
 *   - Success snackbar
 */

import { useRef } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Paper, { type PaperProps } from '@mui/material/Paper'
import Draggable from 'react-draggable'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import AuditFooter from '@/components/AuditFooter'

// ── Draggable Paper ─────────────────────────────────────────────────────────
function DraggablePaper(props: PaperProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  return (
    <Draggable nodeRef={nodeRef as any} handle="#entity-edit-dialog-title" cancel='[class*="MuiDialogContent-root"]'>
      <Paper {...props} ref={nodeRef} style={{ pointerEvents: 'auto' }} />
    </Draggable>
  )
}

export interface EntityEditDialogProps {
  // ── Dialog state
  open: boolean
  onClose: () => void

  // ── Header
  title: string
  subtitle?: string | React.ReactNode
  icon?: string           // tabler icon class, e.g. 'tabler-user-edit'

  // ── Save / dirty state
  onSave: () => void
  saving: boolean
  dirty: boolean
  error?: string
  onClearError?: () => void

  // ── Success toast
  showSuccess: boolean
  onClearSuccess: () => void
  successMessage?: string

  // ── Footer / audit
  entityId?: string
  sourceInfo?: string | React.ReactNode
  createdAt?: string
  createdBy?: string
  modifiedAt?: string
  modifiedBy?: string

  // ── Layout
  width?: string | number
  maxWidth?: string | number
  height?: string

  // ── Favorite toggle (optional)
  isFavorite?: boolean
  onToggleFavorite?: () => void

  // ── Content
  children: React.ReactNode
}

export default function EntityEditDialog({
  open,
  onClose,
  title,
  subtitle,
  icon = 'tabler-edit',
  onSave,
  saving,
  dirty,
  error,
  onClearError,
  showSuccess,
  onClearSuccess,
  successMessage = 'Saved successfully!',
  entityId,
  sourceInfo,
  createdAt,
  createdBy,
  modifiedAt,
  modifiedBy,
  width = '60vw',
  maxWidth = 1000,
  height = '88vh',
  isFavorite,
  onToggleFavorite,
  children,
}: EntityEditDialogProps) {

  const handleClose = () => {
    if (dirty && !confirm('You have unsaved changes. Discard?')) return
    onClose()
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth={false}
        hideBackdrop
        disableScrollLock
        disableEnforceFocus
        transitionDuration={200}
        PaperComponent={DraggablePaper}
        sx={{ pointerEvents: 'none' }}
        PaperProps={{
          sx: {
            width,
            maxWidth,
            height,
            maxHeight: 'none',
            m: 0,
            borderRadius: 2,
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          }
        }}
      >
        {/* ─── HEADER ──────────────────────────────────────────────────────── */}
        <DialogTitle
          id='entity-edit-dialog-title'
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' },
            bgcolor: 'background.paper',
          }}
        >
          <Box className='flex items-center gap-3'>
            <Box
              sx={{
                width: 44, height: 44,
                borderRadius: '50%',
                bgcolor: 'primary.lighter',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <i className={`${icon} text-xl`} style={{ color: 'var(--mui-palette-primary-main)' }} />
            </Box>
            <Box>
              <Typography variant='h5' fontWeight={700}>
                {title}
              </Typography>
              {subtitle && (
                typeof subtitle === 'string'
                  ? <Chip label={subtitle} size='small' color='info' variant='tonal' sx={{ fontSize: 11, height: 20, mt: 0.5 }} />
                  : subtitle
              )}
            </Box>
          </Box>
          <Box className='flex items-center gap-2'>
            {onToggleFavorite && (
              <IconButton
                onClick={onToggleFavorite}
                sx={{ color: isFavorite ? '#f59e0b' : 'text.disabled' }}
              >
                <i className={isFavorite ? 'tabler-star-filled' : 'tabler-star'} style={{ fontSize: 22 }} />
              </IconButton>
            )}
            <Button
              variant='outlined'
              onClick={handleClose}
              disabled={saving}
              sx={{ borderRadius: '8px' }}
            >
              Cancel
            </Button>
            <Button
              variant='contained'
              onClick={onSave}
              disabled={saving || !dirty}
              startIcon={saving ? <CircularProgress size={18} color='inherit' /> : <i className='tabler-device-floppy' />}
              sx={{ borderRadius: '8px', minWidth: 100 }}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <IconButton onClick={handleClose} disabled={saving}>
              <i className='tabler-x' />
            </IconButton>
          </Box>
        </DialogTitle>

        {/* ─── CONTENT ─────────────────────────────────────────────────────── */}
        <DialogContent sx={{ p: 4, overflow: 'auto' }}>
          {error && (
            <Alert severity='error' onClose={onClearError} sx={{ mb: 3 }}>{error}</Alert>
          )}
          {children}
        </DialogContent>

        {/* ─── FOOTER ──────────────────────────────────────────────────────── */}
        <DialogActions
          sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default', flexDirection: 'column', gap: 0.5 }}
        >
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box className='flex items-center gap-3'>
              {sourceInfo && (
                typeof sourceInfo === 'string'
                  ? <Tooltip title='Source'><Chip icon={<i className='tabler-file-text' />} label={sourceInfo} size='small' variant='outlined' sx={{ fontSize: 11 }} /></Tooltip>
                  : sourceInfo
              )}
            </Box>
            <Box className='flex items-center gap-2'>
              {entityId && (
                <Typography variant='caption' color='text.disabled' sx={{ fontFamily: 'monospace', fontSize: 10 }}>
                  ID: {entityId.length > 8 ? `${entityId.slice(0, 8)}…` : entityId}
                </Typography>
              )}
            </Box>
          </Box>
          <AuditFooter
            creAt={createdAt}
            creBy={createdBy}
            modAt={modifiedAt}
            modBy={modifiedBy}
            divider={false}
          />
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={onClearSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity='success' variant='filled' onClose={onClearSuccess}>
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  )
}
