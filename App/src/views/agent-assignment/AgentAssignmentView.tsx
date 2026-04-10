'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'

// ── US States lookup ────────────────────────────────────────────────────────
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

interface Agent {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  role: string
}

interface Territory {
  id: string
  state: string
  city: string
  notes: string
  cre_dt: string
  agent: Agent
}

function agentInitials(a: Agent) {
  return `${a.first_name?.[0] || ''}${a.last_name?.[0] || ''}`.toUpperCase()
}

function agentFullName(a: Agent) {
  return `${a.first_name} ${a.last_name}`.trim()
}

const STATE_COLORS: Record<string, string> = {}
const PALETTE = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16','#06b6d4']
let _ci = 0
function stateColor(state: string) {
  if (!STATE_COLORS[state]) { STATE_COLORS[state] = PALETTE[_ci++ % PALETTE.length] }
  return STATE_COLORS[state]
}

// ── Add Territory Dialog ────────────────────────────────────────────────────
function AddTerritoryDialog({
  open, agents, onClose, onSaved,
}: {
  open: boolean
  agents: Agent[]
  onClose: () => void
  onSaved: () => void
}) {
  const [agentId, setAgentId] = useState('')
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (!open) { setAgentId(''); setState(''); setCity(''); setNotes(''); setError('') } }, [open])

  const handleSave = async () => {
    if (!agentId || !state) { setError('Agent and State are required.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/agent-territories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, state, city, notes }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      onSaved()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <i className='tabler-map-pin-plus' style={{ fontSize: 22 }} />
          Assign Territory
        </Box>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
        {error && (
          <Typography color='error' variant='body2'>{error}</Typography>
        )}

        <FormControl fullWidth>
          <InputLabel>Agent *</InputLabel>
          <Select value={agentId} onChange={e => setAgentId(e.target.value)} label='Agent *'>
            {agents.map(a => (
              <MenuItem key={a.id} value={a.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.main' }}>{agentInitials(a)}</Avatar>
                  <Box>
                    <Typography variant='body2' fontWeight={600}>{agentFullName(a)}</Typography>
                    <Typography variant='caption' color='text.secondary'>{a.email}</Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>State *</InputLabel>
          <Select value={state} onChange={e => setState(e.target.value)} label='State *'>
            {US_STATES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>

        <TextField
          label='City (leave blank for entire state)'
          value={city}
          onChange={e => setCity(e.target.value)}
          fullWidth
          placeholder='e.g. Chicago'
        />

        <TextField
          label='Notes'
          value={notes}
          onChange={e => setNotes(e.target.value)}
          fullWidth
          multiline
          rows={2}
          placeholder='Optional notes about this territory'
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant='tonal' color='secondary'>Cancel</Button>
        <Button onClick={handleSave} variant='contained' disabled={saving} startIcon={saving ? <CircularProgress size={14} /> : <i className='tabler-check' />}>
          Save Assignment
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Main View ───────────────────────────────────────────────────────────────
export default function AgentAssignmentView() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAgent, setFilterAgent] = useState<Agent | null>(null)
  const [filterState, setFilterState] = useState('')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [ar, tr] = await Promise.all([
        fetch('/api/agents').then(r => r.json()),
        fetch('/api/agent-territories').then(r => r.json()),
      ])
      if (Array.isArray(ar)) setAgents(ar)
      if (Array.isArray(tr)) setTerritories(tr)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await fetch(`/api/agent-territories?id=${id}`, { method: 'DELETE' })
      setTerritories(prev => prev.filter(t => t.id !== id))
    } finally { setDeleting(null) }
  }

  const filtered = useMemo(() => {
    return territories.filter(t => {
      if (filterAgent && t.agent.id !== filterAgent.id) return false
      if (filterState && t.state !== filterState) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          t.state.toLowerCase().includes(q) ||
          t.city.toLowerCase().includes(q) ||
          agentFullName(t.agent).toLowerCase().includes(q) ||
          t.agent.email.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [territories, filterAgent, filterState, search])

  // Group filtered territories by state
  const byState = useMemo(() => {
    const map: Record<string, Territory[]> = {}
    filtered.forEach(t => {
      if (!map[t.state]) map[t.state] = []
      map[t.state].push(t)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  // Summary stats
  const stats = useMemo(() => {
    const statesCount = new Set(territories.map(t => t.state)).size
    const agentsAssigned = new Set(territories.map(t => t.agent.id)).size
    const sharedTerritories = (() => {
      const key = (t: Territory) => `${t.state}||${t.city}`
      const c: Record<string, number> = {}
      territories.forEach(t => { const k = key(t); c[k] = (c[k] || 0) + 1 })
      return Object.values(c).filter(v => v > 1).length
    })()
    return { statesCount, agentsAssigned, total: territories.length, sharedTerritories }
  }, [territories])

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h4' fontWeight={700} sx={{ mb: 0.5 }}>Agent Assignment</Typography>
          <Typography variant='body2' color='text.secondary'>Define and manage agent territory coverage by state and city</Typography>
        </Box>
        <Button
          variant='contained'
          startIcon={<i className='tabler-plus' />}
          onClick={() => setDialogOpen(true)}
          disabled={agents.length === 0}
        >
          Assign Territory
        </Button>
      </Box>

      {/* Stats Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2, mb: 4 }}>
        {[
          { label: 'Total Assignments', value: stats.total, icon: 'tabler-map-pins', color: '#6366f1' },
          { label: 'States Covered', value: stats.statesCount, icon: 'tabler-map', color: '#0ea5e9' },
          { label: 'Active Agents', value: `${stats.agentsAssigned} / ${agents.length}`, icon: 'tabler-users', color: '#10b981' },
          { label: 'Shared Territories', value: stats.sharedTerritories, icon: 'tabler-users-group', color: '#f59e0b' },
        ].map(s => (
          <Card key={s.label} variant='outlined' sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: 20, flexShrink: 0 }}>
                <i className={s.icon} />
              </Box>
              <Box>
                <Typography variant='h6' fontWeight={700}>{s.value}</Typography>
                <Typography variant='caption' color='text.secondary'>{s.label}</Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size='small'
          placeholder='Search state, city, agent...'
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 240 }}
          InputProps={{
            startAdornment: <InputAdornment position='start'><i className='tabler-search' style={{ fontSize: 16 }} /></InputAdornment>,
          }}
        />
        <Autocomplete<Agent>
          size='small'
          options={agents}
          getOptionLabel={a => agentFullName(a)}
          value={filterAgent}
          onChange={(_, v) => setFilterAgent(v)}
          sx={{ minWidth: 200 }}
          renderInput={params => <TextField {...params} placeholder='Filter by agent' />}
        />
        <FormControl size='small' sx={{ minWidth: 130 }}>
          <Select value={filterState} onChange={e => setFilterState(e.target.value)} displayEmpty>
            <MenuItem value=''>All states</MenuItem>
            {US_STATES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        {(filterAgent || filterState || search) && (
          <Button size='small' variant='tonal' color='secondary' onClick={() => { setFilterAgent(null); setFilterState(''); setSearch('') }}>
            Clear
          </Button>
        )}
      </Box>

      {/* Agent Roster */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
        {agents.map(agent => {
          const agentTerritories = territories.filter(t => t.agent.id === agent.id)
          const isFiltered = filterAgent?.id === agent.id
          return (
            <Card
              key={agent.id}
              variant='outlined'
              onClick={() => setFilterAgent(isFiltered ? null : agent)}
              sx={{
                borderRadius: 2.5,
                cursor: 'pointer',
                transition: 'all .15s ease',
                borderColor: isFiltered ? 'primary.main' : undefined,
                bgcolor: isFiltered ? 'primary.main' + '0A' : undefined,
                '&:hover': { borderColor: 'primary.main', boxShadow: '0 2px 12px rgba(99,102,241,.12)' },
              }}
            >
              <CardContent sx={{ p: '14px !important', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 42, height: 42, fontSize: 15, fontWeight: 700, bgcolor: 'primary.main' }}>
                  {agentInitials(agent)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant='body2' fontWeight={700} noWrap>{agentFullName(agent)}</Typography>
                  <Typography variant='caption' color='text.secondary' noWrap>{agent.email}</Typography>
                </Box>
                <Chip
                  label={agentTerritories.length}
                  size='small'
                  color={agentTerritories.length > 0 ? 'primary' : 'default'}
                  variant={agentTerritories.length > 0 ? 'tonal' : 'outlined'}
                  sx={{ fontSize: 11, height: 22, minWidth: 28 }}
                />
              </CardContent>
            </Card>
          )
        })}
      </Box>

      {/* Territories by State */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
      ) : byState.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <i className='tabler-map-off' style={{ fontSize: 48, opacity: .3 }} />
          <Typography color='text.secondary' sx={{ mt: 2 }}>No territory assignments found</Typography>
          <Button variant='contained' sx={{ mt: 2 }} onClick={() => setDialogOpen(true)}>Assign First Territory</Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {byState.map(([state, rows]) => (
            <Card key={state} variant='outlined' sx={{ borderRadius: 2.5 }}>
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.5,
                borderLeft: `4px solid ${stateColor(state)}`,
                bgcolor: stateColor(state) + '0C',
              }}>
                <Typography fontWeight={800} variant='h6' sx={{ color: stateColor(state), minWidth: 34 }}>{state}</Typography>
                <Chip label={`${rows.length} assignment${rows.length > 1 ? 's' : ''}`} size='small' sx={{ fontSize: 11, height: 20 }} />
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {rows.map((t, i) => (
                  <Box
                    key={t.id}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.25,
                      borderBottom: i < rows.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' },
                      transition: 'background .1s',
                    }}
                  >
                    <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: 'primary.main', flexShrink: 0 }}>
                      {agentInitials(t.agent)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant='body2' fontWeight={600}>{agentFullName(t.agent)}</Typography>
                      <Typography variant='caption' color='text.secondary'>{t.agent.email}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', minWidth: 100 }}>
                      {t.city ? (
                        <Chip label={t.city} size='small' variant='tonal' color='info' sx={{ fontSize: 11, height: 22 }} />
                      ) : (
                        <Chip label='Entire State' size='small' variant='tonal' color='success' sx={{ fontSize: 11, height: 22 }} />
                      )}
                    </Box>
                    {t.notes && (
                      <Tooltip title={t.notes}>
                        <i className='tabler-notes' style={{ fontSize: 16, opacity: .5, cursor: 'help' }} />
                      </Tooltip>
                    )}
                    <Tooltip title='Remove assignment'>
                      <IconButton
                        size='small'
                        color='error'
                        onClick={() => handleDelete(t.id)}
                        disabled={deleting === t.id}
                        sx={{ opacity: .6, '&:hover': { opacity: 1 } }}
                      >
                        {deleting === t.id ? <CircularProgress size={14} /> : <i className='tabler-trash' style={{ fontSize: 15 }} />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            </Card>
          ))}
        </Box>
      )}

      <AddTerritoryDialog
        open={dialogOpen}
        agents={agents}
        onClose={() => setDialogOpen(false)}
        onSaved={() => { setDialogOpen(false); fetchAll() }}
      />
    </Box>
  )
}
