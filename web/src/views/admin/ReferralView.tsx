'use client'

import { useState, useEffect } from 'react'
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
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Referral, CreateReferralRequest } from '@shared/contracts'
import { ALPHA, COLORS } from '../../theme/designTokens'


type StatusFilter = 'all' | 'sent' | 'redeemed'

const STATUS_CHIPS: { value: StatusFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: 'tabler-list' },
  { value: 'sent', label: 'Sent', icon: 'tabler-send' },
  { value: 'redeemed', label: 'Redeemed', icon: 'tabler-check' },
]

function getStatusStyle(status: string): { icon: string; color: string; bg: string; label: string } {
  switch (status) {
    case 'sent': return { icon: 'tabler-send', color: COLORS.info, bg: 'rgba(59,130,246,0.1)', label: 'Sent' }
    case 'redeemed': return { icon: 'tabler-circle-check', color: COLORS.successGreenAlt, bg: 'rgba(22,163,106,0.1)', label: 'Redeemed' }
    default: return { icon: 'tabler-help', color: COLORS.gray500, bg: 'rgba(107,114,128,0.1)', label: status }
  }
}

/**
 * Referral tracking view for monitoring client referral sources and campaigns.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/admin/ReferralView.tsx
 */
export default function ReferralView() {
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [messageType, setMessageType] = useState<string>('')
  const [customMessage, setCustomMessage] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  // Fetch referral reasons from lookup API
  const { data: reasons } = useQuery({
    queryKey: ['lookups', 'referralReason'],
    queryFn: () => api.get<any[]>('/api/lookups/referralReason'),
  })
  const referralReasons = reasons || []

  // Set default reason
  useEffect(() => {
    if (!messageType && referralReasons.length > 0) setMessageType(referralReasons[0].id)
  }, [referralReasons.length])

  // Fetch existing referrals
  const { data, isLoading } = useQuery({
    queryKey: ['referrals', statusFilter],
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      return api.get<{ data: Referral[]; total: number }>(`/api/referrals${params}`)
    },
  })
  const referrals = data?.data ?? []
  const total = data?.total ?? 0

  // Create referral
  const createMutation = useMutation({
    mutationFn: (payload: CreateReferralRequest) => api.post<Referral>('/api/referrals', payload),
    onSuccess: (res: Referral) => {
      setFullName(''); setEmail(''); setPhone(''); setCustomMessage('')
      setSubmitSuccess(res.referralCode)
      setTimeout(() => setSubmitSuccess(null), 8000)
      queryClient.invalidateQueries({ queryKey: ['referrals'] })
    },
  })

  // Delete referral
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<any>(`/api/referrals/id/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['referrals'] }),
  })

  const handleSubmit = () => {
    if (!fullName.trim()) return
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    createMutation.mutate({
      referredName: fullName.trim(),
      referredEmail: email.trim().toLowerCase(),
      referredPhone: phone.trim() || null,
      messageType: messageType || null,
      customMessage: customMessage.trim() || null,
    })
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <Typography variant='h4' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <i className='tabler-gift text-[28px]' style={{ color: COLORS.warning }} />
        Refer a Friend
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 4 }}>
        Share JobMaster with others and earn rewards when they sign up.
      </Typography>

      {/* ═══ REFERRAL FORM ════════════════════════════════════ */}
      <Box sx={{
        border: `1.5px solid ${COLORS.warning}`, borderRadius: 3, overflow: 'hidden', mb: 5,
        background: `linear-gradient(135deg, ${ALPHA.warningBgAmber} 0%, ${ALPHA.warningBgOrange} 100%)`,
      }}>
        {/* Hero banner */}
        <Box sx={{ textAlign: 'center', pt: 4, pb: 2, px: 3 }}>
          <Typography sx={{ fontSize: '3rem', mb: 1 }}>🐷</Typography>
          <Typography variant='h5' fontWeight={700} sx={{ color: COLORS.warningBrown }}>Share the Wealth!</Typography>
          <Typography variant='body2' sx={{ color: COLORS.warningBrownAlt, mt: 0.5 }}>
            Refer a friend and get rewarded when they sign up with your unique code
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          {submitSuccess && (
            <Alert severity='success' sx={{ mb: 2 }} icon={<i className='tabler-confetti text-lg' />}>
              Referral sent! Share this code: <strong>{submitSuccess}</strong>
            </Alert>
          )}
          {createMutation.isError && (
            <Alert severity='error' sx={{ mb: 2 }}>Failed to create referral. Please try again.</Alert>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
            <TextField
              label='Full Name *'
              size='small'
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder='John Doe'
              sx={{ bgcolor: 'background.paper' }}
            />
            <TextField
              label='Email *'
              size='small'
              type='email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder='john@example.com'
              sx={{ bgcolor: 'background.paper' }}
            />
            <TextField
              label='Phone (Optional)'
              size='small'
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder='(555) 555-5555'
              sx={{ bgcolor: 'background.paper' }}
            />
            <FormControl size='small' sx={{ bgcolor: 'background.paper' }}>
              <InputLabel>Reason for Referral</InputLabel>
              <Select
                label='Reason for Referral'
                value={messageType}
                onChange={e => setMessageType(e.target.value)}
              >
                {referralReasons.map((r: any) => (
                  <MenuItem key={r.id} value={r.id}>{r.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TextField
            label='Additional Message (Optional)'
            size='small'
            fullWidth
            multiline
            rows={2}
            value={customMessage}
            onChange={e => setCustomMessage(e.target.value)}
            placeholder='Add a personal note...'
            inputProps={{ maxLength: 200 }}
            sx={{ mb: 1, bgcolor: 'background.paper' }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='caption' color='text.disabled'>{customMessage.length}/200</Typography>
            <Button
              variant='contained'
              onClick={handleSubmit}
              disabled={!fullName.trim() || !email.trim() || createMutation.isPending}
              startIcon={createMutation.isPending ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-send text-sm' />}
              sx={{ borderRadius: '8px', textTransform: 'none', bgcolor: COLORS.warning, '&:hover': { bgcolor: COLORS.warningDark } }}
            >
              {createMutation.isPending ? 'Sending...' : 'Send Referral'}
            </Button>
          </Box>

          <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.08)' }}>
            <Typography variant='caption' color='text.secondary'>
              ✨ When your friend signs up using your referral code, they'll get a discount and you'll both earn rewards!
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* ═══ REFERRAL LIST ════════════════════════════════════ */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant='h6' fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className='tabler-users-plus text-[20px]' />
          Sent Referrals ({total})
        </Typography>
      </Box>

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

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : referrals.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <i className='tabler-gift-off text-[48px]' style={{ color: 'var(--mui-palette-text-disabled)' }} />
          <Typography color='text.secondary' sx={{ mt: 2 }}>No referrals yet. Send your first one above!</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {referrals.map((r: Referral) => {
            const style = getStatusStyle(r.status)
            return (
              <Box
                key={r.id}
                sx={{
                  border: 1, borderColor: 'divider', borderRadius: 2, p: 2.5,
                  bgcolor: 'background.paper',
                  transition: 'box-shadow 0.15s', '&:hover': { boxShadow: 2 },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant='body1' fontWeight={600}>{r.referredName}</Typography>
                    <Chip
                      label={style.label}
                      icon={<i className={`${style.icon} text-[12px]`} style={{ color: style.color }} />}
                      size='small'
                      sx={{ bgcolor: style.bg, color: style.color, fontWeight: 600, fontSize: '0.7rem', height: 22 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title='Copy referral code'>
                      <Chip
                        label={r.referralCode}
                        size='small'
                        onClick={() => { navigator.clipboard.writeText(r.referralCode); }}
                        icon={<i className='tabler-copy text-[12px]' />}
                        sx={{ fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                      />
                    </Tooltip>
                    <Tooltip title='Delete'>
                      <IconButton
                        size='small'
                        onClick={() => { if (confirm('Delete this referral?')) deleteMutation.mutate(r.id) }}
                        sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                      >
                        <i className='tabler-trash text-sm' />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Typography variant='body2' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <i className='tabler-mail text-sm' /> {r.referredEmail}
                  </Typography>
                  {r.referredPhone && (
                    <Typography variant='body2' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <i className='tabler-phone text-sm' /> {r.referredPhone}
                    </Typography>
                  )}
                  <Typography variant='caption' color='text.disabled'>
                    {new Date(r.creAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Typography>
                </Box>

                {r.customMessage && (
                  <Typography variant='body2' color='text.secondary' fontStyle='italic' sx={{ mt: 1, pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
                    {r.customMessage}
                  </Typography>
                )}
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
