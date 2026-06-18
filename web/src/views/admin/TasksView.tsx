'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import { useRouter } from 'next/navigation'
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, Menu, MenuItem, Select, TextField, Tooltip, Typography,
  Divider, InputLabel, FormControl, Switch, FormControlLabel, Table,
  TableBody, TableCell, TableHead, TableRow, Popover, FormControlLabel as MuiFormControlLabel, Checkbox,
} from '@mui/material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Task, Sprint, ChangelogEntry, CreateChangelogEntryInput, CreateTaskInput, UpdateTaskInput } from '@shared/contracts'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ALPHA, COLORS } from '../../theme/designTokens'


// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['CODE', 'BACKLOG', 'Done', 'WIP']
const DEVICE_OPTIONS = ['web', 'mobile', 'backend', 'swagger', 'all']
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical']

const STATUS_COLOR: Record<string, string> = {
  CODE:    COLORS.warning,
  RUN:     COLORS.info,
  WIP:     COLORS.violet,
  BACKLOG: COLORS.gray500,
  Done:    COLORS.success,
  DONE:    COLORS.success,
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: COLORS.error,
  high:     COLORS.orange,
  medium:   COLORS.warning,
  low:      COLORS.gray500,
}

const STATUS_FILTER_PILLS = ['ALL', 'CODE', 'WIP', 'BACKLOG', 'Done']

function fmtDuration(secs: number): string {
  if (secs < 60)   return `${secs}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}m${secs % 60 ? String(secs % 60).padStart(2,'0')+'s' : ''}`
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return `${h}h${m ? String(m).padStart(2,'0')+'m' : ''}`
}

// ─── Help Dialog ──────────────────────────────────────────────────────────────

function HelpSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <i className={`${icon} text-base`} style={{ color: COLORS.violet }} />
        <Typography variant='subtitle1' fontWeight={700}>{title}</Typography>
      </Box>
      {children}
    </Box>
  )
}

function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const statusRows = [
    { status: 'CODE',    color: COLORS.warning, desc: 'Ready to be picked up by an agent or developer' },
    { status: 'RUN',     color: COLORS.info, desc: 'Currently being worked on by an agent' },
    { status: 'WIP',     color: COLORS.violet, desc: 'In progress — partially done, needs continued work' },
    { status: 'BACKLOG', color: COLORS.gray500, desc: 'Imported or staged — not yet ready for development' },
    { status: 'Done',    color: COLORS.success, desc: 'Completed and verified' },
  ]

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>
        <i className='tabler-help-circle text-xl' style={{ color: COLORS.violet }} />
        <Box>
          <Typography variant='h6' fontWeight={700}>Dev Tasks — Help Guide</Typography>
          <Typography variant='caption' color='text.secondary'>How to use the task board, sprints, and autorun</Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>

        {/* Overview */}
        <HelpSection icon='tabler-layout-list' title='Overview'>
          <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.8 }}>
            Dev Tasks is a lightweight project board backed by the <strong>Corp Supabase database</strong>.
            Tasks can be assigned to sprints, filtered by status, and executed autonomously by the AI autorun agent (Joseph).
            Double-click any row to open the edit dialog.
          </Typography>
        </HelpSection>

        <Divider sx={{ my: 2 }} />

        {/* Status lifecycle */}
        <HelpSection icon='tabler-arrows-right-left' title='Task Status Lifecycle'>
          <Table size='small' sx={{ mb: 1 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Meaning</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {statusRows.map(r => (
                <TableRow key={r.status}>
                  <TableCell sx={{ py: 0.5 }}>
                    <Chip label={r.status} size='small'
                      sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: `${r.color}22`, color: r.color, border: 'none' }} />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <Typography variant='body2' color='text.secondary'>{r.desc}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography variant='caption' color='text.disabled'>
            Typical flow: <strong>BACKLOG → CODE → RUN → Done</strong>
          </Typography>
        </HelpSection>

        <Divider sx={{ my: 2 }} />

        {/* Sprints */}
        <HelpSection icon='tabler-layout-kanban' title='Sprints'>
          <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.8, mb: 1 }}>
            Click <strong>Sprints</strong> in the top-right to open the Sprint Manager. From there you can:
          </Typography>
          <Box component='ul' sx={{ pl: 2.5, m: 0, '& li': { mb: 0.5 } }}>
            <Typography component='li' variant='body2' color='text.secondary'>Create a sprint with a name, goal, and optional start/end dates</Typography>
            <Typography component='li' variant='body2' color='text.secondary'>Mark a sprint <strong>Active</strong> or <strong>Closed</strong></Typography>
            <Typography component='li' variant='body2' color='text.secondary'>
              <strong>Lock a sprint</strong> — once locked, no task in that sprint can be edited or deleted (not even by the autorun agent). The backend enforces this. Unlock it to make changes.
            </Typography>
          </Box>
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: ALPHA.errorBg, borderRadius: 1, border: `1px solid ${ALPHA.errorBgHeavy}`, display: 'flex', gap: 1 }}>
            <i className='tabler-lock text-sm' style={{ color: COLORS.error, marginTop: 2 }} />
            <Typography variant='body2' color='error.main'>
              Locked sprint rows appear in red with a lock icon. Edit and Delete buttons are disabled. This protects completed work from accidental modification.
            </Typography>
          </Box>
        </HelpSection>

        <Divider sx={{ my: 2 }} />

        {/* Filtering */}
        <HelpSection icon='tabler-filter' title='Filtering & Search'>
          <Box component='ul' sx={{ pl: 2.5, m: 0, '& li': { mb: 0.5 } }}>
            <Typography component='li' variant='body2' color='text.secondary'><strong>Sprint bar</strong> — filter to All, Unassigned, or a specific sprint</Typography>
            <Typography component='li' variant='body2' color='text.secondary'><strong>Status pills</strong> — filter by CODE / RUN / WIP / BACKLOG / Done (counts update live)</Typography>
            <Typography component='li' variant='body2' color='text.secondary'><strong>Search box</strong> — searches description text, task #, and sprint name simultaneously</Typography>
            <Typography component='li' variant='body2' color='text.secondary'>Sprint chips in rows are <strong>clickable</strong> — clicking one filters the grid to that sprint instantly</Typography>
          </Box>
        </HelpSection>

        <Divider sx={{ my: 2 }} />

        {/* Editing */}
        <HelpSection icon='tabler-pencil' title='Creating & Editing Tasks'>
          <Box component='ul' sx={{ pl: 2.5, m: 0, '& li': { mb: 0.5 } }}>
            <Typography component='li' variant='body2' color='text.secondary'><strong>New Task</strong> button — opens a blank edit dialog</Typography>
            <Typography component='li' variant='body2' color='text.secondary'><strong>Double-click any row</strong> — opens that task for editing</Typography>
            <Typography component='li' variant='body2' color='text.secondary'>The <strong>Description</strong> field is monospace and grows as you type — good for multi-line specs</Typography>
            <Typography component='li' variant='body2' color='text.secondary'>The <strong>Notes / Spec</strong> field is for acceptance criteria, links, and design notes</Typography>
            <Typography component='li' variant='body2' color='text.secondary'>Assign a sprint from the sprint dropdown inside the dialog</Typography>
          </Box>
        </HelpSection>

        <Divider sx={{ my: 2 }} />

        {/* Device / Scope */}
        <HelpSection icon='tabler-devices' title='Device / Area Assignment'>
          <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.8, mb: 1 }}>
            Every task must have a <strong>device/area</strong> assigned before the autorun agent can claim it. Click the device cell inline to set it.
          </Typography>
          <Table size='small' sx={{ mb: 1.5 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Value</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Agent scope</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                { v: 'web',     s: 'web/ only' },
                { v: 'mobile',  s: 'mobile/ only' },
                { v: 'backend', s: 'backend/ only (business logic)' },
                { v: 'swagger', s: '/swagger/, swagger UI config, OpenAPI route definitions only' },
                { v: 'all',     s: 'entire repo' },
              ].map(r => (
                <TableRow key={r.v}>
                  <TableCell sx={{ py: 0.5 }}><Typography variant='caption' sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.v}</Typography></TableCell>
                  <TableCell sx={{ py: 0.5 }}><Typography variant='body2' color='text.secondary'>{r.s}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ p: 1.5, bgcolor: ALPHA.errorBg, borderRadius: 1, border: `1px solid ${ALPHA.errorBgHeavy}`, display: 'flex', gap: 1 }}>
            <i className='tabler-alert-triangle text-sm' style={{ color: COLORS.error, marginTop: 2 }} />
            <Typography variant='body2' color='error.main'>
              Tasks without a device show a red <strong>⚠ unscoped</strong> chip. The autorun agent will skip them and release them back to CODE. Set an area before enabling autorun.
            </Typography>
          </Box>
        </HelpSection>

        <Divider sx={{ my: 2 }} />

        {/* Revert & Commit tracking */}
        <HelpSection icon='tabler-rotate-counterclockwise' title='Revert & Commit Tracking'>
          <Box component='ul' sx={{ pl: 2.5, m: 0, '& li': { mb: 0.5 } }}>
            <Typography component='li' variant='body2' color='text.secondary'>
              The <strong>↺ Revert</strong> button (amber, in the action column) appears on any task that is not CODE or BACKLOG.
              It resets the task back to <Chip label='CODE' size='small' sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: ALPHA.warningBgMed, color: COLORS.warning, border: 'none', mx: 0.5 }} /> and clears the agent, run time, duration, and commit SHA.
            </Typography>
            <Typography component='li' variant='body2' color='text.secondary'>
              The <strong>Commit</strong> column shows the first 7 characters of the implementation commit SHA.
              <strong> Click it</strong> to copy the full SHA to the clipboard. Hover for the exact <code>git revert &lt;SHA&gt;</code> command to roll back that task's code changes.
            </Typography>
            <Typography component='li' variant='body2' color='text.secondary'>
              The <strong>Duration</strong> column shows elapsed time from when the agent picked up the task (RUN) to completion — e.g. <code>45s</code>, <code>3m12s</code>, <code>1h05m</code>.
            </Typography>
          </Box>
        </HelpSection>

        <Divider sx={{ my: 2 }} />

        {/* Autorun */}
        <HelpSection icon='tabler-robot' title='Autorun Agent (Joseph)'>
          <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.8, mb: 1 }}>
            The AI agent <strong>Joseph</strong> (Claude Code CLI) can autonomously execute tasks. To use it:
          </Typography>
          <Box component='ol' sx={{ pl: 2.5, m: 0, '& li': { mb: 0.75 } }}>
            <Typography component='li' variant='body2' color='text.secondary'>Assign a <strong>device/area</strong> to every task you want Joseph to run — tasks without one are skipped</Typography>
            <Typography component='li' variant='body2' color='text.secondary'>Set task status to <Chip label='CODE' size='small' sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: ALPHA.warningBgMed, color: COLORS.warning, border: 'none', mx: 0.5 }} /> — this marks it as available for pickup</Typography>
            <Typography component='li' variant='body2' color='text.secondary'>Type <strong>autorun</strong> in the Claude Code session — Joseph scans from the top and claims the first CODE task</Typography>
            <Typography component='li' variant='body2' color='text.secondary'>Joseph sets the task to <Chip label='RUN' size='small' sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: ALPHA.infoBg, color: COLORS.info, border: 'none', mx: 0.5 }} />, implements it, records the commit SHA, then sets it to <Chip label='Done' size='small' sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: ALPHA.successBg, color: COLORS.success, border: 'none', mx: 0.5 }} /></Typography>
            <Typography component='li' variant='body2' color='text.secondary'>Every 3 tasks Joseph commits, pushes, and records the deploy ID</Typography>
            <Typography component='li' variant='body2' color='text.secondary'>Type <strong>AUTOSTOP</strong> to halt the loop after the current task completes</Typography>
          </Box>
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: ALPHA.warningBg, borderRadius: 1, border: `1px solid ${ALPHA.warningBgHeavy}`, display: 'flex', gap: 1 }}>
            <i className='tabler-alert-triangle text-sm' style={{ color: COLORS.warning, marginTop: 2 }} />
            <Typography variant='body2' sx={{ color: COLORS.warningBrown }}>
              Locked-sprint tasks and unscoped tasks are automatically skipped — Joseph releases them back to CODE and moves on.
            </Typography>
          </Box>
        </HelpSection>

        <Divider sx={{ my: 2 }} />

        {/* Keyboard shortcuts */}
        <HelpSection icon='tabler-keyboard' title='Tips & Shortcuts'>
          <Box component='ul' sx={{ pl: 2.5, m: 0, '& li': { mb: 0.5 } }}>
            <Typography component='li' variant='body2' color='text.secondary'><strong>Double-click row</strong> → edit dialog</Typography>
            <Typography component='li' variant='body2' color='text.secondary'><strong>Click sprint chip in row</strong> → filter grid to that sprint</Typography>
            <Typography component='li' variant='body2' color='text.secondary'><strong>Click device cell</strong> → inline dropdown to set area scope</Typography>
            <Typography component='li' variant='body2' color='text.secondary'><strong>Click commit SHA</strong> → copies full SHA to clipboard for <code>git revert</code></Typography>
            <Typography component='li' variant='body2' color='text.secondary'><strong>Hover description</strong> → full text tooltip (great for long multi-line tasks)</Typography>
            <Typography component='li' variant='body2' color='text.secondary'><strong>History</strong> button → opens the project changelog with dated entries</Typography>
            <Typography component='li' variant='body2' color='text.secondary'>Grid auto-refreshes every <strong>60 seconds</strong> — no need to reload</Typography>
            <Typography component='li' variant='body2' color='text.secondary'>Priority values are color-coded: <span style={{ color: COLORS.error }}>critical (8–9)</span> · <span style={{ color: COLORS.orange }}>high (6–7)</span> · <span style={{ color: COLORS.warning }}>medium (3–5)</span> · <span style={{ color: COLORS.gray500 }}>low (0–2)</span></Typography>
          </Box>
        </HelpSection>

      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant='contained'>Got it</Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Changelog Dialog ─────────────────────────────────────────────────────────

