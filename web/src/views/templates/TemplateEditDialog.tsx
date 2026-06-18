'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import Menu from '@mui/material/Menu'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import { toast } from 'react-toastify'

import TiptapEditor, { type TiptapEditorRef } from '@/components/TiptapEditor'

import CustomTextField from '@core/components/mui/TextField'
import { api } from '@/lib/api'
import { getThumbUrl } from '@/lib/imageUtils'
import type { Template, TemplateAppliesTo } from '@shared/contracts'
// Runtime value imported from local lib to avoid bundling @shared/contracts (zod dependency)
import { TEMPLATE_APPLIES_TO_VALUES } from '@/lib/templatePlaceholders'
import { TEMPLATE_PLACEHOLDERS } from '@/lib/templatePlaceholders'
import type { TemplateCategory } from './TemplateCategoryTree'

// ── Types ─────────────────────────────────────────────────────────────────────
type FormData = {
  templateRef: string
  categoryId:  string
  name:        string
  description: string
  appliesTo:   TemplateAppliesTo
  body:        string
  isEnabled:   boolean
}

type GalleryPhoto = {
  id: string
  url: string
  caption: string | null
  category: string
  filename: string | null
}

type Props = {
  open:       boolean
  onClose:    () => void
  template:   Template | null
  categories: TemplateCategory[]
  onSave:     () => Promise<void>
}

const APPLIES_TO_LABELS: Record<TemplateAppliesTo, string> = {
  contacts: 'Contacts', jobs: 'Jobs', quotes: 'Quotes',
  invoices: 'Invoices', purchase_orders: 'Purchase Orders',
  requests: 'Requests', general: 'General',
}

