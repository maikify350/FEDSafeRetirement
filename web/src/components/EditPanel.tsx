'use client'

import { type ReactNode } from 'react'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import { useState } from 'react'

interface EditPanelProps {
  open: boolean
  onClose: () => void
  onSave: () => void
  title: string
  isSaving: boolean
  hasUnsavedChanges?: boolean
  saveDisabled?: boolean   // disables Save when form is invalid
  children: ReactNode
}

/**
 * Full-screen drawer panel for entity editing with save/discard confirmation.
 * Opens from the right edge, spans the full viewport width, and includes a
 * sticky header with title + Save button. Prompts to discard unsaved changes.
 *
 * @module components/EditPanel
 *
 * @example
 * <EditPanel open={isEditing} onClose={close} onSave={save} title="Edit Job" isSaving={isPending}>
 *   <JobForm />
 * </EditPanel>
 */
export default function EditPanel({
  open,
  onClose,
  onSave,
  title,
  isSaving,
  hasUnsavedChanges = false,
  saveDisabled = false,
  children
}: EditPanelProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true)
    } else {
      onClose()
    }
  }

  const handleConfirmDiscard = () => {
    setShowConfirmDialog(false)
    onClose()
  }

  return (
    <>
      <Drawer
        open={open}
        anchor='right'
        onClose={handleClose}
        ModalProps={{ keepMounted: false }}
        sx={{
          '& .MuiDrawer-paper': {
            width: '100vw',
            minWidth: '100vw',
            maxWidth: '100vw'
          }
        }}
      >
        {/* Sticky Header with Save Button */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            boxShadow: 1
          }}
        >
          <Box className='flex items-center justify-between px-6 py-4'>
            <Box className='flex items-center gap-3'>
              <IconButton onClick={handleClose} size='small' disabled={isSaving}>
                <i className='tabler-x text-xl' />
              </IconButton>
              <Typography variant='h5' fontWeight={600}>
                {title}
              </Typography>
            </Box>
            <Button
              variant='contained'
              onClick={onSave}
              disabled={isSaving || saveDisabled}
              startIcon={isSaving ? <CircularProgress size={16} color='inherit' /> : undefined}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>

        {/* Scrollable Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', pb: 4 }}>
          {children}
        </Box>
      </Drawer>

      {/* Unsaved Changes Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle>Discard Changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes. Are you sure you want to discard them?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
          <Button onClick={handleConfirmDiscard} color='error' variant='contained'>
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