function ChangelogDialog({ open, onClose, sprints }: { open: boolean; onClose: () => void; sprints: Sprint[] }) {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ entryDate: new Date().toISOString().slice(0, 10), sprintId: '', notes: '' })
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)

  const { data: entries = [], isLoading } = useQuery<ChangelogEntry[]>({
    queryKey: ['dev-changelog'],
    queryFn: () => api.get('/api/dev-tasks/changelog'),
    enabled: open,
  })

  // Auto-select first entry when data loads
  useEffect(() => {
    if (entries.length > 0 && !selectedEntryId) {
      setSelectedEntryId(entries[0].id)
    }
  }, [entries, selectedEntryId])

  const createMut = useMutation({
    mutationFn: (body: CreateChangelogEntryInput) => api.post('/api/dev-tasks/changelog', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dev-changelog'] }); setAddOpen(false); setForm({ entryDate: new Date().toISOString().slice(0, 10), sprintId: '', notes: '' }) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/dev-tasks/changelog/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dev-changelog'] })
      // If deleted entry was selected, select the first remaining entry
      if (id === selectedEntryId && entries.length > 1) {
        const remainingEntries = entries.filter(e => e.id !== id)
        setSelectedEntryId(remainingEntries[0]?.id || null)
      }
    },
  })

  const handleAdd = () => {
    if (!form.notes.trim()) return
    createMut.mutate({ entryDate: form.entryDate || undefined, sprintId: form.sprintId || null, notes: form.notes })
  }

  const fmtEntryDate = (iso: string) => {
    try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return iso }
  }

  const selectedEntry = entries.find(e => e.id === selectedEntryId)

  return (
    <Dialog open={open} onClose={onClose} maxWidth='lg' fullWidth
      PaperProps={{ sx: { height: '80vh', display: 'flex', flexDirection: 'column' } }}>

      <DialogTitle sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <i className='tabler-history text-xl' style={{ color: COLORS.violet }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant='h6' fontWeight={700}>History</Typography>
          <Typography variant='caption' color='text.secondary'>Sprint & feature changelog — select a date to view details</Typography>
        </Box>
        <Button size='small' variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setAddOpen(true)}>
          Add Entry
        </Button>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flex: 1, overflow: 'hidden' }}>
        {isLoading && (
          <Typography variant='body2' color='text.disabled' sx={{ p: 3, textAlign: 'center', width: '100%' }}>Loading…</Typography>
        )}
        {!isLoading && entries.length === 0 && (
          <Typography variant='body2' color='text.disabled' sx={{ p: 3, textAlign: 'center', width: '100%' }}>No entries yet. Add the first one!</Typography>
        )}
        {!isLoading && entries.length > 0 && (
          <>
            {/* LEFT COLUMN: Date list */}
            <Box sx={{ width: 240, borderRight: '1px solid', borderColor: 'divider', overflowY: 'auto', bgcolor: 'background.default' }}>
              {entries.map((entry) => (
                <Box
                  key={entry.id}
                  onClick={() => setSelectedEntryId(entry.id)}
                  sx={{
                    px: 2,
                    py: 1.5,
                    cursor: 'pointer',
                    bgcolor: selectedEntryId === entry.id ? 'primary.lightOpacity' : 'transparent',
                    borderLeft: '3px solid',
                    borderLeftColor: selectedEntryId === entry.id ? 'primary.main' : 'transparent',
                    '&:hover': { bgcolor: selectedEntryId === entry.id ? 'primary.lightOpacity' : 'action.hover' },
                  }}
                >
                  <Typography variant='body2' fontWeight={selectedEntryId === entry.id ? 700 : 400} sx={{ mb: 0.5, color: selectedEntryId === entry.id ? 'primary.main' : 'text.primary' }}>
                    {fmtEntryDate(entry.entryDate)}
                  </Typography>
                  {entry.sprintName && (
                    <Chip label={entry.sprintName} size='small'
                      sx={{ height: 16, fontSize: '0.6rem', fontWeight: 600, bgcolor: ALPHA.violetBg, color: COLORS.violet, border: 'none' }} />
                  )}
                </Box>
              ))}
            </Box>

            {/* RIGHT COLUMN: Selected entry notes */}
            <Box sx={{ flex: 1, p: 3, overflowY: 'auto', position: 'relative' }}>
              {selectedEntry ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Typography variant='h6' fontWeight={700} sx={{ color: 'primary.main' }}>
                      {fmtEntryDate(selectedEntry.entryDate)}
                    </Typography>
                    {selectedEntry.sprintName && (
                      <Chip label={selectedEntry.sprintName} size='small'
                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, bgcolor: ALPHA.violetBg, color: COLORS.violet, border: 'none' }} />
                    )}
                    <Box sx={{ flex: 1 }} />
                    <Tooltip title='Delete entry'>
                      <IconButton size='small' sx={{ opacity: 0.6, '&:hover': { opacity: 1, color: 'error.main' } }}
                        onClick={() => deleteMut.mutate(selectedEntry.id)}>
                        <i className='tabler-trash text-base' />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant='body1' color='text.primary'
                    sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.8 }}>
                    {selectedEntry.notes}
                  </Typography>
                </>
              ) : (
                <Typography variant='body2' color='text.disabled' sx={{ textAlign: 'center', mt: 4 }}>
                  Select a date from the list to view details
                </Typography>
              )}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* ── Add Entry sub-dialog ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>New Changelog Entry</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label='Date' type='date' size='small' fullWidth
                value={form.entryDate}
                onChange={e => setForm(f => ({ ...f, entryDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl size='small' fullWidth>
                <InputLabel>Sprint (optional)</InputLabel>
                <Select value={form.sprintId} label='Sprint (optional)'
                  onChange={e => setForm(f => ({ ...f, sprintId: e.target.value }))}>
                  <MenuItem value=''><em>None</em></MenuItem>
                  {sprints.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <TextField
            label='Notes' multiline minRows={5} fullWidth
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder={'What changed? Bug fixes, features shipped, decisions made...\n\nSupports multiple lines.'}
            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.6 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant='contained' disabled={!form.notes.trim() || createMut.isPending} onClick={handleAdd}>
            {createMut.isPending ? 'Adding…' : 'Add Entry'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}

// ─── Sprint Manager Dialog ────────────────────────────────────────────────────

const BLANK_SPRINT = { name: '', goal: '', startDate: '', endDate: '', isActive: true, isLocked: false }

function fmtDate(iso: string | null | undefined) {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${m}/${d}`
}

function SprintManagerDialog({ open, onClose, sprints, onRefresh }: {
  open: boolean
  onClose: () => void
  sprints: Sprint[]
  onRefresh: () => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)  // null = "New Sprint" mode
  const [form, setForm]             = useState({ ...BLANK_SPRINT })
  const [dirty, setDirty]           = useState(false)
  const set = (k: string, v: unknown) => { setForm(f => ({ ...f, [k]: v })); setDirty(true) }

  // Sync form when selection changes
  const selectSprint = (s: Sprint | null) => {
    setSelectedId(s ? s.id : null)
    setForm(s ? { name: s.name, goal: s.goal ?? '', startDate: s.startDate ?? '', endDate: s.endDate ?? '', isActive: s.isActive, isLocked: s.isLocked } : { ...BLANK_SPRINT })
    setDirty(false)
  }

  const createMut = useMutation({
    mutationFn: (body: typeof form) => api.post('/api/dev-tasks/sprints', body),
    onSuccess: (created: Sprint) => { onRefresh(); selectSprint(created) },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: typeof form }) => api.patch(`/api/dev-tasks/sprints/${id}`, body),
    onSuccess: () => { onRefresh(); setDirty(false) },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/dev-tasks/sprints/${id}`),
    onSuccess: () => { onRefresh(); selectSprint(null) },
  })

  const handleSave = () => {
    if (selectedId) updateMut.mutate({ id: selectedId, body: form })
    else createMut.mutate(form)
  }

  const isNew     = selectedId === null
  const isBusy    = createMut.isPending || updateMut.isPending || deleteMut.isPending
  const selected  = sprints.find(s => s.id === selectedId)

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth
      PaperProps={{ sx: { height: '70vh', display: 'flex', flexDirection: 'column' } }}>

      <DialogTitle sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        Sprint Manager
      </DialogTitle>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Left panel — sprint list ── */}
        <Box sx={{
          width: 200, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* New Sprint button */}
          <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Button fullWidth size='small' variant={isNew ? 'contained' : 'outlined'}
              startIcon={<i className='tabler-plus text-sm' />}
              onClick={() => selectSprint(null)}>
              New Sprint
            </Button>
          </Box>

          {/* Scrollable sprint list */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {sprints.length === 0 && (
              <Typography variant='caption' color='text.disabled' sx={{ p: 2, display: 'block', textAlign: 'center' }}>
                No sprints yet
              </Typography>
            )}
            {sprints.map(s => {
              const isSelected = selectedId === s.id
              const dateRange  = (s.startDate || s.endDate)
                ? `${fmtDate(s.startDate)}–${fmtDate(s.endDate)}`
                : 'No dates'
              return (
                <Box
                  key={s.id}
                  onClick={() => selectSprint(s)}
                  sx={{
                    px: 1.5, py: 1, cursor: 'pointer', borderBottom: '1px solid', borderColor: 'divider',
                    bgcolor: isSelected ? 'primary.lightOpacity' : 'transparent',
                    borderLeft: '3px solid',
                    borderLeftColor: isSelected ? 'primary.main' : 'transparent',
                    '&:hover': { bgcolor: isSelected ? 'primary.lightOpacity' : 'action.hover' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {s.isLocked && <i className='tabler-lock' style={{ fontSize: '0.6rem', color: COLORS.error }} />}
                    <Typography variant='body2' fontWeight={isSelected ? 700 : 400} noWrap
                      sx={{ color: s.isLocked ? 'text.disabled' : 'text.primary', fontSize: '0.8rem' }}>
                      {s.name}
                    </Typography>
                  </Box>
                  <Typography variant='caption' color='text.disabled' sx={{ fontSize: '0.68rem' }}>
                    {dateRange}
                  </Typography>
                  {!s.isActive && (
                    <Chip label='Closed' size='small'
                      sx={{ height: 14, fontSize: '0.58rem', ml: 0.5, bgcolor: ALPHA.grayAlpha, color: COLORS.gray500, border: 'none' }} />
                  )}
                </Box>
              )
            })}
          </Box>
        </Box>

        {/* ── Right panel — edit form ── */}
        <Box sx={{ flex: 1, p: 2.5, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>

          <Typography variant='subtitle2' fontWeight={700} color='text.secondary'
            sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
            {isNew ? '✦ New Sprint' : `Editing: ${selected?.name ?? ''}`}
          </Typography>

          <Grid container spacing={1.5}>
            <Grid item xs={8}>
              <TextField label='Sprint Name' value={form.name} onChange={e => set('name', e.target.value)}
                fullWidth size='small' required autoFocus={isNew} />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size='small'>
                <InputLabel>Status</InputLabel>
                <Select label='Status' value={form.isActive ? 'active' : 'closed'}
                  onChange={e => set('isActive', e.target.value === 'active')}>
                  <MenuItem value='active'>Active</MenuItem>
                  <MenuItem value='closed'>Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label='Goal (optional)' value={form.goal} onChange={e => set('goal', e.target.value)}
                fullWidth size='small' placeholder='What this sprint aims to deliver...' />
            </Grid>
            <Grid item xs={6}>
              <TextField label='Start Date' type='date' value={form.startDate}
                onChange={e => set('startDate', e.target.value)} fullWidth size='small' InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField label='End Date' type='date' value={form.endDate}
                onChange={e => set('endDate', e.target.value)} fullWidth size='small' InputLabelProps={{ shrink: true }} />
            </Grid>
            {!isNew && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch checked={form.isLocked} onChange={e => set('isLocked', e.target.checked)} color='error' size='small' />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <i className={form.isLocked ? 'tabler-lock text-sm' : 'tabler-lock-open text-sm'}
                        style={{ color: form.isLocked ? COLORS.error : undefined }} />
                      <Typography variant='body2'>
                        {form.isLocked ? 'Locked — tasks cannot be edited' : 'Unlocked'}
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
            )}
          </Grid>

          <Box sx={{ flex: 1 }} />

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            {!isNew && (
              <Button size='small' color='error' variant='outlined' disabled={isBusy}
                onClick={() => selectedId && deleteMut.mutate(selectedId)}
                startIcon={<i className='tabler-trash text-xs' />}>
                Delete
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button size='small' variant='contained' disabled={!form.name.trim() || isBusy || (!isNew && !dirty)}
              onClick={handleSave}
              startIcon={<i className={isNew ? 'tabler-plus text-xs' : 'tabler-check text-xs'} />}>
              {isBusy ? 'Saving…' : isNew ? 'Create Sprint' : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', px: 2, py: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={onClose} size='small'>Close</Button>
      </Box>
    </Dialog>
  )
}

// ─── Dictation button ────────────────────────────────────────────────────────

function DictationButton({ onTranscript, disabled }: { onTranscript: (t: string) => void; disabled?: boolean }) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognition | null>(null)

  const toggle = () => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) return

    if (listening) {
      recRef.current?.stop()
      setListening(false)
      return
    }

    const rec: SpeechRecognition = new SR()
    rec.lang = 'en-US'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .slice(e.resultIndex)
        .map(r => r[0].transcript)
        .join(' ')
      onTranscript(transcript)
    }
    rec.onend = () => setListening(false)
    rec.start()
    recRef.current = rec
    setListening(true)
  }

  return (
    <Tooltip title={listening ? 'Stop dictation' : 'Dictate (speech to text)'}>
      <span>
        <IconButton size='small' onClick={toggle} disabled={disabled}
          sx={{ p: '4px', color: listening ? 'error.main' : 'text.secondary', animation: listening ? 'pulse 1.2s infinite' : 'none',
            '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }}>
          <i className={listening ? 'tabler-microphone text-base' : 'tabler-microphone text-base'} />
        </IconButton>
      </span>
    </Tooltip>
  )
}

// ─── Edit / Create dialog ─────────────────────────────────────────────────────

type EditDialogProps = {
  open: boolean
  task: Task | null
  onClose: () => void
  onSave: (data: CreateTaskInput | UpdateTaskInput) => void
  loading: boolean
  sprints: Sprint[]
}

function EditDialog({ open, task, onClose, onSave, loading, sprints }: EditDialogProps) {
  const [form, setForm] = useState({ status: 'CODE', device: '', description: '', priority: 'medium', notes: '', sprintId: '' })

  useMemo(() => {
    if (task) setForm({ status: task.status, device: task.device ?? '', description: task.description, priority: task.priority ?? 'medium', notes: task.notes ?? '', sprintId: task.sprintId ?? '' })
    else setForm({ status: 'CODE', device: '', description: '', priority: 'medium', notes: '', sprintId: '' })
  }, [task, open])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const append = (k: 'description' | 'notes', text: string) =>
    setForm(f => ({ ...f, [k]: f[k] ? f[k] + ' ' + text : text }))

  const activeSprint = sprints.find(s => s.id === form.sprintId)
  const isLocked = !!activeSprint?.isLocked

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} fullWidth PaperProps={{ sx: { minHeight: '70vh', maxWidth: '1000px' } }}>

      {/* ── Title row: label + sprint selector ── */}
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant='h6' fontWeight={700} sx={{ flex: '0 0 auto' }}>
            {task ? `Edit Task #${task.seq}` : 'New Task'}
          </Typography>

          {/* Sprint selector inline in title */}
          <FormControl size='small' sx={{ minWidth: 180 }} disabled={isLocked}>
            <InputLabel shrink>Sprint</InputLabel>
            <Select label='Sprint' displayEmpty value={form.sprintId} onChange={e => set('sprintId', e.target.value)}>
              <MenuItem value=''>— Unassigned —</MenuItem>
              {sprints.map(s => (
                <MenuItem key={s.id} value={s.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {s.isLocked && <i className='tabler-lock text-xs' style={{ color: COLORS.error }} />}
                    {!s.isActive && <i className='tabler-archive text-xs' style={{ color: COLORS.gray500 }} />}
                    {s.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {isLocked && (
            <Chip icon={<i className='tabler-lock text-xs' />} label='Sprint Locked'
              size='small' color='error' variant='outlined' sx={{ height: 22, fontSize: '0.7rem' }} />
          )}
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>

        {isLocked && (
          <Box sx={{ mx: 2, mt: 2, bgcolor: 'error.lightOpacity', border: '1px solid', borderColor: 'error.light', borderRadius: 1, p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className='tabler-lock text-sm' style={{ color: COLORS.error }} />
            <Typography variant='body2' color='error.main'>
              This task is in a locked sprint. Unlock the sprint first to make changes.
            </Typography>
          </Box>
        )}

        {/* ── Status / Device / Priority row ── */}
        <Box sx={{ display: 'flex', gap: 1.5, px: 2, pt: 2, pb: 1.5 }}>
          <Select value={form.status} onChange={e => set('status', e.target.value)} displayEmpty size='small' disabled={isLocked} sx={{ flex: 1 }}>
            {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
          <Select value={form.device ?? ''} onChange={e => set('device', e.target.value)} displayEmpty size='small' disabled={isLocked} sx={{ flex: 1 }}>
            <MenuItem value=''>Any device</MenuItem>
            {DEVICE_OPTIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </Select>
          <Select
            value={form.priority ?? ''}
            onChange={e => set('priority', e.target.value)}
            displayEmpty
            size='small'
            disabled={isLocked}
            sx={{ flex: 1 }}
          >
            <MenuItem value=''>Blank</MenuItem>
            <MenuItem value='0'>0 - Lowest</MenuItem>
            <MenuItem value='1'>1</MenuItem>
            <MenuItem value='2'>2</MenuItem>
            <MenuItem value='3'>3</MenuItem>
            <MenuItem value='4'>4</MenuItem>
            <MenuItem value='5'>5</MenuItem>
            <MenuItem value='6'>6</MenuItem>
            <MenuItem value='7'>7</MenuItem>
            <MenuItem value='8'>8</MenuItem>
            <MenuItem value='9'>9 - Critical</MenuItem>
          </Select>
        </Box>

        {/* ── Description — full dialog width ── */}
        <Box sx={{ px: 0, pb: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pb: 0.5 }}>
            <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.68rem', flex: 1 }}>
              Description *
            </Typography>
            <DictationButton disabled={isLocked} onTranscript={t => append('description', t)} />
          </Box>
          <TextField
            value={form.description}
            onChange={e => set('description', e.target.value)}
            fullWidth multiline minRows={6}
            required
            disabled={isLocked}
            placeholder='What needs to be done...'
            variant='outlined'
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: 0, borderLeft: 'none', borderRight: 'none' },
              '& fieldset': { borderLeft: 'none', borderRight: 'none' },
            }}
            inputProps={{ style: { fontFamily: 'monospace', fontSize: '1.85rem', lineHeight: 1.1, padding: '10px 16px' } }}
          />
        </Box>

        {/* ── Notes — full dialog width ── */}
        <Box sx={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 1.5, pb: 0.5 }}>
            <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.68rem', flex: 1 }}>
              Notes / Spec
            </Typography>
            <DictationButton disabled={isLocked} onTranscript={t => append('notes', t)} />
          </Box>
          <TextField
            value={form.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
            fullWidth multiline minRows={4}
            disabled={isLocked}
            placeholder='Context, links, design notes, acceptance criteria...'
            variant='outlined'
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: 0, borderLeft: 'none', borderRight: 'none' },
              '& fieldset': { borderLeft: 'none', borderRight: 'none' },
            }}
            inputProps={{ style: { fontFamily: 'monospace', fontSize: '2.1rem', lineHeight: 1.1, padding: '2px' } }}
          />
        </Box>

      </DialogContent>

      <Divider />
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant='contained' disabled={loading || !form.description.trim() || isLocked}
          onClick={() => onSave({ ...form, sprintId: form.sprintId || null })}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Draggable + Resizable Column Header ──────────────────────────────────────

function DraggableResizableColumnHeader({
  col,
  active,
  sortDir,
  onSort,
  onFilterClick,
  filterActive,
  center,
  width,
  onResize,
}: {
  col: { id: string; label: string; field?: string }
  active: boolean
  sortDir: 'asc' | 'desc'
  onSort: () => void
  onFilterClick?: (e: React.MouseEvent<HTMLElement>) => void
  filterActive?: boolean
  center?: boolean
  width: number
  onResize: (newWidth: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.id })
  const [isResizing, setIsResizing] = useState(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
    startX.current = e.clientX
    startWidth.current = width
  }

  useEffect(() => {
    if (!isResizing) return
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX.current
      const newWidth = Math.max(40, startWidth.current + delta)
      onResize(newWidth)
    }
    const handleMouseUp = () => setIsResizing(false)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, onResize])

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: col.field ? 'pointer' : 'default',
    userSelect: 'none',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: center ? 'center' : 'flex-start',
    gap: '0.3rem',
    paddingBlock: '0.6rem',
  }

  return (
    <Box ref={setNodeRef} sx={style} onClick={col.field ? onSort : undefined}>
      <span
        {...attributes}
        {...listeners}
        style={{ cursor: 'grab', display: 'inline-flex', alignItems: 'center', opacity: 0.4 }}
        onClick={e => e.stopPropagation()}
      >
        <i className='tabler-grip-vertical' style={{ fontSize: '0.7rem' }} />
      </span>
      <Typography
        variant='caption'
        fontWeight={700}
        color={active || filterActive ? 'primary.main' : 'text.secondary'}
        sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.68rem', lineHeight: 1 }}
      >
        {col.label}
      </Typography>
      {active && (
        <i className={sortDir === 'asc' ? 'tabler-chevron-up' : 'tabler-chevron-down'} style={{ fontSize: '0.7rem' }} />
      )}
      {onFilterClick && (
        <Tooltip title={filterActive ? 'Filter active - click to change' : 'Click to filter'}>
          <Box
            component='span'
            onClick={e => { e.stopPropagation(); onFilterClick(e) }}
            sx={{ display: 'flex', alignItems: 'center', ml: 0.25, cursor: 'pointer', color: filterActive ? 'primary.main' : 'text.disabled', '&:hover': { color: 'primary.main' } }}
          >
            <i className='tabler-filter' style={{ fontSize: '0.65rem' }} />
          </Box>
        </Tooltip>
      )}
      {/* Resize handle */}
      <Box
        onMouseDown={handleResizeStart}
        sx={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 8,
          cursor: 'col-resize',
          backgroundColor: isResizing ? 'primary.main' : 'transparent',
          '&:hover': { backgroundColor: 'primary.lightOpacity' },
          zIndex: 10,
        }}
      />
    </Box>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

/**
 * Admin task/todo management view with priority, assignment, and completion tracking.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/admin/TasksView.tsx
 */
export default function TasksView() {
  const router = useRouter()
  const qc = useQueryClient()
  // Inject scoped font-size boost (+4pt) for this page only, removed on unmount
  useEffect(() => {
    const id = 'jm-tasks-font-boost'
    if (!document.getElementById(id)) {
      const s = document.createElement('style')
      s.id = id
      s.textContent = `
        .jm-tasks-view .MuiTypography-root { font-size: calc(1em + 4pt) !important; }
        .jm-tasks-view .MuiInputBase-input { font-size: calc(1em + 4pt) !important; }
        .jm-tasks-view .MuiChip-label      { font-size: calc(1em + 4pt) !important; }
        .jm-tasks-view .MuiButton-root     { font-size: calc(1em + 4pt) !important; }
        .jm-tasks-view .MuiMenuItem-root   { font-size: calc(1em + 4pt) !important; }
        .jm-tasks-view .MuiSelect-select   { font-size: calc(1em + 4pt) !important; }
        .jm-tasks-view input, .jm-tasks-view textarea { font-size: calc(1em + 4pt) !important; }
      `
      document.head.appendChild(s)
    }
    return () => { document.getElementById(id)?.remove() }
  }, [])

  const [statusFilter, setStatusFilter]     = useLocalStorage<string>('jm-tasks-status-filter', 'ALL')
  const [sprintFilter, setSprintFilter]     = useLocalStorage<string>('jm-tasks-sprint-filter', 'ALL')
  const [priorityFilter, setPriorityFilter] = useLocalStorage<string[]>('jm-tasks-priority-filter', ['ALL'])
  const [hideDone, setHideDone]             = useLocalStorage<boolean>('jm-tasks-hide-done', false)
  const [search, setSearch]                 = useLocalStorage<string>('jm-tasks-search', '')
  const [sortField, setSortField]           = useLocalStorage<string>('jm-tasks-sort-field', 'seq')
  const [sortDir, setSortDir]               = useLocalStorage<'asc' | 'desc'>('jm-tasks-sort-dir', 'asc')
  const [priFilterAnchor, setPriFilterAnchor] = useState<null | HTMLElement>(null)

  // ── Column management ────────────────────────────────────────────────────────
  const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('jm-tasks-col-visibility', {})
  const [columnOrder, setColumnOrder] = useLocalStorage<string[]>('jm-tasks-col-order', [])
  const [columnSizing, setColumnSizing] = useLocalStorage<Record<string, number>>('jm-tasks-col-sizing', {
    seq: 52, status: 80, description: 300, sprintName: 110, priority: 104, device: 125,
    agent: 90, deployId: 80, commitId: 72, duration: 68, action: 60
  })
  const [colPickerAnchor, setColPickerAnchor] = useState<HTMLButtonElement | null>(null)
  const dragColId = useRef<string | null>(null)

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }
  const [editTask, setEditTask]           = useState<Task | null>(null)
  const [dialogOpen, setDialogOpen]       = useState(false)
  const [deleteId, setDeleteId]           = useState<string | null>(null)
  const [sprintMgrOpen, setSprintMgrOpen] = useState(false)
  const [helpOpen, setHelpOpen]           = useState(false)
  const [historyOpen, setHistoryOpen]     = useState(false)

  const { data, isLoading } = useQuery<{ tasks: Task[]; total: number }>({
    queryKey: ['dev-tasks'],
    queryFn: () => api.get('/api/dev-tasks'),
    refetchInterval: 60000,
  })

  const { data: sprints = [], refetch: refetchSprints } = useQuery<Sprint[]>({
    queryKey: ['dev-sprints'],
    queryFn: () => api.get('/api/dev-tasks/sprints'),
  })

  // Build a lookup: sprintId → sprint (for fast lock checks)
  const sprintMap = useMemo(() => {
    const m: Record<string, Sprint> = {}
    for (const s of sprints) m[s.id] = s
    return m
  }, [sprints])

  const allTasks = data?.tasks ?? []

  const tasks = useMemo(() => {
    let t = allTasks
    if (statusFilter !== 'ALL') t = t.filter(x => x.status === statusFilter || (statusFilter === 'Done' && x.status === 'DONE'))
    if (sprintFilter === 'unassigned') t = t.filter(x => !x.sprintId)
    else if (sprintFilter !== 'ALL') t = t.filter(x => x.sprintId === sprintFilter)
    if (!priorityFilter.includes('ALL')) {
      t = t.filter(x => {
        if (priorityFilter.includes('unset') && (x.priority == null || x.priority === '')) return true
        // Match specific priority number (0-9)
        return priorityFilter.includes(String(x.priority))
      })
    }
    if (hideDone) {
      t = t.filter(x => x.status !== 'Done' && x.status !== 'DONE')
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      t = t.filter(x => x.description.toLowerCase().includes(q) || String(x.seq).includes(q) || (x.sprintName ?? '').toLowerCase().includes(q))
    }
    // Sort
    t = [...t].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const va = (a as Record<string, unknown>)[sortField] ?? ''
      const vb = (b as Record<string, unknown>)[sortField] ?? ''
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
    return t
  }, [allTasks, statusFilter, sprintFilter, priorityFilter, hideDone, search, sortField, sortDir])

  // All distinct sprints: API list + any sprint referenced in tasks (covers orphans)
  const allSprintPills = useMemo(() => {
    const byId = new Map(sprints.map(s => [s.id, s]))
    for (const t of allTasks) {
      if (t.sprintId && !byId.has(t.sprintId)) {
        byId.set(t.sprintId, { id: t.sprintId, name: t.sprintName ?? t.sprintId.slice(0, 8), isActive: true, isLocked: false, creAt: '', modAt: '' })
      }
    }
    return Array.from(byId.values())
  }, [sprints, allTasks])

  // Task counts per sprint (respects current status and priority filters)
  const sprintCounts = useMemo(() => {
    const m: Record<string, number> = { unassigned: 0 }
    // Filter by current status and priority to show contextual counts
    let filteredTasks = allTasks
    if (statusFilter !== 'ALL') filteredTasks = filteredTasks.filter(x => x.status === statusFilter || (statusFilter === 'Done' && x.status === 'DONE'))
    if (!priorityFilter.includes('ALL')) {
      filteredTasks = filteredTasks.filter(x => {
        if (priorityFilter.includes('unset') && (x.priority == null || x.priority === '')) return true
        return priorityFilter.includes(String(x.priority))
      })
    }
    for (const t of filteredTasks) {
      if (t.sprintId) m[t.sprintId] = (m[t.sprintId] ?? 0) + 1
      else m['unassigned'] = (m['unassigned'] ?? 0) + 1
    }
    return m
  }, [allTasks, statusFilter, priorityFilter])

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {}
    // Filter by current sprint and priority to show contextual counts
    let filteredTasks = allTasks
    if (sprintFilter === 'unassigned') filteredTasks = filteredTasks.filter(x => !x.sprintId)
    else if (sprintFilter !== 'ALL') filteredTasks = filteredTasks.filter(x => x.sprintId === sprintFilter)
    if (!priorityFilter.includes('ALL')) {
      filteredTasks = filteredTasks.filter(x => {
        if (priorityFilter.includes('unset') && (x.priority == null || x.priority === '')) return true
        return priorityFilter.includes(String(x.priority))
      })
    }
    for (const t of filteredTasks) {
      const key = t.status === 'DONE' ? 'Done' : t.status
      m[key] = (m[key] ?? 0) + 1
    }
    m['ALL'] = filteredTasks.length
    return m
  }, [allTasks, sprintFilter, priorityFilter])

  const createMutation = useMutation({
    mutationFn: (body: CreateTaskInput) => api.post('/api/dev-tasks', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dev-tasks'] }); setDialogOpen(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTaskInput }) => api.patch(`/api/dev-tasks/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dev-tasks'] }); setDialogOpen(false) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/dev-tasks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dev-tasks'] }); setDeleteId(null) },
  })

  const openNew  = () => { setEditTask(null); setDialogOpen(true) }
  const openEdit = (t: Task) => { setEditTask(t); setDialogOpen(true) }
  const handleSave = (body: CreateTaskInput | UpdateTaskInput) => {
    if (editTask) updateMutation.mutate({ id: editTask.id, body })
    else createMutation.mutate(body as CreateTaskInput)
  }

  const lockedSprintIds = useMemo(() => new Set(sprints.filter(s => s.isLocked).map(s => s.id)), [sprints])

  const handleSprintChange = (taskId: string, sprintId: string | null) => {
    updateMutation.mutate({ id: taskId, body: { sprintId } })
  }

  const handleStatusChange = (taskId: string, status: string) => {
    updateMutation.mutate({ id: taskId, body: { status } })
  }

  const handlePriorityChange = (taskId: string, priority: string | null) => {
    updateMutation.mutate({ id: taskId, body: { priority: priority ?? undefined } })
  }

  const handleDeviceChange = (taskId: string, device: string | null) => {
    updateMutation.mutate({ id: taskId, body: { device: device ?? undefined } })
  }

  const handleRevert = (taskId: string) => {
    updateMutation.mutate({ id: taskId, body: { status: 'CODE', agent: '', runAt: null, duration: null, commitId: null } })
  }

  // ── Column configuration ───────────────────────────────────────────────────
  const allColumns = [
    { id: 'seq', label: '#', canHide: false },
    { id: 'status', label: 'Status', canHide: true },
    { id: 'description', label: 'Description', canHide: false },
    { id: 'sprintName', label: 'Sprint', canHide: true },
    { id: 'priority', label: 'PRI', canHide: true },
    { id: 'device', label: 'Device', canHide: true },
    { id: 'agent', label: 'Agent', canHide: true },
    { id: 'deployId', label: 'Build', canHide: true },
    { id: 'commitId', label: 'Commit', canHide: true },
    { id: 'duration', label: 'Duration', canHide: true },
    { id: 'action', label: '', canHide: false },
  ]

  const orderedColumns = useMemo(() => {
    if (columnOrder.length === 0) return allColumns
    const ordered = columnOrder.map(id => allColumns.find(c => c.id === id)).filter(Boolean) as typeof allColumns
    const missing = allColumns.filter(c => !columnOrder.includes(c.id))
    return [...ordered, ...missing]
  }, [columnOrder])

  const visibleColumns = orderedColumns.filter(col => columnVisibility[col.id] !== false)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      const cur = columnOrder.length ? columnOrder : allColumns.map(c => c.id)
      const oldIndex = cur.indexOf(active.id as string)
      const newIndex = cur.indexOf(over.id as string)
      if (oldIndex !== -1 && newIndex !== -1) setColumnOrder(arrayMove(cur, oldIndex, newIndex))
    }
  }

  const gridTemplateColumns = visibleColumns.map(c => `${columnSizing[c.id] || 100}px`).join(' ')

  return (
    <Box className='jm-tasks-view' sx={{
      display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
      bgcolor: 'background.default',
    }}>

      {/* ── Back breadcrumb bar ────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1,
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper', flexShrink: 0,
      }}>
        <Tooltip title='Back to app'>
          <IconButton size='small' onClick={() => router.back()} sx={{ color: 'text.secondary' }}>
            <i className='tabler-arrow-left text-lg' />
          </IconButton>
        </Tooltip>
        <Typography variant='caption' color='text.disabled' sx={{ fontWeight: 600, letterSpacing: '0.04em' }}>
          Dev Tasks
        </Typography>
      </Box>

    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', p: 2 }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant='h5' fontWeight={700}>Dev Tasks</Typography>
          <Typography variant='caption' color='text.secondary'>{data?.total ?? 0} total · {tasks.length} shown</Typography>
        </Box>
        <TextField
          size='small'
          placeholder='Search…'
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 220 }}
          InputProps={{ startAdornment: <i className='tabler-search text-sm mr-1 text-disabled' /> }}
        />
        <Box sx={{ flex: 1 }} />
        <Tooltip title='Show/Hide Columns'>
          <IconButton size='small' onClick={(e) => setColPickerAnchor(e.currentTarget)} sx={{ color: 'text.secondary' }}>
            <i className='tabler-columns-3 text-lg' />
          </IconButton>
        </Tooltip>
        <Tooltip title='Help — how to use Dev Tasks'>
          <IconButton size='small' onClick={() => setHelpOpen(true)} sx={{ color: 'text.secondary' }}>
            <i className='tabler-help-circle text-lg' />
          </IconButton>
        </Tooltip>
        <Button size='small' variant='outlined' startIcon={<i className='tabler-history' />} onClick={() => setHistoryOpen(true)}>
          History
        </Button>
        <Button size='small' variant='outlined' startIcon={<i className='tabler-layout-kanban' />} onClick={() => setSprintMgrOpen(true)}>
          Sprints
        </Button>
        <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={openNew}>
          New Task
        </Button>
      </Box>

      {/* ── Sprint filter bar ───────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant='caption' color='text.disabled' sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem', mr: 0.5 }}>Sprint</Typography>
        {[
          { id: 'ALL',        name: `All (${allTasks.length})`,                       isLocked: false },
          { id: 'unassigned', name: `Unassigned (${sprintCounts['unassigned'] ?? 0})`, isLocked: false },
          ...allSprintPills.map(s => ({ ...s, name: `${s.name} (${sprintCounts[s.id] ?? 0})` })),
        ].map(s => {
          const active = sprintFilter === s.id
          const locked = s.isLocked
          return (
            <Chip
              key={s.id}
              icon={locked ? <i className='tabler-lock' style={{ fontSize: '0.7rem', marginLeft: 6 }} /> : undefined}
              label={s.name}
              size='small'
              onClick={() => setSprintFilter(s.id)}
              sx={{
                height: 26,
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: active ? 700 : 400,
                bgcolor: active ? (locked ? ALPHA.errorBgMed : 'primary.lightOpacity') : 'transparent',
                color:   active ? (locked ? 'error.main' : 'primary.main') : locked ? 'text.disabled' : 'text.secondary',
                border: '1px solid',
                borderColor: active ? (locked ? 'error.main' : 'primary.main') : 'divider',
              }}
            />
          )
        })}
      </Box>

      {/* ── Status filter pills ─────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant='caption' color='text.disabled' sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem', mr: 0.5 }}>Status</Typography>
        {STATUS_FILTER_PILLS.map(pill => {
          const active = statusFilter === pill
          const color  = STATUS_COLOR[pill]
          return (
            <Chip
              key={pill}
              label={`${pill} (${statusCounts[pill] ?? 0})`}
              size='small'
              onClick={() => setStatusFilter(pill)}
              sx={{
                height: 26,
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: active ? 700 : 400,
                bgcolor: active ? (color ? `${color}22` : 'primary.lightOpacity') : 'transparent',
                color:   active ? (color ?? 'primary.main') : 'text.secondary',
                border: '1px solid',
                borderColor: active ? (color ?? 'primary.main') : 'divider',
              }}
            />
          )
        })}
      </Box>

      {/* ── Priority filter pills ───────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant='caption' color='text.disabled' sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem', mr: 0.5 }}>Priority</Typography>
        {[
          { value: 'ALL',   label: 'All', color: COLORS.gray500 },
          { value: 'unset', label: 'Blank', color: COLORS.gray400 },
          { value: '0',     label: '0', color: COLORS.gray500 },
          { value: '1',     label: '1', color: COLORS.gray500 },
          { value: '2',     label: '2', color: COLORS.gray500 },
          { value: '3',     label: '3', color: COLORS.warning },
          { value: '4',     label: '4', color: COLORS.warning },
          { value: '5',     label: '5', color: COLORS.warning },
          { value: '6',     label: '6', color: COLORS.orange },
          { value: '7',     label: '7', color: COLORS.orange },
          { value: '8',     label: '8', color: COLORS.error },
          { value: '9',     label: '9', color: COLORS.error },
        ].map(pill => {
          const active = priorityFilter.includes(pill.value)
          return (
            <Chip
              key={pill.value}
              label={pill.label}
              size='small'
              onClick={() => {
                if (pill.value === 'ALL') {
                  setPriorityFilter(['ALL'])
                } else {
                  const current = priorityFilter.filter(v => v !== 'ALL')
                  if (current.includes(pill.value)) {
                    const next = current.filter(v => v !== pill.value)
                    setPriorityFilter(next.length > 0 ? next : ['ALL'])
                  } else {
                    setPriorityFilter([...current, pill.value])
                  }
                }
              }}
              sx={{
                height: 26,
                minWidth: '45px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: active ? 700 : 400,
                bgcolor: active ? `${pill.color}22` : 'transparent',
                color:   active ? pill.color : 'text.secondary',
                border: '1px solid',
                borderColor: active ? pill.color : 'divider',
              }}
            />
          )
        })}
      </Box>

      {/* ── Hide DONE checkbox ──────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, alignItems: 'center' }}>
        <FormControlLabel
          control={
            <Checkbox
              size='small'
              checked={hideDone}
              onChange={(e) => setHideDone(e.target.checked)}
              sx={{ py: 0 }}
            />
          }
          label={
            <Typography variant='caption' sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.secondary' }}>
              Hide DONE
            </Typography>
          }
          sx={{ m: 0 }}
        />
      </Box>

      {/* ── Column headers ──────────────────────────────────────────── */}
      {/* Column picker popover */}
      <Popover
        open={Boolean(colPickerAnchor)}
        anchorEl={colPickerAnchor}
        onClose={() => setColPickerAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 2, minWidth: 200 } } }}
      >
        <Typography variant='caption' sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary' }}>
          Columns
        </Typography>
        <Divider sx={{ mb: 1 }} />
        {orderedColumns.map((col) => (
          <div
            key={col.id}
            draggable
            onDragStart={() => { dragColId.current = col.id }}
            onDragOver={e => e.preventDefault()}
            onDrop={() => {
              if (!dragColId.current || dragColId.current === col.id) return
              const currentOrder = columnOrder.length ? columnOrder : allColumns.map(c => c.id)
              const fromIdx = currentOrder.indexOf(dragColId.current)
              const toIdx = currentOrder.indexOf(col.id)
              if (fromIdx === -1 || toIdx === -1) return
              const next = [...currentOrder]
              next.splice(fromIdx, 1)
              next.splice(toIdx, 0, dragColId.current)
              setColumnOrder(next)
              dragColId.current = null
            }}
            style={{ display: 'flex', alignItems: 'center', cursor: 'grab', userSelect: 'none' }}
          >
            <i className='tabler-grip-vertical text-textDisabled text-base mr-1' style={{ cursor: 'grab', flexShrink: 0 }} />
            <MuiFormControlLabel
              control={
                <Checkbox
                  size='small'
                  checked={columnVisibility[col.id] !== false}
                  disabled={!col.canHide}
                  onChange={(e) => setColumnVisibility(prev => ({ ...prev, [col.id]: e.target.checked }))}
                />
              }
              label={<Typography variant='body2'>{col.label || col.id}</Typography>}
              sx={{ flex: 1, m: 0, py: 0.25 }}
            />
          </div>
        ))}
      </Popover>

      {/* Priority filter menu */}
      <Menu anchorEl={priFilterAnchor} open={Boolean(priFilterAnchor)} onClose={() => setPriFilterAnchor(null)}
        PaperProps={{ sx: { minWidth: 160 } }}>
        <Box sx={{ px: 2, py: 1, display: 'flex', gap: 1 }}>
          <Button size='small' variant='outlined' onClick={() => setPriorityFilter(['ALL'])} sx={{ fontSize: '0.7rem' }}>
            Select All
          </Button>
          <Button size='small' variant='outlined' onClick={() => setPriorityFilter([])} sx={{ fontSize: '0.7rem' }}>
            Clear All
          </Button>
        </Box>
        <Divider />
        {[
          { value: 'ALL',    label: 'All', color: 'text.secondary' },
          { value: 'unset',  label: 'Blank', color: COLORS.gray400 },
          { value: '0',      label: '0', color: COLORS.gray500 },
          { value: '1',      label: '1', color: COLORS.gray500 },
          { value: '2',      label: '2', color: COLORS.gray500 },
          { value: '3',      label: '3', color: COLORS.warning },
          { value: '4',      label: '4', color: COLORS.warning },
          { value: '5',      label: '5', color: COLORS.warning },
          { value: '6',      label: '6', color: COLORS.orange },
          { value: '7',      label: '7', color: COLORS.orange },
          { value: '8',      label: '8', color: COLORS.error },
          { value: '9',      label: '9', color: COLORS.error },
        ].map(opt => (
          <MenuItem key={opt.value}
            onClick={() => {
              if (opt.value === 'ALL') {
                setPriorityFilter(['ALL'])
              } else {
                const current = priorityFilter.filter(v => v !== 'ALL')
                if (current.includes(opt.value)) {
                  const next = current.filter(v => v !== opt.value)
                  setPriorityFilter(next.length > 0 ? next : ['ALL'])
                } else {
                  setPriorityFilter([...current, opt.value])
                }
              }
            }}
            sx={{ fontSize: '0.82rem', gap: 1, minHeight: 32 }}>
            <Checkbox size='small' checked={priorityFilter.includes(opt.value)} sx={{ p: 0 }} />
            <Box component='span' sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: opt.color, flexShrink: 0 }} />
            {opt.label}
          </MenuItem>
        ))}
      </Menu>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleColumns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns,
            gap: 0, px: 1, py: 0,
            borderBottom: '2px solid', borderColor: 'divider',
            bgcolor: 'background.default', borderRadius: '4px 4px 0 0',
          }}>
            {visibleColumns.map((col) => {
              const active = sortField === col.id && col.id !== ''
              const filterActive = col.id === 'priority' ? priorityFilter !== 'ALL' : false
              return (
                <DraggableResizableColumnHeader
                  key={col.id}
                  col={{ id: col.id, label: col.label, field: col.id }}
                  active={active}
                  sortDir={sortDir}
                  onSort={() => col.id && handleSort(col.id)}
                  onFilterClick={col.id === 'priority' ? (e) => setPriFilterAnchor(e.currentTarget as HTMLElement) : undefined}
                  filterActive={filterActive}
                  center={col.id === 'agent' || col.id === 'deployId' || col.id === 'priority'}
                  width={columnSizing[col.id] || 100}
                  onResize={(newWidth) => setColumnSizing(prev => ({ ...prev, [col.id]: newWidth }))}
                />
              )
            })}
          </Box>
        </SortableContext>
      </DndContext>

      {/* ── Scrollable rows ─────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflowY: 'auto', borderLeft: '1px solid', borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider', borderRadius: '0 0 4px 4px' }}>
        {isLoading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}><Typography color='text.secondary'>Loading…</Typography></Box>
        ) : tasks.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}><Typography color='text.secondary'>No tasks match</Typography></Box>
        ) : tasks.map((task, i) => (
          <TaskRow
            key={task.id}
            task={task}
            even={i % 2 === 0}
            onEdit={openEdit}
            onDelete={setDeleteId}
            onSprintClick={setSprintFilter}
            onSprintChange={handleSprintChange}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onDeviceChange={handleDeviceChange}
            onRevert={handleRevert}
            sprints={sprints}
            isLocked={!!task.sprintId && lockedSprintIds.has(task.sprintId)}
            gridTemplateColumns={gridTemplateColumns}
            visibleColumns={visibleColumns}
          />
        ))}
      </Box>

      {/* ── Edit dialog ──────────────────────────────────────────────── */}
      <EditDialog
        open={dialogOpen}
        task={editTask}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        loading={createMutation.isPending || updateMutation.isPending}
        sprints={sprints}
      />

      {/* ── Help dialog ──────────────────────────────────────────────── */}
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* ── Changelog / History dialog ───────────────────────────────── */}
      <ChangelogDialog open={historyOpen} onClose={() => setHistoryOpen(false)} sprints={sprints} />

      {/* ── Sprint manager ───────────────────────────────────────────── */}
      <SprintManagerDialog
        open={sprintMgrOpen}
        onClose={() => setSprintMgrOpen(false)}
        sprints={sprints}
        onRefresh={() => { refetchSprints(); qc.invalidateQueries({ queryKey: ['dev-tasks'] }) }}
      />

      {/* ── Delete confirm ───────────────────────────────────────────── */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth='xs'>
        <DialogTitle>Delete Task?</DialogTitle>
        <DialogContent><Typography>This cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color='error' variant='contained' disabled={deleteMutation.isPending}
            onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
    </Box>
  )
}

