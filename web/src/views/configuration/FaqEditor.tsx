'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import CustomTextField from '@core/components/mui/TextField'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '@/lib/api'
import { COLORS } from '@/theme/designTokens'

// TipTap
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'

// ─── Types ────────────────────────────────────────────────────────────────────
interface FaqItem {
  id: string
  category: string
  question: string
  answer: string
  sortOrder: number
  isActive: boolean
  creAt: string
  modAt: string
}

const CATEGORIES = ['General', 'Billing', 'Features', 'Getting Started', 'Mobile', 'Integrations', 'Security']

// ─── TipTap Mini Editor ───────────────────────────────────────────────────────
function MiniEditor({ content, onChange }: Readonly<{ content: string; onChange: (html: string) => void }>) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        style: 'min-height:120px;padding:12px;outline:none;font-size:0.875rem;line-height:1.6;',
      },
    },
  })

  if (!editor) return null

  const btnStyle = (active: boolean) => ({
    minWidth: 32,
    height: 28,
    padding: '0 6px',
    borderRadius: 4,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.8rem',
    background: active ? 'var(--mui-palette-primary-main)' : 'transparent',
    color: active ? COLORS.white : 'var(--mui-palette-text-secondary)',
  } as React.CSSProperties)

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 0.5, px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover', flexWrap: 'wrap' }}>
        <button type="button" style={btnStyle(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <i className="tabler-bold" />
        </button>
        <button type="button" style={btnStyle(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <i className="tabler-italic" />
        </button>
        <button type="button" style={btnStyle(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <i className="tabler-underline" />
        </button>
        <Box sx={{ width: '1px', bgcolor: 'divider', mx: 0.5 }} />
        <button type="button" style={btnStyle(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
          <i className="tabler-list" />
        </button>
        <button type="button" style={btnStyle(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
          <i className="tabler-list-numbers" />
        </button>
        <Box sx={{ width: '1px', bgcolor: 'divider', mx: 0.5 }} />
        <button type="button" style={btnStyle(editor.isActive('link'))} onClick={() => {
          if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run()
          } else {
            const url = globalThis.prompt('Enter URL:')
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }
        }} title="Link">
          <i className="tabler-link" />
        </button>
        <button type="button" style={btnStyle(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <i className="tabler-minus" />
        </button>
      </Box>
      {/* Editor area */}
      <EditorContent editor={editor} />
    </Box>
  )
}

// ─── Sortable FAQ Row ─────────────────────────────────────────────────────────
function SortableFaqRow({ faq, onEdit, onToggle, onDelete }: Readonly<{
  faq: FaqItem
  onEdit: (f: FaqItem) => void
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
}>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: faq.id })
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined, opacity: isDragging ? 0.85 : 1 }

  return (
    <Box ref={setNodeRef} style={style} sx={{
      display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, px: 2, borderRadius: 1,
      bgcolor: isDragging ? 'action.selected' : 'transparent',
      '&:hover': { bgcolor: 'action.hover' },
      borderBottom: '1px solid', borderColor: 'divider',
    }}>
      <Box {...attributes} {...listeners} sx={{ color: 'text.disabled', cursor: 'grab', '&:active': { cursor: 'grabbing' }, touchAction: 'none' }}>
        <i className="tabler-grip-vertical text-base" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>{faq.question}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {faq.category} · {faq.answer.replace(/<[^>]*>/g, '').substring(0, 80)}...
        </Typography>
      </Box>
      <Chip label={faq.category} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
      <Tooltip title="Edit">
        <IconButton size="small" onClick={() => onEdit(faq)}><i className="tabler-pencil text-base" /></IconButton>
      </Tooltip>
      <Tooltip title={faq.isActive ? 'Active' : 'Inactive'}>
        <Switch size="small" checked={faq.isActive} onChange={() => onToggle(faq.id, !faq.isActive)} />
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" color="error" onClick={() => onDelete(faq.id)}><i className="tabler-trash text-base" /></IconButton>
      </Tooltip>
    </Box>
  )
}

// ─── Main Editor ──────────────────────────────────────────────────────────────
/**
 * FAQ content editor with TipTap WYSIWYG, drag-to-reorder, and AI generation.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/configuration/FaqEditor.tsx
 */
export default function FaqEditor() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FaqItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Form state
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [category, setCategory] = useState('General')

  // AI state
  const [aiTopic, setAiTopic] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: faqs = [], isLoading } = useQuery<FaqItem[]>({
    queryKey: ['faq-items'],
    queryFn: () => api.get('/api/faq'),
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/faq', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['faq-items'] }); handleClose() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/api/faq/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['faq-items'] }); handleClose() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/faq/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['faq-items'] }); setDeleteId(null) },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/api/faq/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faq-items'] }),
  })

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => api.put('/api/faq/reorder', { orderedIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faq-items'] }),
  })

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = faqs.findIndex(f => f.id === active.id)
    const newIndex = faqs.findIndex(f => f.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(faqs, oldIndex, newIndex)
    reorderMutation.mutate(reordered.map(f => f.id))
  }

  // ── Dialog handlers ───────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditing(null)
    setQuestion('')
    setAnswer('')
    setCategory('General')
    setAiTopic('')
    setDialogOpen(true)
  }

  const handleOpenEdit = (faq: FaqItem) => {
    setEditing(faq)
    setQuestion(faq.question)
    setAnswer(faq.answer)
    setCategory(faq.category)
    setAiTopic('')
    setDialogOpen(true)
  }

  const handleClose = () => {
    setDialogOpen(false)
    setEditing(null)
  }

  const handleSave = () => {
    if (!question.trim()) return
    const data = { category, question: question.trim(), answer }
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...data })
    } else {
      createMutation.mutate(data)
    }
  }

  // ── AI Generate ───────────────────────────────────────────────────────────
  const handleAiGenerate = useCallback(async () => {
    if (!aiTopic.trim()) return
    setAiLoading(true)
    try {
      const res = await api.post<{ question: string; answer: string; category: string }>('/api/faq/generate', { topic: aiTopic.trim() })
      setQuestion(res.question)
      setAnswer(res.answer)
      setCategory(res.category)
    } catch {
      // Silently fail — user can still type manually
    } finally {
      setAiLoading(false)
    }
  }, [aiTopic])

  const activeCount = faqs.filter(f => f.isActive).length

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Manage FAQ entries shown on the public site. Drag to reorder, toggle visibility, or use AI to generate new entries.
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {faqs.length} total · {activeCount} active
          </Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<i className="tabler-plus text-base" />} onClick={handleOpenCreate}>
          Add FAQ
        </Button>
      </Box>

      {/* FAQ List */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={32} /></Box>
      ) : faqs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <i className="tabler-help-circle text-5xl mb-2" style={{ display: 'block' }} />
          <Typography variant="body1" fontWeight={500}>No FAQ entries yet</Typography>
          <Typography variant="body2">Click &quot;Add FAQ&quot; to create your first entry.</Typography>
        </Box>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={faqs.map(f => f.id)} strategy={verticalListSortingStrategy}>
            {faqs.map(faq => (
              <SortableFaqRow
                key={faq.id}
                faq={faq}
                onEdit={handleOpenEdit}
                onToggle={(id, active) => toggleMutation.mutate({ id, isActive: active })}
                onDelete={id => setDeleteId(id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* ── Create/Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editing ? 'Edit FAQ' : 'New FAQ'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3 }}>
          {/* AI Generator */}
          {!editing && (
            <Alert
              severity="info"
              icon={<i className="tabler-sparkles text-lg" />}
              sx={{ '& .MuiAlert-message': { width: '100%' } }}
            >
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>✨ Generate with AI</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <CustomTextField
                  fullWidth
                  size="small"
                  placeholder="e.g. how to schedule recurring jobs, mobile offline mode, payment processing..."
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAiGenerate() } }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAiGenerate}
                  disabled={!aiTopic.trim() || aiLoading}
                  sx={{ flexShrink: 0, minWidth: 100 }}
                >
                  {aiLoading ? <CircularProgress size={18} color="inherit" /> : 'Generate'}
                </Button>
              </Box>
            </Alert>
          )}

          {/* Category */}
          <CustomTextField
            select
            fullWidth
            label="Category"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </CustomTextField>

          {/* Question */}
          <CustomTextField
            fullWidth
            label="Question"
            required
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="e.g. How do I schedule a recurring job?"
          />

          {/* Answer — WYSIWYG */}
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Answer</Typography>
            <MiniEditor content={answer} onChange={setAnswer} key={editing?.id || 'new'} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!question.trim() || createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm ─────────────────────────────────────────────── */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs">
        <DialogTitle>Delete FAQ</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Are you sure you want to delete this FAQ entry? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
