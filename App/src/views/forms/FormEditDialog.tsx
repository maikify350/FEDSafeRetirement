'use client'

/**
 * FormEditDialog — Create / edit / delete a federal form record.
 * Supports PDF drag-drop upload to Supabase Storage 'Forms' bucket.
 * Admin only for save / delete.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import CustomTextField from '@core/components/mui/TextField'
import EntityEditDialog from '@/components/EntityEditDialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import { createClient } from '@/utils/supabase/client'
import { useVoiceExplainerAudio, stopVoiceExplainer } from '@/hooks/useVoiceExplainer'

export interface FedForm {
  id: string
  form_id: string
  aka: string | null
  title: string
  description: string | null
  tags: string | null
  source_url: string | null
  instruct_pages: string | null
  fill_pages: string | null
  form_url: string | null
  summary: string | null
  explainer_url: string | null
  mapping: object[]
  cre_by: string
  cre_dt: string
  mod_by: string
  mod_dt: string | null
  version_no: number
}

interface Props {
  open: boolean
  onClose: () => void
  form: FedForm | null   // null = new
  onSaved?: () => void
  isAdmin: boolean
}

const EMPTY = {
  form_id: '', aka: '', title: '', description: '', tags: '',
  source_url: '', instruct_pages: '', fill_pages: '', form_url: '',
  summary: '', explainer_url: '', mappingJson: '[]',
}

export default function FormEditDialog({ open, onClose, form, onSaved, isAdmin }: Props) {
  const [fields, setFields] = useState({ ...EMPTY })
  const [mappingJson, setMappingJson] = useState('[]')
  const [mappingError, setMappingError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const csvInputRef   = useRef<HTMLInputElement>(null)
  const [csvDragOver, setCsvDragOver] = useState(false)

  // Singleton audio hook — URL drives loading; no re-render loops
  const explainerUrl = fields.explainer_url || null
  const { isPlaying, currentTime, duration, play, pause, restart, seek } = useVoiceExplainerAudio(explainerUrl)

  useEffect(() => {
    if (form) {
      setFields({
        form_id:        form.form_id,
        aka:            form.aka ?? '',
        title:          form.title,
        description:    form.description ?? '',
        tags:           form.tags ?? '',
        source_url:     form.source_url ?? '',
        instruct_pages: form.instruct_pages ?? '',
        fill_pages:     form.fill_pages ?? '',
        form_url:       form.form_url ?? '',
        summary:        form.summary ?? '',
        explainer_url:  form.explainer_url ?? '',
        mappingJson:    JSON.stringify(form.mapping ?? [], null, 2),
      })
      setMappingJson(JSON.stringify(form.mapping ?? [], null, 2))
    } else {
      setFields({ ...EMPTY })
      setMappingJson('[]')
    }
    setMappingError('')
    setDirty(false)
    setError('')
    setSuccess(false)
    stopVoiceExplainer()
  }, [form, open])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields(prev => ({ ...prev, [field]: e.target.value }))
    setDirty(true)
  }

  // ── PDF Upload ──────────────────────────────────────────────────────────────
  const uploadPdf = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) { setError('Only PDF files are accepted'); return }
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('form_id', fields.form_id || 'unknown')
      const res = await fetch('/api/forms/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error || `Upload failed (HTTP ${res.status})`); return }
      setFields(prev => ({ ...prev, form_url: data.url }))
      setDirty(true)
    } catch (e: any) {
      setError(`Upload error: ${e?.message || 'Network failure'}`)
    } finally {
      setUploading(false)
    }
  }, [fields.form_id])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadPdf(file)
  }, [uploadPdf])

  // ── CSV Mapping Upload ────────────────────────────────────────────────────
  const parseCsvToMapping = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    const result: { pdfField: string; crmField: string }[] = []
    lines.slice(1).forEach(line => {
      const cols: string[] = []
      let cur = '', inQ = false
      for (const ch of line) {
        if (ch === '"') inQ = !inQ
        else if (ch === ',' && !inQ) { cols.push(cur); cur = '' }
        else cur += ch
      }
      cols.push(cur)
      const pdfField = (cols[0] ?? '').trim()
      const crmField = (cols[1] ?? '').trim()
      if (pdfField) result.push({ pdfField, crmField })
    })
    return result
  }

  const handleCsvUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) { setError('Only .csv files are accepted here'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCsvToMapping(text)
      const json = JSON.stringify(rows, null, 2)
      setMappingJson(json)
      setDirty(true)
      setMappingError('')
    }
    reader.readAsText(file)
  }

  const handleCsvDrop = (e: React.DragEvent) => {
    e.preventDefault(); setCsvDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleCsvUpload(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadPdf(file)
  }

  // ── Generate Explainer (summary + TTS) ────────────────────────────────────
  const handleGenerateExplainer = async () => {
    if (!form?.id) return
    setSummarizing(true); setError('')
    try {
      const res = await fetch(`/api/forms/${form.id}/summarize`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Generation failed'); return }
      setFields(prev => ({ ...prev, summary: data.summary, explainer_url: data.explainer_url }))
      setDirty(true)
      setSuccess(true)
    } catch { setError('Network error') } finally { setSummarizing(false) }
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!fields.form_id.trim()) { setError('Form ID is required'); return }
    if (!fields.title.trim()) { setError('Title is required'); return }
    // Validate mapping JSON
    let parsedMapping: object[] = []
    try {
      parsedMapping = JSON.parse(mappingJson)
      if (!Array.isArray(parsedMapping)) throw new Error('Must be a JSON array')
    } catch (e: any) {
      setError(`Mapping JSON is invalid: ${e.message}`); return
    }
    setSaving(true); setError('')
    try {
      const url = form ? `/api/forms/${form.id}` : '/api/forms'
      const method = form ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, mapping: parsedMapping, version_no: form?.version_no ?? 1 }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      setSuccess(true); setDirty(false); onSaved?.()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!form) return
    setDeleting(true); setError('')
    try {
      const res = await fetch(`/api/forms/${form.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete'); return
      }
      setConfirmDelete(false)
      onSaved?.()
      onClose()
    } catch { setError('Network error') } finally { setDeleting(false) }
  }

  const tagChips = fields.tags.split(',').map(t => t.trim()).filter(Boolean)

  return (
    <>
      <EntityEditDialog
        open={open} onClose={onClose}
        title={form ? `Edit Form: ${form.form_id}` : 'New Federal Form'}
        subtitle={form ? `${form.aka ?? ''} · ${form.title}` : 'New'}
        icon='tabler-file-description'
        onSave={handleSave} saving={saving || deleting} dirty={dirty}
        error={error} onClearError={() => setError('')}
        showSuccess={success} onClearSuccess={() => setSuccess(false)}
        successMessage='Form saved!'
        entityId={form?.id}
        createdAt={form?.cre_dt}
        createdBy={form?.cre_by}
        modifiedAt={form?.mod_dt ?? undefined}
        modifiedBy={form?.mod_by}
        width='62vw' maxWidth={880} height='88vh'
        headerActions={
          <>
            {/* Generate Explainer button — admin + existing record only */}
            {isAdmin && form && (
              <Tooltip title={summarizing ? 'Generating…' : 'Generate AI Summary + Audio Explainer'}>
                <span>
                  <IconButton
                    size='small'
                    onClick={handleGenerateExplainer}
                    disabled={summarizing || saving}
                    sx={{
                      bgcolor: 'primary.lighter',
                      color: 'primary.main',
                      '&:hover': { bgcolor: 'primary.light' },
                      borderRadius: 1.5,
                      px: 1.5,
                      gap: 0.5,
                    }}
                  >
                    {summarizing
                      ? <CircularProgress size={16} color='inherit' />
                      : <i className='tabler-sparkles' style={{ fontSize: '1rem' }} />}
                    <Typography variant='caption' fontWeight={600} sx={{ display: { xs: 'none', sm: 'block' } }}>
                      {summarizing ? 'Generating…' : 'Generate'}
                    </Typography>
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {/* Inline VCR-style player — appears only when explainer_url is set */}
            {fields.explainer_url && (
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 0.75,
                px: 1.5, py: 0.5,
                border: '1px solid', borderColor: 'primary.main',
                borderRadius: 5, bgcolor: 'background.paper',
                minWidth: 180,
              }}>
                {/* 🔊 label */}
                <Typography sx={{ fontSize: 13, lineHeight: 1 }}>🔊</Typography>
                {/* Progress bar */}
                <Box
                  onClick={(e) => {
                    if (duration <= 0) return
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    const pct = (e.clientX - rect.left) / rect.width
                    seek(pct * duration)
                  }}
                  sx={{
                    flex: 1, height: 4, bgcolor: 'divider', borderRadius: 2,
                    overflow: 'hidden', cursor: 'pointer', minWidth: 60,
                  }}
                >
                  <Box sx={{
                    height: '100%', bgcolor: 'primary.main', borderRadius: 2,
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                    transition: 'width 0.1s linear',
                  }} />
                </Box>
                {/* Time */}
                <Typography variant='caption' sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 50, textAlign: 'right', fontSize: 10, color: 'text.secondary' }}>
                  {`${Math.floor(currentTime / 60)}:${String(Math.floor(currentTime % 60)).padStart(2, '0')}`}
                  {duration > 0 ? ` / ${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}` : ''}
                </Typography>
                {/* Restart */}
                <IconButton size='small' onClick={restart} sx={{ p: 0.25 }} title='Restart'>
                  <i className='tabler-player-skip-back' style={{ fontSize: '0.85rem' }} />
                </IconButton>
                {/* Play / Pause */}
                <IconButton
                  size='small'
                  onClick={isPlaying ? pause : play}
                  sx={{ p: 0.5, bgcolor: 'primary.main', color: '#fff', borderRadius: '50%', '&:hover': { bgcolor: 'primary.dark' } }}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  <i className={isPlaying ? 'tabler-player-pause' : 'tabler-player-play'} style={{ fontSize: '0.85rem' }} />
                </IconButton>
              </Box>
            )}
          </>
        }
      >
        {/* Row 1: Form ID + AKA */}
        <div className='grid grid-cols-2 gap-3 mb-3'>
          <CustomTextField
            fullWidth label='Form ID *' value={fields.form_id}
            onChange={set('form_id')} disabled={saving || !isAdmin}
            placeholder='SF-2818'
          />
          <CustomTextField
            fullWidth label='Also Known As (AKA)' value={fields.aka}
            onChange={set('aka')} disabled={saving || !isAdmin}
            placeholder='FEGLI Cont.'
          />
        </div>

        {/* Title */}
        <div className='grid grid-cols-1 gap-3 mb-3'>
          <CustomTextField
            fullWidth label='Title *' value={fields.title}
            onChange={set('title')} disabled={saving || !isAdmin}
            placeholder='Continuation of Life Insurance Coverage'
          />
        </div>

        {/* Description */}
        <div className='grid grid-cols-1 gap-3 mb-3'>
          <CustomTextField
            fullWidth label='Description' value={fields.description}
            onChange={set('description')} disabled={saving || !isAdmin}
            multiline rows={2} placeholder='Brief description of the form purpose...'
          />
        </div>

        {/* Summary (TTS) */}
        <div className='grid grid-cols-1 gap-3 mb-3'>
          <CustomTextField
            fullWidth label='Explainer Summary (TTS)' value={fields.summary}
            onChange={set('summary')} disabled={saving || !isAdmin}
            multiline rows={3}
            placeholder='Natural language summary to be read aloud as a voice explainer...'
            helperText='This text will be passed through the TTS engine to generate the audio explainer.'
          />
        </div>

        {/* Row: Page ranges */}
        <Box sx={{ mb: 3 }}>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
            PAGE RANGES — use <strong>dash</strong> for ranges (1-3), <strong>comma</strong> for non-contiguous (1-3, 5). Pages can interleave (e.g. instructions 1-3, 5 with form body on page 4).
          </Typography>
          <div className='grid grid-cols-2 gap-3'>
            <CustomTextField
              fullWidth label='Instruction / Reference Pages' value={fields.instruct_pages}
              onChange={set('instruct_pages')} disabled={saving || !isAdmin}
              placeholder='e.g. 1-3, 5'
              helperText='Pages containing instructions'
            />
            <CustomTextField
              fullWidth label='Form Body Pages' value={fields.fill_pages}
              onChange={set('fill_pages')} disabled={saving || !isAdmin}
              placeholder='e.g. 4'
              helperText='Pages with fillable fields'
            />
          </div>
        </Box>

        {/* Tags */}
        <div className='grid grid-cols-1 gap-3 mb-3'>
          <CustomTextField
            fullWidth label='Tags (comma-separated)' value={fields.tags}
            onChange={set('tags')} disabled={saving || !isAdmin}
            placeholder='FEGLI,Life Insurance,Retirement'
          />
          {tagChips.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: -1.5 }}>
              {tagChips.map(t => (
                <Chip key={t} label={t} size='small' variant='tonal' color='primary'
                  sx={{ fontSize: 11, height: 20 }} />
              ))}
            </Box>
          )}
        </div>

        {/* Source URL */}
        <div className='grid grid-cols-1 gap-3 mb-3'>
          <CustomTextField
            fullWidth label='Source URL (OPM / IRS)' value={fields.source_url}
            onChange={set('source_url')} disabled={saving || !isAdmin}
            placeholder='https://www.opm.gov/forms/pdf_fill/sf2818.pdf'
          />
        </div>

        {/* PDF Upload Drop Zone */}
        <Box sx={{ mb: 3 }}>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
            PDF FILE (Supabase Storage › Forms bucket)
          </Typography>

          {isAdmin && (
            <Box
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: '2px dashed',
                borderColor: dragOver ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 2,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: dragOver ? 'rgb(var(--mui-palette-primary-mainChannel) / 0.06)' : 'background.default',
                '&:hover': { borderColor: 'primary.main', background: 'rgb(var(--mui-palette-primary-mainChannel) / 0.04)' },
              }}
            >
              {uploading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <CircularProgress size={18} />
                  <Typography variant='body2'>Uploading...</Typography>
                </Box>
              ) : (
                <>
                  <i className='tabler-upload' style={{ fontSize: '1.5rem', color: 'var(--mui-palette-primary-main)' }} />
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                    Drag &amp; drop PDF here, or <strong>click to browse</strong>
                  </Typography>
                </>
              )}
            </Box>
          )}

          <input ref={fileInputRef} type='file' accept='.pdf' hidden onChange={handleFileChange} />

          {fields.form_url && (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className='tabler-file-type-pdf' style={{ color: 'var(--mui-palette-error-main)' }} />
              <Typography variant='caption' sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fields.form_url}
              </Typography>
              <Button size='small' href={fields.form_url} target='_blank' rel='noopener'
                startIcon={<i className='tabler-eye' />} sx={{ flexShrink: 0 }}>
                Preview
              </Button>
            </Box>
          )}
        </Box>

        {/* Explainer audio URL (auto-filled by TTS job, but editable) */}
        <div className='grid grid-cols-1 gap-3 mb-3'>
          <CustomTextField
            fullWidth label='Explainer Audio URL (Supabase › Explainer bucket)'
            value={fields.explainer_url}
            onChange={set('explainer_url')} disabled={saving || !isAdmin}
            placeholder='Auto-filled after TTS generation...'
          />
        </div>

        {/* ACT Field Mapping — CSV uploader + JSON editor */}
        <Box sx={{ mb: 3, pt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ACT Field Mapping
            </Typography>
            {(() => {
              try {
                const arr = JSON.parse(mappingJson)
                return Array.isArray(arr) && arr.length > 0
                  ? <Chip label={`${arr.length} rule${arr.length > 1 ? 's' : ''}`} size='small' color='success' variant='tonal' sx={{ fontSize: 10, height: 18 }} />
                  : <Chip label='empty' size='small' variant='outlined' sx={{ fontSize: 10, height: 18 }} />
              } catch { return <Chip label='invalid JSON' size='small' color='error' variant='tonal' sx={{ fontSize: 10, height: 18 }} /> }
            })()}
          </Box>

          {/* CSV drop-zone */}
          {isAdmin && (
            <Box
              onDragOver={(e) => { e.preventDefault(); setCsvDragOver(true) }}
              onDragLeave={() => setCsvDragOver(false)}
              onDrop={handleCsvDrop}
              onClick={() => csvInputRef.current?.click()}
              sx={{
                border: '2px dashed',
                borderColor: csvDragOver ? 'success.main' : 'divider',
                borderRadius: 1.5, p: 1.5, mb: 1.5,
                display: 'flex', alignItems: 'center', gap: 1.5,
                cursor: 'pointer', transition: 'all 0.2s',
                background: csvDragOver ? 'rgb(var(--mui-palette-success-mainChannel) / 0.06)' : 'transparent',
                '&:hover': { borderColor: 'success.main', background: 'rgb(var(--mui-palette-success-mainChannel) / 0.04)' },
              }}
            >
              <i className='tabler-table-import' style={{ fontSize: '1.25rem', color: 'var(--mui-palette-success-main)', flexShrink: 0 }} />
              <Box>
                <Typography variant='body2' fontWeight={600} color='success.main'>Upload CSV mapping file</Typography>
                <Typography variant='caption' color='text.secondary'>
                  Drag &amp; drop a <code style={{fontSize:10}}>PDF Field, CRM Field</code> CSV, or click to browse. Overwrites the JSON below.
                </Typography>
              </Box>
            </Box>
          )}
          <input ref={csvInputRef} type='file' accept='.csv' hidden
            onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvUpload(f) }} />

          <Typography variant='caption' color='text.disabled' sx={{ display: 'block', mb: 1, lineHeight: 1.4 }}>
            Each entry: <code style={{fontSize:10}}>{'{\"pdfField\": \" Name. Name\", \"crmField\": \"lastname, firstname\"}'}</code>
          </Typography>
          <textarea
            value={mappingJson}
            onChange={e => { setMappingJson(e.target.value); setDirty(true); setMappingError('') }}
            disabled={saving || !isAdmin}
            spellCheck={false}
            placeholder={'[\n  { "pdfField": " Name. Name", "crmField": "lastname, firstname" }\n]'}
            style={{
              width: '100%', minHeight: 140, fontFamily: 'monospace', fontSize: 12,
              padding: '8px 10px', borderRadius: 6,
              border: `1px solid ${mappingError ? 'var(--mui-palette-error-main)' : 'var(--mui-palette-divider)'}`,
              background: 'var(--mui-palette-background-default)',
              color: 'var(--mui-palette-text-primary)',
              resize: 'vertical', outline: 'none', lineHeight: 1.5,
            }}
          />
          {mappingError && (
            <Typography variant='caption' color='error' sx={{ display: 'block', mt: 0.5 }}>{mappingError}</Typography>
          )}
        </Box>

        {/* Delete section — admin only */}
        {isAdmin && form && (
          <Box sx={{ mt: 1, pt: 2, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant='outlined' color='error'
              startIcon={<i className='tabler-trash' />}
              onClick={() => setConfirmDelete(true)}
              disabled={saving || deleting}
              sx={{ borderRadius: '8px' }}
            >
              Delete Form
            </Button>
            <Typography variant='caption' color='text.secondary'>
              This action cannot be undone.
            </Typography>
          </Box>
        )}
      </EntityEditDialog>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title='Delete Federal Form'
        message={`Are you sure you want to delete "${form?.form_id} — ${form?.title}"? This cannot be undone.`}
        confirmLabel='Delete'
        confirmColor='error'
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
