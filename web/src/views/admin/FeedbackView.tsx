'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Suggestion } from '@shared/contracts'
import { COLORS } from '../../theme/designTokens'


type StatusFilter = 'all' | 'submitted' | 'accepted' | 'rejected'

const STATUS_CHIPS: { value: StatusFilter; label: string; icon: string; color: string }[] = [
  { value: 'all', label: 'All', icon: 'tabler-list', color: 'default' },
  { value: 'submitted', label: 'Submitted', icon: 'tabler-clock', color: COLORS.orange },
  { value: 'accepted', label: 'Accepted', icon: 'tabler-check', color: COLORS.successGreenAlt },
  { value: 'rejected', label: 'Rejected', icon: 'tabler-x', color: COLORS.errorDark },
]

function getStatusStyle(status: string): { icon: string; color: string; bg: string; label: string } {
  switch (status) {
    case 'submitted': return { icon: 'tabler-clock', color: COLORS.orange, bg: 'rgba(249,115,22,0.1)', label: 'Submitted' }
    case 'accepted': return { icon: 'tabler-check', color: COLORS.successGreenAlt, bg: 'rgba(22,163,106,0.1)', label: 'Accepted' }
    case 'rejected': return { icon: 'tabler-x', color: COLORS.errorDark, bg: 'rgba(220,38,38,0.1)', label: 'Rejected' }
    default: return { icon: 'tabler-help', color: COLORS.gray500, bg: 'rgba(107,114,128,0.1)', label: status }
  }
}

// ═══════════════════════════════════════════════════════════════════
// FEEDBACK VIEW — Two sections:
//   1. Submit form (any user)
//   2. Admin list (view/accept/reject all suggestions)
// ═══════════════════════════════════════════════════════════════════
/**
 * User feedback collection view with sentiment tracking and response management.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/admin/FeedbackView.tsx
 */
export default function FeedbackView() {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Fetch current user + company for submission metadata
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get<any[]>('/api/users') })
  const { data: company } = useQuery({ queryKey: ['company'], queryFn: () => api.get<any>('/api/company') })

  // Fetch suggestions for admin view
  const { data, isLoading } = useQuery({
    queryKey: ['suggestions', statusFilter],
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      return api.get<{ suggestions: Suggestion[]; total: number }>(`/api/suggestions${params}`)
    },
  })

  const suggestions = data?.suggestions ?? []
  const total = data?.total ?? 0

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: () => api.post<any>('/api/suggestions', {
      feedback: feedback.trim(),
      userId: users?.[0]?.id || 'unknown',
      companyId: company?.id || 'unknown',
    }),
    onSuccess: () => {
      setFeedback('')
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 5000)
      queryClient.invalidateQueries({ queryKey: ['suggestions'] })
    },
  })

  // Status update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<any>(`/api/suggestions/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suggestions'] }),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<any>(`/api/suggestions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suggestions'] }),
  })

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <Typography variant='h4' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <i className='tabler-message-2 text-[28px]' style={{ color: 'var(--mui-palette-primary-main)' }} />
        Feedback & Suggestions
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 4 }}>
        Share your ideas to help us improve JobMaster, or manage submitted feedback.
      </Typography>

      {/* ═══ SUBMIT SECTION ═══════════════════════════════════ */}
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 5, bgcolor: 'background.paper' }}>
        <Typography variant='h6' fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <i className='tabler-bulb text-[20px]' style={{ color: COLORS.warning }} />
          Submit Feedback
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          Have an idea, suggestion, or something you'd like to see improved? Let us know!
        </Typography>

        {submitSuccess && (
          <Alert severity='success' sx={{ mb: 2 }}>
            Thank you! Your feedback has been submitted successfully.
          </Alert>
        )}

        {submitMutation.isError && (
          <Alert severity='error' sx={{ mb: 2 }}>
            Failed to submit feedback. Please try again.
          </Alert>
        )}

        <TextField
          multiline
          rows={4}
          fullWidth
          placeholder='Tell us what you think...'
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          inputProps={{ maxLength: 1000 }}
          sx={{ mb: 1 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant='caption' color='text.disabled'>{feedback.length}/1000</Typography>
          <Button
            variant='contained'
            onClick={() => submitMutation.mutate()}
            disabled={!feedback.trim() || submitMutation.isPending}
            startIcon={submitMutation.isPending ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-send text-sm' />}
            sx={{ borderRadius: '8px', textTransform: 'none' }}
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* ═══ ADMIN LIST SECTION ════════════════════════════════ */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant='h6' fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className='tabler-inbox text-[20px]' />
          All Feedback ({total})
        </Typography>
      </Box>

      {/* Status filter chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {STATUS_CHIPS.map(chip => (
          <Chip
            key={chip.value}
            label={chip.label}
            icon={<i className={`${chip.icon} text-[13px]`} />}
            size='small'
            variant={statusFilter === chip.value ? 'filled' : 'outlined'}
            color={statusFilter === chip.value ? 'primary' : 'default'}
            onClick={() => setStatusFilter(chip.value)}
          />
        ))}
      </Box>

      {/* List */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : suggestions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <i className='tabler-message-off text-[48px]' style={{ color: 'var(--mui-palette-text-disabled)' }} />
          <Typography color='text.secondary' sx={{ mt: 2 }}>No feedback submissions yet.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {suggestions.map((s: Suggestion) => {
            const style = getStatusStyle(s.status)
            return (
              <Box
                key={s.id}
                sx={{
                  border: 1, borderColor: 'divider', borderRadius: 2, p: 2.5,
                  bgcolor: 'background.paper',
                  transition: 'box-shadow 0.15s',
                  '&:hover': { boxShadow: 2 },
                }}
              >
                {/* Status + date header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Chip
                    label={style.label}
                    icon={<i className={`${style.icon} text-[12px]`} style={{ color: style.color }} />}
                    size='small'
                    sx={{ bgcolor: style.bg, color: style.color, fontWeight: 600, fontSize: '0.7rem', height: 24 }}
                  />
                  <Typography variant='caption' color='text.disabled'>
                    {new Date(s.creAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}
                    {new Date(s.creAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </Typography>
                </Box>

                {/* Feedback text */}
                <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', mb: 1.5, lineHeight: 1.6 }}>
                  {s.feedback}
                </Typography>

                {/* Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant='caption' color='text.disabled'>
                    {s.creBy && `by ${s.creBy}`}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {s.status === 'submitted' && (
                      <>
                        <Tooltip title='Accept'>
                          <IconButton
                            size='small'
                            onClick={() => updateMutation.mutate({ id: s.id, status: 'accepted' })}
                            disabled={updateMutation.isPending}
                            sx={{ color: COLORS.successGreenAlt, bgcolor: 'rgba(22,163,106,0.1)', '&:hover': { bgcolor: 'rgba(22,163,106,0.2)' } }}
                          >
                            <i className='tabler-check text-sm' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Reject'>
                          <IconButton
                            size='small'
                            onClick={() => updateMutation.mutate({ id: s.id, status: 'rejected' })}
                            disabled={updateMutation.isPending}
                            sx={{ color: COLORS.errorDark, bgcolor: 'rgba(220,38,38,0.1)', '&:hover': { bgcolor: 'rgba(220,38,38,0.2)' } }}
                          >
                            <i className='tabler-x text-sm' />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip title='Delete'>
                      <IconButton
                        size='small'
                        onClick={() => { if (confirm('Delete this feedback?')) deleteMutation.mutate(s.id) }}
                        sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                      >
                        <i className='tabler-trash text-sm' />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
