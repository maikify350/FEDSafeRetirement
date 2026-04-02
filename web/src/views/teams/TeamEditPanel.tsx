'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'

import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'

import EditPanel from '@/components/EditPanel'
import SectionHeader from '@/components/SectionHeader'
import CustomTextField from '@core/components/mui/TextField'
import { api } from '@/lib/api'
import { useRequiredFieldsValidation } from '@/hooks/useRequiredFields'
import type { TeamMember } from './TeamFullPageDetail'

type LookupItem = { id: string; value: string; label: string }

type FormData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  department: string
  status: string
  gender: string
  street: string
  city: string
  state: string
  zipCode: string
  notes: string
  internalNotes: string
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE',   label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ON_LEAVE', label: 'On Leave' },
]

const GENDER_OPTIONS = [
  { value: '',  label: '— None —' },
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
]

interface TeamEditPanelProps {
  memberId: string | null
  open: boolean
  onClose: () => void
  onSaved: () => void
  inline?: boolean
  registerSave?: (saveFn: () => void) => void
  onStateChange?: (state: { isSaving: boolean; isValid: boolean }) => void
}

/**
 * Full-screen edit drawer for Team Member entity with role, address, and phone numbers.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/teams/TeamEditPanel.tsx
 */
export default function TeamEditPanel({ memberId, open, onClose, onSaved, inline, registerSave, onStateChange }: TeamEditPanelProps) {
  const queryClient = useQueryClient()
  
  const [deleteDlgOpen, setDeleteDlgOpen] = useState(false)

  // Dynamic Required Fields
  const { isRequired } = useRequiredFieldsValidation('user')
  
  const { data: member, isLoading: isLoadingMember } = useQuery({
    queryKey: ['user', memberId],
    queryFn: () => api.get<TeamMember>(`/api/users/${memberId}`),
    enabled: !!memberId && open
  })

  // Login/lock status from Corp DB
  const { data: loginStatus, refetch: refetchLoginStatus } = useQuery<{
    hasLoginAccount: boolean; isLocked: boolean; isDeactivated: boolean;
    lockedUntil: string | null; failedLoginAttempts: number;
  }>({
    queryKey: ['login-status', memberId],
    queryFn: () => api.get(`/api/users/${memberId}/login-status`),
    enabled: !!memberId && open
  })

  const unlockMutation = useMutation({
    mutationFn: () => api.post(`/api/users/${memberId}/unlock`),
    onSuccess: () => { refetchLoginStatus() }
  })

  // Lookups
  const { data: roles = [] } = useQuery<LookupItem[]>({
    queryKey: ['lookups', 'role'],
    queryFn: () => api.get('/api/lookups/role'),
    staleTime: 5 * 60_000,
  })

  const { data: departments = [] } = useQuery<LookupItem[]>({
    queryKey: ['lookups', 'department'],
    queryFn: () => api.get('/api/lookups/department'),
    staleTime: 5 * 60_000,
  })

  const { control, handleSubmit, reset, formState: { isSubmitting, isValid, isDirty: formIsDirty } } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      firstName: '', lastName: '', email: '', phone: '', role: '', department: '',
      status: 'ACTIVE', gender: '', street: '', city: '', state: '', zipCode: '',
      notes: '', internalNotes: '',
    }
  })

  useEffect(() => {
    if (member && memberId) {
      reset({
        firstName:     member.firstName     ?? '',
        lastName:      member.lastName      ?? '',
        email:         member.email         ?? '',
        phone:         member.phone         ?? '',
        role:          member.role          ?? '',
        department:    member.department    ?? '',
        status:        member.status        ?? 'ACTIVE',
        gender:        (member.gender as string) ?? '',
        street:        member.street        ?? '',
        city:          member.city          ?? '',
        state:         member.state         ?? '',
        zipCode:       member.zipCode       ?? '',
        notes:         (member.notes as string)         ?? '',
        internalNotes: (member.internalNotes as string) ?? '',
      })
    } else if (!memberId) {
      reset({
        firstName: '', lastName: '', email: '', phone: '', role: '', department: '',
        status: 'ACTIVE', gender: '', street: '', city: '', state: '', zipCode: '',
        notes: '', internalNotes: '',
      })
    }
  }, [member, memberId, reset, open])

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => memberId ? api.patch(`/api/users/${memberId}`, data) : api.post('/api/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', memberId] })
      onSaved()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/users/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    }
  })

  const onSubmit = (data: FormData) => {
    // Convert empty strings to null for optional fields that the backend expects as null
    const payload = {
      ...data,
      gender: data.gender || null,
      department: data.department || null,
      notes: data.notes || null,
      internalNotes: data.internalNotes || null,
    }
    saveMutation.mutate(payload as any)
  }

  useEffect(() => {
    if (registerSave) registerSave(handleSubmit(onSubmit))
  }, [registerSave, handleSubmit])

  useEffect(() => {
    if (onStateChange) onStateChange({ isSaving: saveMutation.isPending, isValid })
  }, [onStateChange, saveMutation.isPending, isValid])

  const handleDelete = async () => {
    await deleteMutation.mutateAsync()
    setDeleteDlgOpen(false)
  }

  const isNew = !memberId
  const isLoading = isLoadingMember && !!memberId

  const formContent = (
    <Box component='form' onSubmit={handleSubmit(onSubmit)} sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {isLoading && (
        <Box className='flex justify-center items-center p-12'>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && (
        <Box sx={{ flex: 1, overflowY: 'auto', px: inline ? 3 : '4px', py: inline ? 2 : '2px', '& .MuiFormControl-root': { mt: '2px', mb: 0 } }}>
          
          {loginStatus?.isDeactivated && (
            <Alert severity='error' sx={{ mb: 1 }} icon={<i className='tabler-lock' />}>
              This account has been deactivated. Login is permanently disabled.
            </Alert>
          )}
          {loginStatus?.isLocked && !loginStatus?.isDeactivated && (
            <Alert severity='warning' sx={{ mb: 1 }} icon={<i className='tabler-lock' />}
              action={<Button color='warning' size='small' onClick={() => unlockMutation.mutate()} disabled={unlockMutation.isPending}>
                {unlockMutation.isPending ? 'Unlocking...' : 'Unlock'}
              </Button>}>
              Account locked — {loginStatus.failedLoginAttempts} failed login attempt(s)
            </Alert>
          )}

          <SectionHeader>Identity</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <Box sx={{ display: 'flex', gap: '2px' }}>
                <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0 }}>
                  <Controller name='firstName' control={control} rules={isRequired('name') ? { required: 'First name is required' } : undefined}
                    render={({ field, fieldState }) => (
                      <CustomTextField {...field} fullWidth label='First Name' required={isRequired('name')} error={!!fieldState.error} helperText={fieldState.error?.message} />
                    )} />
                </Box>
                <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0 }}>
                  <Controller name='lastName' control={control}
                    render={({ field }) => (
                      <CustomTextField {...field} fullWidth label='Last Name' />
                    )} />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: '2px' }}>
                <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0 }}>
                  <Controller name='role' control={control}
                    render={({ field }) => (
                      <CustomTextField {...field} select fullWidth label='Role'>
                        <MenuItem value=''>— None —</MenuItem>
                        {roles.map(r => <MenuItem key={r.id} value={r.value}>{r.label}</MenuItem>)}
                      </CustomTextField>
                    )} />
                </Box>
                <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0 }}>
                  <Controller name='status' control={control}
                    render={({ field }) => (
                      <CustomTextField {...field} select fullWidth label='Status'>
                        {STATUS_OPTIONS.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                      </CustomTextField>
                    )} />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: '2px' }}>
                <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0 }}>
                  <Controller name='department' control={control}
                    render={({ field }) => (
                      <CustomTextField {...field} select fullWidth label='Department'>
                        <MenuItem value=''>— None —</MenuItem>
                        {departments.map(d => <MenuItem key={d.id} value={d.value}>{d.label}</MenuItem>)}
                      </CustomTextField>
                    )} />
                </Box>
                <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0 }}>
                  <Controller name='gender' control={control}
                    render={({ field }) => (
                      <CustomTextField {...field} select fullWidth label='Gender'>
                        {GENDER_OPTIONS.map(g => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
                      </CustomTextField>
                    )} />
                </Box>
              </Box>
            </Box>
          </Box>

          <SectionHeader>Contact</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <Controller name='email' control={control}
                render={({ field }) => <CustomTextField {...field} fullWidth label='Email' type='email' />} />
              <Controller name='phone' control={control}
                render={({ field }) => <CustomTextField {...field} fullWidth label='Phone' />} />
            </Box>
          </Box>

          <SectionHeader>Address</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <Controller name='street' control={control}
                render={({ field }) => <CustomTextField {...field} fullWidth label='Street' />} />
              <Box sx={{ display: 'flex', gap: '2px' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Controller name='city' control={control}
                    render={({ field }) => <CustomTextField {...field} fullWidth label='City' />} />
                </Box>
                <Box sx={{ flex: '0 0 100px', minWidth: 0 }}>
                  <Controller name='state' control={control}
                    render={({ field }) => <CustomTextField {...field} fullWidth label='State' />} />
                </Box>
                <Box sx={{ flex: '0 0 110px', minWidth: 0 }}>
                  <Controller name='zipCode' control={control}
                    render={({ field }) => <CustomTextField {...field} fullWidth label='ZIP' />} />
                </Box>
              </Box>
            </Box>
          </Box>

          <SectionHeader>Notes</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <Controller name='notes' control={control}
                render={({ field }) => <CustomTextField {...field} fullWidth label='Notes' multiline minRows={2} />} />
            </Box>
          </Box>

          <SectionHeader>Internal Notes (Admin Only)</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'warning.lighter' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <Controller name='internalNotes' control={control}
                render={({ field }) => <CustomTextField {...field} fullWidth label='Internal Notes' multiline minRows={2} />} />
            </Box>
          </Box>

          {!isNew && !inline && !member?.isDefault && (
            <Box sx={{ px: '2px', py: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant='tonal' color='error' startIcon={<i className='tabler-trash' />} onClick={() => setDeleteDlgOpen(true)} disabled={saveMutation.isPending || deleteMutation.isPending}>
                Delete Member
              </Button>
            </Box>
          )}

        </Box>
      )}
    </Box>
  )

  return (
    <>
      {inline ? (
        formContent
      ) : (
        <EditPanel
          open={open}
          onClose={onClose}
          onSave={handleSubmit(onSubmit)}
          title={isNew ? 'New Team Member' : 'Edit Team Member'}
          isSaving={saveMutation.isPending}
          saveDisabled={!isValid || saveMutation.isPending}
          hasUnsavedChanges={formIsDirty}
        >
          {formContent}
        </EditPanel>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDlgOpen} onClose={() => setDeleteDlgOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className='tabler-alert-triangle text-error text-2xl' />
          Delete Team Member?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>&ldquo;{member?.name}&rdquo;</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setDeleteDlgOpen(false)} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button variant='contained' color='error' onClick={handleDelete} disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-trash' />}>
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
