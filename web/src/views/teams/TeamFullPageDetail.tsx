'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Paper, { PaperProps } from '@mui/material/Paper'
import Draggable from 'react-draggable'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'

import AuditFooter from '@/components/AuditFooter'
import SectionHeader from '@/components/SectionHeader'
import ContactLink from '@/components/ContactLink'
import CustomAvatar from '@core/components/mui/Avatar'
import { getInitials } from '@/utils/getInitials'
import TeamEditPanel from './TeamEditPanel'

export type TeamMember = {
  id: string
  firstName?: string
  lastName?: string
  name?: string  // Auto-generated from firstName + lastName
  email?: string
  phone?: string
  avatar?: string
  role?: string
  status?: string
  department?: string
  timeZone?: string
  street?: string
  city?: string
  state?: string
  zipCode?: string
  notes?: string
  internalNotes?: string
  isDeleted?: boolean
  gender?: string | null
  lastLoggedIn?: string | null
  phoneNumbers?: Array<{ id: string; number: string; type?: string; isDefault?: boolean }>
  [key: string]: unknown
}

function DetailRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: string }) {
  if (value == null || value === '' || value === '—') return null
  return (
    <Box className='flex items-start gap-3 px-4 py-3' sx={{ borderBottom: 1, borderColor: 'divider' }}>
      {icon && <i className={`${icon} text-lg mt-0.5 text-textSecondary`} />}
      <Box className='flex-1 min-w-0'>
        <Typography variant='caption' color='text.secondary' className='block'>{label}</Typography>
        <Typography variant='body2' fontWeight={500}>{value}</Typography>
      </Box>
    </Box>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  onEdit: () => void
  member?: TeamMember
  memberId?: string | null
  initialEditing?: boolean
}

function PaperComponent(props: PaperProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  return (
    <Draggable nodeRef={nodeRef as any} handle="#draggable-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} ref={nodeRef} style={{ pointerEvents: 'auto' }} />
    </Draggable>
  )
}

/**
 * Full-page team member detail with contact info, skills, GPS location, and schedule.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/teams/TeamFullPageDetail.tsx
 */
export default function TeamFullPageDetail({ open, onClose, onEdit, member, memberId, initialEditing }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: fetchedMember, isLoading: isLoadingMember } = useQuery({
    queryKey: ['team-member', memberId],
    queryFn: () => api.get<TeamMember>(`/api/users/${memberId}`),
    enabled: !!memberId && !member && open
  })

  const resolvedMember = member || fetchedMember

  // Login/lock status from Corp DB
  const { data: loginStatus, refetch: refetchLoginStatus } = useQuery<{
    hasLoginAccount: boolean
    email: string | null
    isLocked: boolean
    isDeactivated: boolean
    lockedUntil: string | null
    failedLoginAttempts: number
  }>({
    queryKey: ['login-status', resolvedMember?.id],
    queryFn: () => api.get(`/api/users/${resolvedMember!.id}/login-status`),
    enabled: !!resolvedMember?.id && open
  })

  const unlockMutation = useMutation({
    mutationFn: () => api.post(`/api/users/${resolvedMember!.id}/unlock`),
    onSuccess: () => { refetchLoginStatus() }
  })

  const [isEditing, setIsEditing] = useState(initialEditing ?? false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const saveFuncRef = useRef<(() => void) | undefined>(undefined)
  const [editState, setEditState] = useState({ isSaving: false, isValid: true })
  useEffect(() => {
    if (!isEditing) setEditState({ isSaving: false, isValid: true })
  }, [isEditing])
  const [printing, setPrinting] = useState(false)

  const handlePrint = async () => {
    if (!resolvedMember) return
    setPrinting(true)
    try {
      const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
      const response = await fetch(`${BACKEND}/api/reports/team-member/${resolvedMember.id}?format=pdf`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jm_token')}` }
      })
      if (!response.ok) throw new Error('Failed to generate report')
      const blob = await response.blob()
      window.open(window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })), '_blank')
    } catch (error) {
      console.error('Print failed:', error)
      alert('Failed to generate report.')
    } finally {
      setPrinting(false)
    }
  }

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!resolvedMember) throw new Error('No member to delete')
      return api.delete(`/api/users/${resolvedMember.id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      if (error?.response?.status === 409 && errorData?.error) {
        alert(errorData.error)
      } else {
        alert('Failed to delete user.')
      }
    }
  })

  const handleDelete = () => {
    deleteMutation.mutate()
    setDeleteDialogOpen(false)
  }

  const handleInlineSave = () => {
    if (saveFuncRef.current) saveFuncRef.current()
  }

  const fullName = resolvedMember ? `${resolvedMember.firstName || ''} ${resolvedMember.lastName || ''}`.trim() : ''
  const displayName = !resolvedMember ? 'Add Team Member' : isEditing ? 'Edit Team Member' : (fullName || 'Team Member Details')
  const initials = getInitials(fullName || '?')
  const avatarColor = resolvedMember?.status === 'ACTIVE' ? 'success' : resolvedMember?.status === 'ON_LEAVE' ? 'warning' : 'secondary'

  // Show loading state when fetching member
  if (isLoadingMember) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth={false}
        hideBackdrop
        disableScrollLock
        disableEnforceFocus
        transitionDuration={0}
        PaperComponent={PaperComponent}
        sx={{ pointerEvents: 'none' }}
        PaperProps={{
          sx: { width: '60vw', maxWidth: 'none', height: '90vh', maxHeight: 'none', m: 0, borderRadius: 2 }
        }}
      >
        <DialogContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={() => (isEditing && resolvedMember) ? setIsEditing(false) : onClose()}
      maxWidth={false}
      hideBackdrop
      disableScrollLock
      disableEnforceFocus
      transitionDuration={0}
      PaperComponent={PaperComponent}
      sx={{ pointerEvents: 'none' }}
      PaperProps={{
        sx: { width: '60vw', maxWidth: 'none', height: '90vh', maxHeight: 'none', m: 0, borderRadius: 2 }
      }}
    >
      {/* HEADER */}
      <DialogTitle id="draggable-dialog-title" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', cursor: 'grab', '&:active': { cursor: 'grabbing' } }}>
        <Box className="flex items-center gap-3">
          <CustomAvatar size={50} skin='light' color={avatarColor as any} sx={{ fontSize: '1.5rem', letterSpacing: '0.15em', fontWeight: 600 }}>
            {initials}
          </CustomAvatar>
          <Box className="flex flex-col">
            <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '0.05em', wordSpacing: '0.15em' }}>
              {displayName}
            </Typography>
            <Box className="flex items-center gap-2 mt-0.5">
              {resolvedMember?.role && <Chip label={resolvedMember.role} size='small' color='primary' variant='tonal' />}
              {resolvedMember?.department && <Chip label={resolvedMember.department} size='small' variant='tonal' color='secondary' />}
              {resolvedMember?.status && <Chip label={resolvedMember.status.replace('_', ' ')} size='small' color={avatarColor as any} variant='tonal' />}
              {loginStatus?.isDeactivated && <Chip label='DEACTIVATED' size='small' color='error' icon={<i className='tabler-lock' />} />}
              {loginStatus?.isLocked && !loginStatus?.isDeactivated && (
                <Chip label={`LOCKED (${loginStatus.failedLoginAttempts} failed)`} size='small' color='warning' icon={<i className='tabler-lock' />}
                  onDelete={() => unlockMutation.mutate()} deleteIcon={<Tooltip title='Unlock Account'><i className='tabler-lock-open' /></Tooltip>} />
              )}
              {loginStatus?.hasLoginAccount && !loginStatus?.isLocked && !loginStatus?.isDeactivated && loginStatus.failedLoginAttempts > 0 && (
                <Chip label={`${loginStatus.failedLoginAttempts} failed login(s)`} size='small' color='default' variant='tonal' />
              )}
            </Box>
          </Box>
        </Box>
        <Box className="flex items-center gap-2">
          {isEditing ? (
            <>
              {resolvedMember && !resolvedMember.isDefault && (
                <Tooltip title="Delete Member">
                  <IconButton onClick={() => setDeleteDialogOpen(true)} disabled={editState.isSaving} sx={{ color: 'error.main', bgcolor: 'error.lighter', '&:hover': { bgcolor: 'error.light' } }}>
                    <i className="tabler-trash text-[28px]" />
                  </IconButton>
                </Tooltip>
              )}
              <Button variant="outlined" onClick={() => resolvedMember ? setIsEditing(false) : onClose()} disabled={editState.isSaving} sx={{ borderRadius: '8px' }}>Cancel</Button>
              <Button variant="contained" onClick={handleInlineSave} disabled={editState.isSaving} sx={{ borderRadius: '8px', minWidth: '80px' }}>
                {editState.isSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Tooltip title="Print Report">
                <IconButton onClick={handlePrint} disabled={printing} sx={{ bgcolor: 'info.lighter', color: 'info.main', '&:hover': { bgcolor: 'info.light' } }}>
                  {printing ? <CircularProgress size={24} color='inherit' /> : <i className='tabler-printer text-[24px]' />}
                </IconButton>
              </Tooltip>
              <IconButton onClick={() => setIsEditing(true)} sx={{ bgcolor: 'primary.lighter', color: 'primary.main', '&:hover': { bgcolor: 'primary.light' } }}>
                <i className="tabler-pencil text-[28px]" />
              </IconButton>
            </>
          )}
          <IconButton onClick={() => (isEditing && resolvedMember) ? setIsEditing(false) : onClose()} disabled={editState.isSaving}>
            <i className="tabler-x" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* CONTENT (Resizable Panels) */}
      <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isEditing ? (
          <TeamEditPanel
            memberId={resolvedMember?.id || null}
            open={true}
            onClose={() => resolvedMember ? setIsEditing(false) : onClose()}
            onSaved={() => resolvedMember ? setIsEditing(false) : onClose()}
            inline={true}
            registerSave={(fn: any) => { saveFuncRef.current = fn }}
            onStateChange={setEditState}
          />
        ) : resolvedMember ? (
          <PanelGroup direction="horizontal">
            {/* LEFT SECTION (70%) */}
            <Panel defaultSize={70} minSize={40}>
              <Box sx={{ p: 4, height: '100%', overflowY: 'auto' }}>
                <SectionHeader>Basic Information</SectionHeader>
                <Box className='rounded-2xl overflow-hidden mb-6' sx={{ border: 1, borderColor: 'divider' }}>
                  <DetailRow label='First Name' value={resolvedMember.firstName} icon='tabler-user' />
                  <DetailRow label='Last Name' value={resolvedMember.lastName} icon='tabler-user' />
                  <DetailRow label='Role' value={resolvedMember.role} icon='tabler-badge' />
                </Box>

                {/* Contact Information */}
                {(resolvedMember.phone || resolvedMember.email) && (
                  <>
                    <SectionHeader>Contact Information</SectionHeader>
                    <Box className='rounded-2xl overflow-hidden mb-6' sx={{ border: 1, borderColor: 'divider' }}>
                      <DetailRow label='Phone' value={
                        resolvedMember.phone ? <ContactLink type='phone' value={resolvedMember.phone} /> : null
                      } icon='tabler-phone' />
                      <DetailRow label='Email' value={
                        resolvedMember.email ? <ContactLink type='email' value={resolvedMember.email} /> : null
                      } icon='tabler-mail' />
                    </Box>
                  </>
                )}

                {/* Last Login */}
                {resolvedMember.lastLoggedIn && (
                  <>
                    <SectionHeader>Activity</SectionHeader>
                    <Box className='rounded-2xl overflow-hidden mb-6' sx={{ border: 1, borderColor: 'divider' }}>
                      <DetailRow label='Last Login' value={new Date(resolvedMember.lastLoggedIn).toLocaleString()} icon='tabler-login' />
                    </Box>
                  </>
                )}

                {/* Address */}
                {(resolvedMember.street || resolvedMember.city || resolvedMember.state || resolvedMember.zipCode) && (
                  <>
                    <SectionHeader>Address</SectionHeader>
                    <Box className='rounded-2xl overflow-hidden mb-6' sx={{ border: 1, borderColor: 'divider' }}>
                      <DetailRow label='Street' value={resolvedMember.street} icon='tabler-map-pin' />
                      <DetailRow label='Location' value={[resolvedMember.city, resolvedMember.state, resolvedMember.zipCode].filter(Boolean).join(', ')} icon='tabler-map' />
                    </Box>
                  </>
                )}
              </Box>
            </Panel>

            {/* VERTICAL SPLITTER */}
            <PanelResizeHandle className="w-2 bg-gray-100 border-x border-gray-200 cursor-col-resize flex items-center justify-center transition-colors hover:bg-primary-light">
              <div className="h-8 w-0.5 bg-gray-400 rounded-full" />
            </PanelResizeHandle>

            {/* RIGHT SECTION (30%) */}
            <Panel defaultSize={30} minSize={20} className="bg-gray-50 flex flex-col border-l border-divider">
               <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                 <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                   <Box>
                    <SectionHeader>Public Notes</SectionHeader>
                    {(!resolvedMember.notes) && (
                       <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>No notes provided.</Typography>
                    )}
                    {resolvedMember.notes && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>{resolvedMember.notes}</Typography>
                      </Box>
                    )}
                  </Box>

                  <Box>
                    <SectionHeader>Internal Notes</SectionHeader>
                    {(!resolvedMember.internalNotes && !isEditing) && (
                       <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>No internal notes provided.</Typography>
                    )}
                    {resolvedMember.internalNotes && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.lighter', border: 1, borderColor: 'warning.main', borderRadius: 2 }}>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>{resolvedMember.internalNotes}</Typography>
                      </Box>
                    )}
                  </Box>
                 </Box>
               </Box>
            </Panel>
          </PanelGroup>
        ) : null}
      </DialogContent>

      {/* FIXED FOOTER CONTROLS */}
      {resolvedMember && (
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', justifyContent: 'center' }}>
          <AuditFooter creAt={resolvedMember.creAt} creBy={resolvedMember.creBy} modAt={resolvedMember.modAt} modBy={resolvedMember.modBy} divider={false} />
        </DialogActions>
      )}

      {/* Delete Confirmation Dialog */}
      {resolvedMember && (
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} disableEnforceFocus PaperProps={{ sx: { minWidth: 400 } }}>
          <DialogTitle>Delete Member?</DialogTitle>
          <DialogContent>
            <DialogContentText>Are you sure you want to delete this team member? This action cannot be undone.</DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained" autoFocus disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Dialog>
  )
}
