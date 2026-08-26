'use client'

import { useState, useEffect } from 'react'

import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'

export interface BrandSetting {
  id: string
  key: string
  label: string
  value_text: string
  value_json: Record<string, any>
  sort_order: number
  mod_dt: string
}

interface VideoBrandSettingsDialogProps {
  open: boolean
  onClose: () => void
}

const SETTING_ICONS: Record<string, string> = {
  production_rules: 'tabler-movie',
  cta_system: 'tabler-speakerphone',
  rollout_plan: 'tabler-calendar-event',
  platform_guidance: 'tabler-device-mobile',
  visual_rules: 'tabler-palette',
  forbidden_language: 'tabler-alert-triangle',
  broll_library: 'tabler-photo-video',
  measurement_dashboard: 'tabler-chart-pie',
}

const SETTING_BADGES: Record<string, string> = {
  production_rules: 'Core Standards',
  cta_system: 'Conversion Engine',
  rollout_plan: 'Cadence & Schedule',
  platform_guidance: 'Social Channels',
  visual_rules: 'Design Guidelines',
  forbidden_language: 'Compliance & Legal',
  broll_library: 'Visual Assets',
  measurement_dashboard: 'Analytics & KPIs',
}

export default function VideoBrandSettingsDialog({ open, onClose }: VideoBrandSettingsDialogProps) {
  const [settings, setSettings] = useState<BrandSetting[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('production_rules')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editJson, setEditJson] = useState('')
  const [showJsonMode, setShowJsonMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchSettings = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/video-brand-settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        if (data.length > 0 && !activeTab) {
          setActiveTab(data[0].key)
        }
      } else {
        setError('Failed to load brand guidelines.')
      }
    } catch {
      setError('Error connecting to brand settings API.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchSettings()
      setEditingKey(null)
      setSuccess('')
    }
  }, [open])

  const handleStartEdit = (setting: BrandSetting) => {
    setEditingKey(setting.key)
    setEditText(setting.value_text)
    setEditJson(JSON.stringify(setting.value_json || {}, null, 2))
  }

  const handleSaveEdit = async (setting: BrandSetting) => {
    setSaving(true)
    setError('')
    setSuccess('')

    let parsedJson = setting.value_json || {}
    if (editJson.trim()) {
      try {
        parsedJson = JSON.parse(editJson)
      } catch (e: any) {
        setError(`Invalid JSON in Settings field: ${e.message}`)
        setSaving(false)
        return
      }
    }

    try {
      const res = await fetch('/api/video-brand-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: setting.key,
          value_text: editText,
          value_json: parsedJson,
        }),
      })

      if (res.ok) {
        const updated = await res.json()
        setSettings(prev => prev.map(s => (s.key === updated.key ? updated : s)))
        setEditingKey(null)
        setSuccess(`Saved ${setting.label} successfully!`)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save changes.')
      }
    } catch {
      setError('Network error saving brand setting.')
    } finally {
      setSaving(false)
    }
  }

  const currentSetting = settings.find(s => s.key === activeTab) || settings[0]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          minHeight: 640,
          bgcolor: 'background.paper',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2.5,
          px: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(115, 103, 240, 0.35)',
            }}
          >
            <i className='tabler-book-2 text-[22px]' />
          </Box>
          <Box>
            <Typography variant='h6' fontWeight={700} sx={{ lineHeight: 1.2 }}>
              FedSafe Video Production Rules & Brand Bible
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              Source: Mike Zaino — Social Media Script Library V2 & Rollout Strategy
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size='small'
            variant='outlined'
            color='secondary'
            startIcon={<i className='tabler-brand-google-drive' />}
            href='https://docs.google.com/document/d/1sKs7udDUjNi-W1YudE5PY9nlWEvfC9447nDU0VAT4fo/edit'
            target='_blank'
            rel='noopener noreferrer'
            sx={{ fontSize: 11 }}
          >
            Google Doc
          </Button>
          <IconButton size='small' onClick={onClose} sx={{ color: 'text.secondary' }}>
            <i className='tabler-x text-[20px]' />
          </IconButton>
        </Box>
      </Box>

      {/* Body Content with Tabs */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, flex: 1, minHeight: 520 }}>
        {/* Left Side: Navigation Tabs */}
        <Box
          sx={{
            width: { xs: '100%', md: 280 },
            borderRight: { md: '1px solid' },
            borderColor: 'divider',
            bgcolor: 'action.hover',
            p: 1.5,
          }}
        >
          <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ px: 1.5, mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Guideline Categories
          </Typography>
          <Tabs
            orientation='vertical'
            value={activeTab}
            onChange={(_, val) => {
              setActiveTab(val)
              setEditingKey(null)
              setError('')
            }}
            variant='scrollable'
            sx={{
              '& .MuiTab-root': {
                alignItems: 'center',
                justifyContent: 'flex-start',
                textAlign: 'left',
                minHeight: 48,
                borderRadius: 1.5,
                mb: 0.5,
                px: 1.5,
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  bgcolor: 'primary.lightOpacity',
                  color: 'primary.main',
                  fontWeight: 700,
                },
              },
            }}
          >
            {settings.map(s => (
              <Tab
                key={s.key}
                value={s.key}
                icon={<i className={`${SETTING_ICONS[s.key] || 'tabler-file-text'} text-[18px]`} />}
                iconPosition='start'
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', ml: 1, overflow: 'hidden' }}>
                    <Typography variant='body2' fontWeight={600} noWrap sx={{ width: '100%' }}>
                      {s.label}
                    </Typography>
                    <Typography variant='caption' color='text.disabled' sx={{ fontSize: 10 }}>
                      {SETTING_BADGES[s.key] || 'Guidance'}
                    </Typography>
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        {/* Right Side: Active Guideline Details */}
        <Box sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
              <CircularProgress />
            </Box>
          ) : currentSetting ? (
            <>
              {/* Category Title & Actions */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <i className={`${SETTING_ICONS[currentSetting.key] || 'tabler-file-text'} text-[24px] text-primary`} />
                  <Box>
                    <Typography variant='h6' fontWeight={700}>
                      {currentSetting.label}
                    </Typography>
                    <Chip
                      label={SETTING_BADGES[currentSetting.key] || 'Production Rule'}
                      size='small'
                      color='primary'
                      variant='tonal'
                      sx={{ height: 20, fontSize: 10, fontWeight: 700, mt: 0.25 }}
                    />
                  </Box>
                </Box>

                {editingKey !== currentSetting.key ? (
                  <Button
                    size='small'
                    variant='outlined'
                    color='primary'
                    startIcon={<i className='tabler-edit' />}
                    onClick={() => handleStartEdit(currentSetting)}
                  >
                    Edit Rule
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size='small'
                      variant='outlined'
                      color='inherit'
                      onClick={() => setEditingKey(null)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      size='small'
                      variant='contained'
                      color='primary'
                      startIcon={saving ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-check' />}
                      onClick={() => handleSaveEdit(currentSetting)}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : 'Save Changes'}
                    </Button>
                  </Box>
                )}
              </Box>

              {error && (
                <Alert severity='error' onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity='success' onClose={() => setSuccess('')}>
                  {success}
                </Alert>
              )}

              {/* Sub-toggle: Formatted Text vs JSON Settings */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 }}>
                <Tabs
                  value={showJsonMode ? 'json' : 'text'}
                  onChange={(_, val) => setShowJsonMode(val === 'json')}
                  sx={{ minHeight: 32 }}
                >
                  <Tab value='text' label='📝 Text Guidance' sx={{ minHeight: 32, py: 0.5, fontSize: 12, fontWeight: 600 }} />
                  <Tab value='json' label='⚙️ JSON Settings' sx={{ minHeight: 32, py: 0.5, fontSize: 12, fontWeight: 600 }} />
                </Tabs>

                {showJsonMode && (
                  <Typography variant='caption' color='text.secondary'>
                    Custom JSON configuration payload (stored in <code style={{ color: '#818cf8' }}>settings / value_json</code>)
                  </Typography>
                )}
              </Box>

              {/* Content Display or Editor */}
              {editingKey === currentSetting.key ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
                  {!showJsonMode ? (
                    <>
                      <Typography variant='caption' color='text.secondary'>
                        Edit the guidance text for all video production prompts and creator references.
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        minRows={14}
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        sx={{
                          '& .MuiInputBase-root': {
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            lineHeight: 1.6,
                          },
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <Typography variant='caption' color='text.secondary'>
                        Edit extensible JSON parameters (e.g. platform targeting, keyword rules, model parameters).
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        minRows={14}
                        value={editJson}
                        onChange={e => setEditJson(e.target.value)}
                        placeholder='{\n  "custom_parameter": "value"\n}'
                        sx={{
                          '& .MuiInputBase-root': {
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            lineHeight: 1.6,
                          },
                        }}
                      />
                    </>
                  )}
                </Box>
              ) : (
                <Box
                  sx={{
                    p: 2.5,
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    flex: 1,
                    overflowY: 'auto',
                  }}
                >
                  {!showJsonMode ? (
                    <Typography
                      component='pre'
                      sx={{
                        fontFamily: 'inherit',
                        fontSize: '13.5px',
                        lineHeight: 1.7,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: 'text.primary',
                        m: 0,
                      }}
                    >
                      {currentSetting.value_text}
                    </Typography>
                  ) : (
                    <Typography
                      component='pre'
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: '#818cf8',
                        m: 0,
                      }}
                    >
                      {JSON.stringify(currentSetting.value_json || {}, null, 2)}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Footer Note */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
                <Typography variant='caption' color='text.disabled'>
                  Applies globally across all 60 Reel scripts & timeline compositions
                </Typography>
                <Typography variant='caption' color='text.disabled'>
                  Last modified: {new Date(currentSetting.mod_dt || Date.now()).toLocaleDateString()}
                </Typography>
              </Box>
            </>
          ) : (
            <Typography variant='body2' color='text.secondary'>
              No setting selected.
            </Typography>
          )}
        </Box>
      </Box>
    </Dialog>
  )
}