// ─── Row component ────────────────────────────────────────────────────────────

function TaskRow({ task, even, onEdit, onDelete, onRevert, onSprintClick, onSprintChange, onStatusChange, onPriorityChange, onDeviceChange, sprints, isLocked, gridTemplateColumns, visibleColumns }: {
  task: Task
  even: boolean
  isLocked: boolean
  sprints: Sprint[]
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
  onRevert: (taskId: string) => void
  onSprintClick: (sprintId: string) => void
  onSprintChange:   (taskId: string, sprintId: string | null) => void
  onStatusChange:   (taskId: string, status: string) => void
  onPriorityChange: (taskId: string, priority: string | null) => void
  onDeviceChange:   (taskId: string, device: string | null) => void
  gridTemplateColumns: string
  visibleColumns: Array<{ id: string; label: string; canHide: boolean }>
}) {
  const [sprintOpen,   setSprintOpen]   = useState(false)
  const [statusOpen,   setStatusOpen]   = useState(false)
  const [deviceOpen,   setDeviceOpen]   = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)

  const statusColor = STATUS_COLOR[task.status] ?? COLORS.gray500
  const statusEditable = !isLocked && task.status !== 'Done' && task.status !== 'DONE' && task.status !== 'RUN'

  // Numeric priority colour (0-9); falls back to legacy text colours
  const priNum = Number(task.priority)
  const priorityColor = !isNaN(priNum) && task.priority !== null && task.priority !== ''
    ? priNum >= 8 ? COLORS.error : priNum >= 6 ? COLORS.orange : priNum >= 3 ? COLORS.warning : COLORS.gray500
    : PRIORITY_COLOR[task.priority ?? ''] ?? COLORS.gray500

  // Map of column renderers
  const columnRenderers: Record<string, React.ReactNode> = {
    seq: (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
        {isLocked && <i className='tabler-lock' style={{ fontSize: '0.65rem', color: COLORS.error }} />}
        <Typography variant='caption' sx={{ color: 'text.disabled', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {task.seq}
        </Typography>
      </Box>
    ),
    status: (
      <Box onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()} sx={{ mx: '2px', overflow: 'hidden', minWidth: 0 }}>
        <Select
          value={task.status}
          open={statusOpen}
          onOpen={() => statusEditable && setStatusOpen(true)}
          onClose={() => setStatusOpen(false)}
          onChange={e => { onStatusChange(task.id, e.target.value as string); setStatusOpen(false) }}
          size='small'
          disabled={!statusEditable}
          displayEmpty
          variant='standard'
          disableUnderline
          renderValue={() => (
            <Tooltip title={statusEditable ? 'Click to change status' : task.status === 'RUN' ? 'Agent is working — cannot change' : 'Completed'} placement='top'>
              <Chip
                label={task.status}
                size='small'
                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: `${statusColor}22`, color: statusColor, border: 'none',
                  cursor: statusEditable ? 'pointer' : 'default', width: '100%', justifyContent: 'center' }}
              />
            </Tooltip>
          )}
          sx={{ width: '100%', '& .MuiSelect-select': { p: 0, display: 'flex', justifyContent: 'center' }, '& .MuiSelect-icon': { display: 'none' }, bgcolor: 'transparent' }}
        >
          {STATUS_OPTIONS.filter(s => s !== 'Done' && s !== 'RUN').map(s => {
            const c = STATUS_COLOR[s] ?? COLORS.gray500
            return (
              <MenuItem key={s} value={s} dense>
                <Chip label={s} size='small' sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: `${c}22`, color: c, border: 'none', pointerEvents: 'none' }} />
              </MenuItem>
            )
          })}
        </Select>
      </Box>
    ),
    description: (
      <Tooltip
        title={<Box component='pre' sx={{ m: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap', maxWidth: 500 }}>{task.description}</Box>}
        placement='top-start'
        enterDelay={400}
      >
        <Typography
          variant='caption'
          sx={{ fontSize: '0.78rem', lineHeight: 1.4, pr: 1, cursor: 'pointer', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          onDoubleClick={() => onEdit(task)}
        >
          {task.description}
        </Typography>
      </Tooltip>
    ),
    sprintName: (
      <Box onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
        <Select
          value={task.sprintId ?? ''}
          open={sprintOpen}
          onOpen={() => !isLocked && setSprintOpen(true)}
          onClose={() => setSprintOpen(false)}
          onChange={e => {
            const val = e.target.value as string
            onSprintChange(task.id, val || null)
            setSprintOpen(false)
          }}
          size='small'
          disabled={isLocked}
          displayEmpty
          variant='standard'
          disableUnderline
          renderValue={() => task.sprintName ? (
            <Chip
              icon={isLocked ? <i className='tabler-lock' style={{ fontSize: '0.7rem', marginLeft: 5 }} /> : undefined}
              label={task.sprintName}
              size='small'
              sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: isLocked ? 'default' : 'pointer',
                bgcolor: isLocked ? ALPHA.errorBgMed : 'primary.lightOpacity',
                color:   isLocked ? 'error.main' : 'primary.main' }}
            />
          ) : (
            <Typography variant='caption' color='text.disabled' sx={{ fontSize: '0.78rem', cursor: 'pointer' }}>— assign —</Typography>
          )}
          sx={{ '& .MuiSelect-select': { p: 0 }, '& .MuiSelect-icon': { display: 'none' }, bgcolor: 'transparent' }}
        >
          <MenuItem value='' dense><Typography variant='caption' color='text.secondary'>— Unassigned —</Typography></MenuItem>
          {sprints.map(s => (
            <MenuItem key={s.id} value={s.id} dense>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {s.isLocked && <i className='tabler-lock' style={{ fontSize: '0.65rem', color: COLORS.error }} />}
                <Typography variant='caption'>{s.name}</Typography>
              </Box>
            </MenuItem>
          ))}
          {task.sprintId && (
            <MenuItem value={task.sprintId} dense onClick={() => { onSprintClick(task.sprintId!); setSprintOpen(false) }}>
              <Typography variant='caption' color='primary.main'>
                <i className='tabler-filter text-xs mr-1' />Filter to this sprint
              </Typography>
            </MenuItem>
          )}
        </Select>
      </Box>
    ),
    priority: (
      <Box onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()} sx={{ overflow: 'hidden', minWidth: 0 }}>
        <Select
          value={task.priority ?? ''}
          open={priorityOpen}
          onOpen={() => !isLocked && setPriorityOpen(true)}
          onClose={() => setPriorityOpen(false)}
          onChange={e => {
            onPriorityChange(task.id, e.target.value as string || null)
            setPriorityOpen(false)
          }}
          size='small'
          disabled={isLocked}
          displayEmpty
          variant='standard'
          disableUnderline
          renderValue={() => (
            <Tooltip title={isLocked ? 'Locked' : 'Click to set priority (0–9)'} placement='top' enterDelay={600}>
              <Typography variant='caption'
                sx={{ fontSize: '0.95rem', fontWeight: 700, color: task.priority ? priorityColor : 'text.disabled',
                  px: 0.75, py: '1px', borderRadius: '4px', textAlign: 'center', minWidth: 52,
                  bgcolor: task.priority ? `${priorityColor}18` : 'transparent',
                  border: '1px solid', borderColor: task.priority ? `${priorityColor}44` : 'transparent',
                  cursor: isLocked ? 'default' : 'pointer',
                }}>
                {task.priority ?? '—'}
              </Typography>
            </Tooltip>
          )}
          sx={{ width: '100%', '& .MuiSelect-select': { p: 0, display: 'flex', justifyContent: 'center' }, '& .MuiSelect-icon': { display: 'none' }, bgcolor: 'transparent' }}
        >
          <MenuItem value='' dense><Typography variant='caption' color='text.disabled'>— blank —</Typography></MenuItem>
          {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(p => {
            const n = Number(p)
            const c = n >= 8 ? COLORS.error : n >= 6 ? COLORS.orange : n >= 3 ? COLORS.warning : COLORS.gray500
            return (
              <MenuItem key={p} value={p} dense>
                <Typography variant='caption' sx={{ fontSize: '0.85rem', fontWeight: 700, color: c }}>
                  {p}
                </Typography>
              </MenuItem>
            )
          })}
        </Select>
      </Box>
    ),
    device: (
      <Box onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()} sx={{ overflow: 'hidden', minWidth: 0 }}>
        <Select
          value={task.device ?? ''}
          open={deviceOpen}
          onOpen={() => !isLocked && setDeviceOpen(true)}
          onClose={() => setDeviceOpen(false)}
          onChange={e => {
            onDeviceChange(task.id, e.target.value as string || null)
            setDeviceOpen(false)
          }}
          size='small'
          disabled={isLocked}
          displayEmpty
          variant='standard'
          disableUnderline
          renderValue={() => task.device ? (
            <Typography variant='caption' sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'text.primary', cursor: 'pointer' }}>
              {task.device}
            </Typography>
          ) : (
            <Tooltip title='No area assigned — agent will SKIP this task'>
              <Chip label='⚠ unscoped' size='small'
                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: ALPHA.errorBgMed, color: COLORS.error, border: `1px solid ${ALPHA.errorBgDense}`, cursor: 'pointer' }} />
            </Tooltip>
          )}
          sx={{ width: '100%', '& .MuiSelect-select': { p: 0 }, '& .MuiSelect-icon': { display: 'none' }, bgcolor: 'transparent' }}
        >
          <MenuItem value='' dense><Typography variant='caption' color='text.disabled'>— unset —</Typography></MenuItem>
          {DEVICE_OPTIONS.map(d => (
            <MenuItem key={d} value={d} dense><Typography variant='caption' sx={{ fontSize: '0.9rem', fontWeight: 500 }}>{d}</Typography></MenuItem>
          ))}
        </Select>
      </Box>
    ),
    agent: (
      <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, textAlign: 'center' }}>
        {task.agent ?? '—'}
      </Typography>
    ),
    deployId: (
      <Typography variant='caption' sx={{ fontSize: '0.85rem', fontFamily: 'monospace', color: task.deployId ? 'success.main' : 'text.disabled', textAlign: 'center' }}>
        {task.deployId ? task.deployId.slice(0, 7) : '—'}
      </Typography>
    ),
    commitId: (
      <Tooltip title={task.commitId ? `git revert ${task.commitId}` : 'No commit recorded'} placement='top'>
        <Typography variant='caption'
          sx={{ fontSize: '0.7rem', fontFamily: 'monospace', color: task.commitId ? 'info.main' : 'text.disabled', cursor: task.commitId ? 'copy' : 'default' }}
          onClick={() => task.commitId && navigator.clipboard.writeText(task.commitId)}>
          {task.commitId ? task.commitId.slice(0, 7) : '—'}
        </Typography>
      </Tooltip>
    ),
    duration: (
      <Tooltip title={task.duration ? `${task.duration}s (RUN → Done)` : 'Not yet timed'} placement='top'>
        <Typography variant='caption' sx={{ fontSize: '0.7rem', fontFamily: 'monospace', color: task.duration ? 'text.secondary' : 'text.disabled' }}>
          {task.duration ? fmtDuration(task.duration) : '—'}
        </Typography>
      </Tooltip>
    ),
    action: (
      <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}>
        <Tooltip title={isLocked ? 'Sprint is locked — unlock sprint to edit' : 'Edit'} placement='top'>
          <span>
            <IconButton size='small' onClick={() => onEdit(task)} sx={{ p: '2px' }} disabled={isLocked}>
              <i className={isLocked ? 'tabler-lock text-xs' : 'tabler-pencil text-xs'} />
            </IconButton>
          </span>
        </Tooltip>
        {!isLocked && task.status !== 'CODE' && task.status !== 'BACKLOG' && (
          <Tooltip title='Revert to CODE — clears agent, run_at, duration' placement='top'>
            <IconButton size='small' onClick={() => onRevert(task.id)} sx={{ p: '2px', color: 'warning.main' }}>
              <i className='tabler-rotate-counterclockwise text-xs' />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={isLocked ? 'Sprint is locked' : 'Delete'} placement='top'>
          <span>
            <IconButton size='small' color='error' onClick={() => onDelete(task.id)} sx={{ p: '2px' }} disabled={isLocked}>
              <i className='tabler-trash text-xs' />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    ),
  }

  return (
    <Box
      onDoubleClick={() => onEdit(task)}
      sx={{
        display: 'grid',
        gridTemplateColumns,
        gap: 0, px: 1, py: '4px',
        alignItems: 'start',
        bgcolor: isLocked
          ? (even ? ALPHA.errorBgRed50 : ALPHA.errorBgRed100)
          : (even ? 'background.paper' : 'action.hover'),
        borderBottom: '1px solid', borderColor: 'divider',
        cursor: 'default',
        opacity: isLocked ? 0.75 : 1,
        '&:hover': { bgcolor: isLocked ? ALPHA.errorBgRed200 : 'primary.lightOpacity' },
        minHeight: 40,
      }}
    >
      {visibleColumns.map(col => (
        <Box
          key={col.id}
          sx={{
            textAlign: col.id === 'seq' ? 'right' : (col.id === 'priority' || col.id === 'agent' || col.id === 'deployId') ? 'center' : 'left',
            ...(col.id !== 'description' && {
              display: 'flex',
              alignItems: 'center',
              justifyContent: (col.id === 'priority' || col.id === 'agent' || col.id === 'deployId') ? 'center' : 'flex-start',
              minHeight: '100%'
            })
          }}
        >
          {columnRenderers[col.id]}
        </Box>
      ))}
    </Box>
  )
}
