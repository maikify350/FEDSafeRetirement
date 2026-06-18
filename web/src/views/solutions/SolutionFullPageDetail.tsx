'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import Paper, { PaperProps } from '@mui/material/Paper'
import Draggable from 'react-draggable'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { toast } from 'react-toastify'

import SectionHeader from '@/components/SectionHeader'
import AuditFooter from '@/components/AuditFooter'
import CustomTextField from '@core/components/mui/TextField'
import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SolutionComment = {
  id: string
  comment: string
  solutionId: string
  creAt: string | null
  creBy: string
}

export type Solution = {
  id: string
  topic: string
  answer: string
  isHidden: boolean
  creAt: string | null
  modAt: string | null
  creBy: string
  modBy: string
  comments: SolutionComment[]
}

type FormData = {
  topic: string
  answer: string
  isHidden: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  solution: Solution | null
  onSave: () => Promise<void>
  initialEditing?: boolean
}

// ── Draggable paper ───────────────────────────────────────────────────────────

function PaperComponent(props: PaperProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  return (
    <Draggable nodeRef={nodeRef as any} handle="#solution-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} ref={nodeRef} style={{ pointerEvents: 'auto' }} />
    </Draggable>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Full-page solution detail with topic, answer (rich text), photos, and comments.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/solutions/SolutionFullPageDetail.tsx
 */
export default function SolutionFullPageDetail({ open, onClose, solution, onSave, initialEditing }: Props) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [deleteDlgOpen, setDeleteDlgOpen] = useState(false)

  // Reset editing state when dialog opens
  useEffect(() => {
    if (open) setIsEditing(initialEditing ?? !solution)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: { topic: '', answer: '', isHidden: false }
  })

  useEffect(() => {
    reset({
      topic:    solution?.topic    ?? '',
      answer:   solution?.answer   ?? '',
      isHidden: solution?.isHidden ?? false,
    })
  }, [solution, open, reset])

  const isNew = !solution?.id

  const onSubmit = async (data: FormData) => {
    try {
      if (isNew) {
        await api.post('/api/solutions', data)
        toast.success('Solution created')
        await onSave()
        onClose()
      } else {
        await api.patch(`/api/solutions/${solution!.id}`, data)
        toast.success('Solution updated')
        await onSave()
        setIsEditing(false)
      }
    } catch (e) {
      toast.error('Failed to save solution')
      console.error(e)
    }
  }

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/solutions/${solution?.id}`),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['solutions'] })
      await onSave()
      onClose()
    },
    onError: () => toast.error('Failed to delete solution'),
  })

  return (
    <>
      <Dialog
        open={open}
        onClose={() => (isEditing && solution) ? setIsEditing(false) : onClose()}
        maxWidth={false}
        hideBackdrop
        disableScrollLock
        disableEnforceFocus
        transitionDuration={0}
        PaperComponent={PaperComponent}
        sx={{ pointerEvents: 'none' }}
        PaperProps={{
          sx: { width: '60vw', maxWidth: 'none', height: '82vh', maxHeight: 'none', m: 0, borderRadius: 2 }
        }}
      >
        {/* ── Header ── */}
        <DialogTitle
          id="solution-dialog-title"
          sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
        >
          <Box className="flex items-center gap-3">
            <Box className="flex flex-col">
              <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '0.05em', wordSpacing: '0.15em' }}>
                {isNew ? 'Add Solution' : isEditing ? 'Edit Solution' : 'Solution Details'}
              </Typography>
              {solution && !isNew && (
                <Box className="flex items-center gap-2 mt-0.5">
                  <Chip
                    label={solution.isHidden ? 'Hidden' : 'Visible'}
                    size='small'
                    color={solution.isHidden ? 'warning' : 'success'}
                    variant='tonal'
                  />
                  {(solution.comments?.length ?? 0) > 0 && (
                    <Chip
                      label={`${solution.comments.length} comment${solution.comments.length !== 1 ? 's' : ''}`}
                      size='small'
                      icon={<i className='tabler-message-circle text-sm' />}
                      variant='outlined'
                    />
                  )}
                </Box>
              )}
            </Box>
          </Box>

          <Box className="flex items-center gap-2">
            {isEditing ? (
              <>
                {!isNew && (
                  <Tooltip title="Delete Solution">
                    <IconButton
                      onClick={() => setDeleteDlgOpen(true)}
                      disabled={isSubmitting}
                      sx={{ color: 'error.main', bgcolor: 'error.lighter', '&:hover': { bgcolor: 'error.light' } }}
                    >
                      <i className="tabler-trash text-[24px]" />
                    </IconButton>
                  </Tooltip>
                )}
                <Button variant="outlined" onClick={() => isNew ? onClose() : setIsEditing(false)} disabled={isSubmitting} sx={{ borderRadius: '8px' }}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting} sx={{ borderRadius: '8px', minWidth: '80px' }}>
                  {isSubmitting ? 'Saving…' : isNew ? 'Create' : 'Save'}
                </Button>
              </>
            ) : (
              <IconButton onClick={() => setIsEditing(true)} sx={{ bgcolor: 'primary.lighter', color: 'primary.main', '&:hover': { bgcolor: 'primary.light' } }}>
                <i className="tabler-pencil text-[28px]" />
              </IconButton>
            )}
            <IconButton onClick={() => (isEditing && solution) ? setIsEditing(false) : onClose()} disabled={isSubmitting}>
              <i className="tabler-x" />
            </IconButton>
          </Box>
        </DialogTitle>

        {/* ── Content ── */}
        <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {isEditing ? (
            // ── Edit / Create form ────────────────────────────────────────────
            <Box sx={{ p: 4, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Controller name='topic' control={control} rules={{ required: 'Topic is required' }}
                render={({ field, fieldState }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    label='Topic / Question' required
                    placeholder='e.g. How do I reset my password?'
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )} />

              <Controller name='answer' control={control} rules={{ required: 'Answer is required' }}
                render={({ field, fieldState }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    label='Answer / Explanation' required
                    multiline
                    rows={10}
                    placeholder='Provide a clear, detailed answer…'
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )} />

              <Divider />

              <Controller name='isHidden' control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={e => field.onChange(e.target.checked)} color='warning' />}
                    label={
                      <Box>
                        <Typography variant='body2' fontWeight={500}>Hide from users</Typography>
                        <Typography variant='caption' color='text.secondary'>
                          Hidden solutions are only visible to administrators
                        </Typography>
                      </Box>
                    }
                  />
                )} />
            </Box>
          ) : solution ? (
            // ── View mode — two panels ────────────────────────────────────────
            <PanelGroup direction="horizontal">
              <Panel defaultSize={65} minSize={40}>
                <Box sx={{ p: 4, height: '100%', overflowY: 'auto' }}>
                  <SectionHeader>Topic</SectionHeader>
                  <Typography variant="h5" fontWeight={600} sx={{ mb: 3, mt: 1, lineHeight: 1.4 }}>
                    {solution.topic}
                  </Typography>

                  <SectionHeader>Answer</SectionHeader>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 1, fontSize: '1.1rem', lineHeight: 1.75, mb: 3 }}>
                    {solution.answer}
                  </Typography>

                  <SectionHeader>Visibility</SectionHeader>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Chip
                      label={solution.isHidden ? 'Hidden from users' : 'Visible to users'}
                      color={solution.isHidden ? 'warning' : 'success'}
                      variant='tonal'
                    />
                  </Box>
                </Box>
              </Panel>

              <PanelResizeHandle style={{ width: 4, background: 'var(--mui-palette-divider)', cursor: 'col-resize' }} />

              <Panel defaultSize={35} minSize={25}>
                <Box sx={{ p: 3, height: '100%', overflowY: 'auto', bgcolor: 'background.default' }}>
                  <SectionHeader>Comments ({solution.comments?.length ?? 0})</SectionHeader>
                  {(solution.comments?.length ?? 0) > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                      {solution.comments.map(c => (
                        <Box key={c.id} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
                          <Typography variant='caption' color='text.secondary'>
                            {c.creBy} · {c.creAt ? new Date(c.creAt).toLocaleDateString() : ''}
                          </Typography>
                          <Typography variant='body2' sx={{ mt: 0.5 }}>{c.comment}</Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <i className='tabler-message-off text-4xl' style={{ color: 'var(--mui-palette-text-disabled)' }} />
                      <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>No comments yet</Typography>
                    </Box>
                  )}
                </Box>
              </Panel>
            </PanelGroup>
          ) : null}
        </DialogContent>

        {/* ── Footer ── */}
        {solution && !isNew && (
          <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', justifyContent: 'center' }}>
            <AuditFooter creAt={solution.creAt} creBy={solution.creBy} modAt={solution.modAt} modBy={solution.modBy} divider={false} />
          </DialogActions>
        )}
      </Dialog>

      {/* ── Delete confirmation ── */}
      <Dialog open={deleteDlgOpen} onClose={() => setDeleteDlgOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Delete Solution?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete "<strong>{solution?.topic}</strong>". This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDlgOpen(false)}>Cancel</Button>
          <Button color='error' variant='contained' onClick={() => { deleteMutation.mutate(); setDeleteDlgOpen(false) }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