// ─────────────────────────────────────────────────────────────────────────────
// Gallery Image Picker Sub-Dialog
// ─────────────────────────────────────────────────────────────────────────────
function GalleryPickerDialog({
  open, onClose, onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (url: string, alt: string) => void
}) {
  const [photos,   setPhotos]   = useState<GalleryPhoto[]>([])
  const [loading,  setLoading]  = useState(false)
  const [search,   setSearch]   = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.get<{ photos: GalleryPhoto[] }>('/api/photos?category=general&limit=200')
      .then(res => setPhotos((res as any).photos ?? []))
      .catch(() => toast.error('Failed to load gallery'))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = photos.filter(p =>
    !search || p.caption?.toLowerCase().includes(search.toLowerCase()) || p.filename?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth
      sx={{ '& .MuiDialog-paper': { height: '80vh' }, zIndex: 1400 }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <i className='tabler-photo text-xl text-primary' />
          <Typography variant='h6'>Gallery — General Images</Typography>
        </Box>
        <IconButton size='small' onClick={onClose}><i className='tabler-x' /></IconButton>
      </DialogTitle>

      <Box sx={{ px: 3, pb: 1.5 }}>
        <TextField
          size='small' fullWidth placeholder='Search by caption or filename…'
          value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position='start'><i className='tabler-search text-base text-textDisabled' /></InputAdornment> }}
        />
      </Box>

      <DialogContent sx={{ pt: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.disabled', gap: 2 }}>
            <i className='tabler-photo-off text-5xl' />
            <Typography variant='body2'>{search ? 'No images match your search' : 'No images in the General gallery yet'}</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5 }}>
            {filtered.map(photo => (
              <Box
                key={photo.id}
                onClick={() => { onSelect(photo.url, photo.caption ?? photo.filename ?? 'image'); onClose() }}
                onMouseEnter={() => setHoveredId(photo.id)}
                onMouseLeave={() => setHoveredId(null)}
                sx={{
                  borderRadius: 1.5, overflow: 'hidden', cursor: 'pointer',
                  border: '2px solid', borderColor: hoveredId === photo.id ? 'primary.main' : 'divider',
                  transition: 'all 0.15s', transform: hoveredId === photo.id ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: hoveredId === photo.id ? 4 : 0,
                }}
              >
                <Box sx={{ aspectRatio: '4/3', overflow: 'hidden', bgcolor: 'action.hover' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getThumbUrl(photo.url, { width: 320, height: 240 })} alt={photo.caption ?? ''} loading='lazy'
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </Box>
                {photo.caption && (
                  <Box sx={{ px: 1, py: 0.5, bgcolor: 'background.paper' }}>
                    <Typography variant='caption' noWrap color='text.secondary'>{photo.caption}</Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Edit Dialog
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Dialog for editing template content, metadata, and category assignment.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/templates/TemplateEditDialog.tsx
 */
export default function TemplateEditDialog({ open, onClose, template, categories, onSave }: Props) {
  const tiptapRef = useRef<TiptapEditorRef | null>(null)

  const [confirmDelete,    setConfirmDelete]    = useState(false)
  const [deleting,         setDeleting]         = useState(false)
  const [placeholderAnchor, setPlaceholderAnchor] = useState<HTMLButtonElement | null>(null)
  const [placeholderGroup,  setPlaceholderGroup]  = useState<string | null>(null)
  const [galleryOpen,      setGalleryOpen]      = useState(false)
  const [confirmClose,     setConfirmClose]     = useState(false)  // unsaved-changes guard
  const [bodyDirty,        setBodyDirty]        = useState(false)  // Tiptap body outside RHF

  const { control, handleSubmit, reset, watch, formState: { isSubmitting, isDirty } } = useForm<FormData>({
    defaultValues: {
      templateRef: '', categoryId: '', name: '', description: '',
      appliesTo: 'general', body: '', isEnabled: true,
    },
  })

  const watchedAppliesTo = watch('appliesTo')
  const watchedEnabled   = watch('isEnabled')

  useEffect(() => {
    if (open) {
      reset({
        templateRef: template?.templateRef  ?? '',
        categoryId:  (template as any)?.categoryId ?? '',
        name:        template?.name         ?? '',
        description: template?.description  ?? '',
        appliesTo:   template?.appliesTo    ?? 'general',
        body:        template?.body         ?? '',
        isEnabled:   template?.isEnabled    ?? true,
      })
      setConfirmDelete(false); setPlaceholderAnchor(null); setPlaceholderGroup(null)
      setBodyDirty(false); setConfirmClose(false)
    }
  }, [open, template, reset])

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    try {
      const body    = tiptapRef.current ? tiptapRef.current.getHTML() : data.body
      const payload = {
        ...data,
        body,
        categoryId:  data.categoryId || null,
        templateRef: data.templateRef.toUpperCase().trim(),
      }
      if (!template?.id) {
        await api.post('/api/templates', payload)
        toast.success('Template created')
      } else {
        await api.patch(`/api/templates/${template.id}`, payload)
        toast.success('Template saved')
      }
      await onSave()
    } catch { toast.error('Failed to save template') }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!template?.id) return
    setDeleting(true)
    try {
      await api.delete(`/api/templates/${template.id}`)
      toast.success('Template deleted')
      await onSave()
    } catch { toast.error('Failed to delete template') }
    finally { setDeleting(false); setConfirmDelete(false) }
  }

  // ── Placeholder insert ────────────────────────────────────────────────────
  const insertPlaceholder = (token: string) => {
    tiptapRef.current?.insertFieldTag(token)
    setPlaceholderAnchor(null); setPlaceholderGroup(null)
  }

  // ── Gallery image select ──────────────────────────────────────────────────
  const handleGallerySelect = useCallback((url: string, alt: string) => {
    tiptapRef.current?.insertImage(url, alt)
  }, [])

  // ── Close guard — warn if unsaved changes ─────────────────────────────────
  const handleClose = () => {
    if (isDirty || bodyDirty) {
      setConfirmClose(true)
    } else {
      onClose()
    }
  }

  const isNew = !template?.id
  const currentPlaceholders = TEMPLATE_PLACEHOLDERS[watchedAppliesTo] ?? TEMPLATE_PLACEHOLDERS['general']

  // Flatten categories for selector
  const categoryOptions = (() => {
    const map = new Map(categories.map(c => [c.id, c]))
    const getPath = (id: string): string => {
      const cat = map.get(id)
      if (!cat) return ''
      return cat.parentId ? `${getPath(cat.parentId)} › ${cat.name}` : cat.name
    }
    return categories.map(c => ({ id: c.id, label: getPath(c.id) }))
      .sort((a, b) => a.label.localeCompare(b.label))
  })()

  return (
    <>
      {/* Gallery Picker (rendered outside editor dialog to avoid z-index clash) */}
      <GalleryPickerDialog
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={handleGallerySelect}
      />

      {/* Main Dialog */}
      <Dialog open={open} onClose={onClose} fullScreen
        sx={{ '& .MuiDialog-paper': { display: 'flex', flexDirection: 'column' } }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <i className='tabler-file-text text-2xl text-primary' />
            <Typography variant='h5'>{isNew ? 'New Template' : 'Edit Template'}</Typography>
            {!isNew && <Chip label={watchedEnabled ? 'Active' : 'Inactive'} color={watchedEnabled ? 'success' : 'default'} size='small' variant='tonal' />}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Controller name='isEnabled' control={control} render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={e => field.onChange(e.target.checked)} color='success' />}
                label={<Typography variant='body2' fontWeight={500}>{field.value ? 'Active' : 'Inactive'}</Typography>}
                labelPlacement='start' sx={{ mr: 0 }}
              />
            )} />
            <Divider orientation='vertical' flexItem sx={{ mx: 1 }} />
            <Tooltip title='Close'><IconButton size='small' onClick={handleClose}><i className='tabler-x text-xl' /></IconButton></Tooltip>
          </Box>
        </Box>

        {/* Body */}
        <Box component='form' onSubmit={handleSubmit(onSubmit)} sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Metadata row */}
          <Box sx={{ px: 3, py: 2, flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Grid container spacing={2.5}>
              {/* Template ID */}
              <Grid size={{ xs: 12, sm: 2 }}>
                <Controller name='templateRef' control={control}
                  rules={{ required: 'Template ID is required', maxLength: { value: 12, message: 'Max 12 chars' }, pattern: { value: /^[A-Z0-9_]+$/, message: 'Uppercase, digits, underscores only' } }}
                  render={({ field, fieldState }) => (
                    <CustomTextField {...field} fullWidth label='Template ID' required placeholder='CR_APO_01'
                      error={!!fieldState.error} helperText={fieldState.error?.message ?? 'Unique ref'}
                      inputProps={{ maxLength: 12, style: { textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.05em' } }}
                      onChange={e => field.onChange(e.target.value.toUpperCase())} />
                  )}
                />
              </Grid>

              {/* Name */}
              <Grid size={{ xs: 12, sm: 3 }}>
                <Controller name='name' control={control}
                  rules={{ required: 'Name is required', maxLength: { value: 25, message: 'Max 25 chars' } }}
                  render={({ field, fieldState }) => (
                    <CustomTextField {...field} fullWidth label='Template Name' required placeholder='e.g. Apology Letter'
                      error={!!fieldState.error} helperText={fieldState.error?.message ?? `${field.value?.length ?? 0}/25`}
                      inputProps={{ maxLength: 25 }} />
                  )}
                />
              </Grid>

              {/* Applies To */}
              <Grid size={{ xs: 12, sm: 2 }}>
                <Controller name='appliesTo' control={control} render={({ field }) => (
                  <CustomTextField {...field} select fullWidth label='Applies To'>
                    {TEMPLATE_APPLIES_TO_VALUES.map(v => (
                      <MenuItem key={v} value={v}>{APPLIES_TO_LABELS[v]}</MenuItem>
                    ))}
                  </CustomTextField>
                )} />
              </Grid>

              {/* Category Folder */}
              <Grid size={{ xs: 12, sm: 3 }}>
                <Controller name='categoryId' control={control} render={({ field }) => (
                  <CustomTextField {...field} select fullWidth label='Folder'>
                    <MenuItem value=''><em>— Uncategorised —</em></MenuItem>
                    {categoryOptions.map(c => (
                      <MenuItem key={c.id} value={c.id}>
                        <Typography variant='body2' noWrap sx={{ maxWidth: 280 }}>{c.label}</Typography>
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )} />
              </Grid>

              {/* Description */}
              <Grid size={{ xs: 12, sm: 2 }}>
                <Controller name='description' control={control} render={({ field }) => (
                  <CustomTextField {...field} fullWidth label='Description / Memo' placeholder='Brief notes…' />
                )} />
              </Grid>
            </Grid>
          </Box>

          {/* Placeholder toolbar */}
          <Box sx={{ px: 3, py: 1, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, flexWrap: 'wrap', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant='caption' color='text.secondary' sx={{ mr: 0.5, fontWeight: 500 }}>
              Insert:
            </Typography>
            {currentPlaceholders.map(group => (
              <Button key={group.label} size='small' variant='outlined' color='secondary'
                endIcon={<i className='tabler-chevron-down text-xs' />}
                onClick={e => { setPlaceholderAnchor(e.currentTarget); setPlaceholderGroup(group.label) }}
                sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.25 }}>
                {group.label}
              </Button>
            ))}
            <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />
            {/* Gallery image button */}
            <Button size='small' variant='outlined' color='info'
              startIcon={<i className='tabler-photo text-sm' />}
              onClick={() => setGalleryOpen(true)}
              sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.25 }}>
              Gallery Image
            </Button>

            <Menu anchorEl={placeholderAnchor} open={!!placeholderAnchor}
              onClose={() => { setPlaceholderAnchor(null); setPlaceholderGroup(null) }}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
              {(currentPlaceholders.find(g => g.label === placeholderGroup)?.tokens ?? []).map(t => (
                <MenuItem key={t.token} onClick={() => insertPlaceholder(t.token)} dense>
                  <Box>
                    <Typography variant='body2' fontFamily='monospace' color='primary.main'>{t.token}</Typography>
                    <Typography variant='caption' color='text.secondary'>{t.description}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* Tiptap editor */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 1 }}>
            <Controller name='body' control={control} render={({ field }) => (
                          <TiptapEditor
                ref={tiptapRef}
                value={field.value}
                onChange={v => { field.onChange(v); setBodyDirty(true) }}
                placeholder='Start typing your template…'
              />
            )} />
          </Box>

          {/* Footer */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
            <Box>
              {!isNew && (
                <Button variant='tonal' color='error' startIcon={<i className='tabler-trash' />}
                  onClick={() => setConfirmDelete(true)} disabled={isSubmitting || deleting}>
                  Delete
                </Button>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant='tonal' color='secondary' onClick={handleClose} disabled={isSubmitting || deleting}>Cancel</Button>
              <Button variant='contained' type='submit' disabled={isSubmitting || deleting}
                startIcon={isSubmitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}>
                {isSubmitting ? 'Saving…' : isNew ? 'Create Template' : 'Save Changes'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Dialog>

      {/* Discard-changes confirm */}
      <Dialog open={confirmClose} onClose={() => setConfirmClose(false)} maxWidth='xs' fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className='tabler-alert-triangle text-warning text-2xl' />
          Unsaved Changes
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes. If you close now, your edits will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setConfirmClose(false)}>
            Keep Editing
          </Button>
          <Button variant='contained' color='warning' onClick={() => { setConfirmClose(false); onClose() }}
            startIcon={<i className='tabler-trash' />}>
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Delete Template?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>&ldquo;{template?.name}&rdquo;</strong>? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</Button>
          <Button variant='contained' color='error' onClick={handleDelete} disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-trash' />}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
