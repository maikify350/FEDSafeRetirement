'use client'

/**
 * TemplatesView — Windows-Explorer-style template manager.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────────────┐
 *   │  [breadcrumb path]                           [Edit] [New] [Delete]   │
 *   ├──────────────────┬───┬───────────────────────────────────────────────┤
 *   │  Category Tree   │ ↔ │  WYSIWYG Preview (dangerouslySetInnerHTML)    │
 *   │  (right panel)   │   │  (left panel, larger)                         │
 *   └──────────────────┴───┴───────────────────────────────────────────────┘
 *
 * Interactions:
 *  - Click template leaf in tree → preview on right
 *  - Double-click template leaf → open TemplateEditDialog
 *  - Click "New" → open editor for new template
 *  - Drag to reorder folders within same parent
 *  - Double-click folder → inline rename
 *  - Right-click folder → Add Subfolder / Rename / Delete
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import { toast } from 'react-toastify'

import TemplateCategoryTree, {
  type TemplateCategory,
  UNCATEGORIZED_ID,
} from './TemplateCategoryTree'
import TemplateEditDialog from './TemplateEditDialog'
import { api } from '@/lib/api'
import type { Template } from '@shared/contracts'
import { COLORS } from '../../theme/designTokens'


// ── Label helpers ─────────────────────────────────────────────────────────────
const APPLIES_TO_LABELS: Record<string, string> = {
  contacts: 'Contacts', jobs: 'Jobs', quotes: 'Quotes',
  invoices: 'Invoices', purchase_orders: 'Purchase Orders',
  requests: 'Requests', general: 'General',
}

const APPLIES_TO_COLORS: Record<string, 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'> = {
  contacts: 'primary', jobs: 'warning', quotes: 'info',
  invoices: 'success', purchase_orders: 'secondary', requests: 'error', general: 'secondary',
}

// ── Resizable splitter hook ───────────────────────────────────────────────────
function useResizableSplit(initialWidth = 300, minWidth = 180, maxWidth = 520) {
  const [width, setWidth] = useState(initialWidth)
  const dragging = useRef(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const startX = e.clientX
    const startW = width

    const onMove = (me: MouseEvent) => {
      if (!dragging.current) return
      const delta = me.clientX - startX
      setWidth(Math.min(maxWidth, Math.max(minWidth, startW + delta)))
    }
    const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width, minWidth, maxWidth])

  return { width, onMouseDown }
}

// ── Breadcrumb builder ────────────────────────────────────────────────────────
function buildBreadcrumb(categories: TemplateCategory[], catId: string | null, templateName?: string): string[] {
  if (!catId) return templateName ? ['Uncategorised', templateName] : ['Uncategorised']
  const path: string[] = []
  let current: TemplateCategory | undefined = categories.find(c => c.id === catId)
  while (current) {
    path.unshift(current.name)
    current = current.parentId ? categories.find(c => c.id === current!.parentId) : undefined
  }
  if (templateName) path.push(templateName)
  return path
}

// ─────────────────────────────────────────────────────────────────────────────
export default function TemplatesView() {
  const { width: treeWidth, onMouseDown: onSplitterMouseDown } = useResizableSplit(300)

  // ── Data ───────────────────────────────────────────────────────────────────
  const [categories,    setCategories]    = useState<TemplateCategory[]>([])
  const [templates,     setTemplates]     = useState<Template[]>([])
  const [loadingCats,   setLoadingCats]   = useState(true)
  const [loadingTpls,   setLoadingTpls]   = useState(true)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get<{ data: TemplateCategory[] }>('/api/template-categories')
      setCategories((res as any).data ?? [])
    } finally { setLoadingCats(false) }
  }, [])

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get<{ data: Template[] }>('/api/templates')
      setTemplates((res as any).data ?? [])
    } finally { setLoadingTpls(false) }
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchCategories(), fetchTemplates()])
  }, [fetchCategories, fetchTemplates])

  useEffect(() => { fetchCategories(); fetchTemplates() }, [fetchCategories, fetchTemplates])

  // ── Selection ──────────────────────────────────────────────────────────────
  const [selectedTemplate,   setSelectedTemplate]   = useState<Template | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(UNCATEGORIZED_ID)
  const [favoritesOnly,      setFavoritesOnly]      = useState(false)

  // ── Favorite toggle ─────────────────────────────────────────────────────────
  const handleToggleFavorite = useCallback(async (id: string, value: boolean) => {
    // Optimistic update
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, isFavorite: value } as Template : t))
    if (selectedTemplate?.id === id) setSelectedTemplate(prev => prev ? { ...prev, isFavorite: value } as Template : prev)
    try { await api.patch(`/api/templates/${id}`, { isFavorite: value }) }
    catch { await fetchTemplates() } // revert on error
  }, [selectedTemplate, fetchTemplates])

  // Favorites filter — applied before passing to the tree
  const displayTemplates = useMemo(
    () => favoritesOnly ? templates.filter(t => (t as any).isFavorite) : templates,
    [templates, favoritesOnly]
  )

  // ── Dialog ─────────────────────────────────────────────────────────────────
  const [dialogOpen,   setDialogOpen]   = useState(false)
  const [dialogTarget, setDialogTarget] = useState<Template | null>(null)

  const openEditor = (t: Template | null) => { setDialogTarget(t); setDialogOpen(true) }


  const handleSelectTemplate = (t: Template) => {
    setSelectedTemplate(t)
    setSelectedCategoryId(t.categoryId ?? UNCATEGORIZED_ID)
  }

  // ── Breadcrumb ─────────────────────────────────────────────────────────────
  const breadcrumb = useMemo(() => {
    if (!selectedTemplate) return ['Select a template']
    return buildBreadcrumb(categories, selectedTemplate.categoryId, selectedTemplate.name)
  }, [categories, selectedTemplate])

  // ── Delete selected template ───────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!selectedTemplate) return
    if (!confirm(`Delete "${selectedTemplate.name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/api/templates/${selectedTemplate.id}`)
      toast.success('Template deleted')
      setSelectedTemplate(null)
      await fetchTemplates()
    } catch { toast.error('Failed to delete template') }
  }, [selectedTemplate, fetchTemplates])

  const loading = loadingCats || loadingTpls

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Paper variant='outlined' sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', overflow: 'hidden', borderRadius: 2 }}>

        {/* ── Top toolbar ──────────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0, bgcolor: 'background.paper' }}>
          {/* Breadcrumb */}
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
            <i className='tabler-home-2 text-sm text-textDisabled' />
            {breadcrumb.map((crumb, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {i > 0 && <i className='tabler-chevron-right text-xs text-textDisabled' />}
                <Typography
                  variant='body2' noWrap
                  sx={{ color: i === breadcrumb.length - 1 ? 'text.primary' : 'text.secondary', fontWeight: i === breadcrumb.length - 1 ? 600 : 400 }}
                >
                  {crumb}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            {selectedTemplate && (
              <>
                <Chip
                  label={APPLIES_TO_LABELS[selectedTemplate.appliesTo] ?? selectedTemplate.appliesTo}
                  size='small' color={APPLIES_TO_COLORS[selectedTemplate.appliesTo] ?? 'default'} variant='tonal'
                />
                <Chip
                  label={selectedTemplate.isEnabled ? 'Active' : 'Inactive'}
                  size='small' color={selectedTemplate.isEnabled ? 'success' : 'default'} variant='tonal'
                />
                <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />
                <Tooltip title='Edit template'>
                  <Button size='small' variant='contained' startIcon={<i className='tabler-pencil text-sm' />} onClick={() => openEditor(selectedTemplate)}>
                    Edit
                  </Button>
                </Tooltip>
                <Tooltip title='Delete template'>
                  <IconButton size='small' color='error' onClick={handleDelete} sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 1 }}>
                    <i className='tabler-trash text-sm' />
                  </IconButton>
                </Tooltip>
                <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />
              </>
            )}
            {/* Favorites filter toggle */}
            <Tooltip title={favoritesOnly ? 'Show all templates' : 'Show favourites only'}>
              <IconButton size='small' onClick={() => setFavoritesOnly(f => !f)}
                sx={{
                  border: '1px solid', borderRadius: 1, mr: 0.5,
                  borderColor: favoritesOnly ? 'warning.main' : 'divider',
                  bgcolor: favoritesOnly ? 'warning.lightOpacity' : 'transparent',
                  color: favoritesOnly ? 'warning.main' : 'text.secondary',
                }}
              >
                <i className={`text-sm ${favoritesOnly ? 'tabler-star-filled' : 'tabler-star'}`} />
              </IconButton>
            </Tooltip>
            <Button size='small' variant='tonal' startIcon={<i className='tabler-plus' />} onClick={() => openEditor(null)}>
              New Template
            </Button>
          </Box>
        </Box>

        {/* ── Main two-panel area ───────────────────────────────────────────── */}
        {loading ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* ── LEFT: WYSIWYG Preview ──────────────────────────────────── */}
            <Box sx={{ flex: 1, overflow: 'auto', bgcolor: COLORS.gray50, position: 'relative' }}>
              {selectedTemplate ? (
                <Box sx={{ maxWidth: 760, mx: 'auto', my: 3, bgcolor: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', borderRadius: 1, p: 5 }}>
                  {/* Template ref badge */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Typography variant='caption' sx={{ fontFamily: 'monospace', color: 'primary.main', bgcolor: 'primary.lightOpacity', px: 1, py: 0.25, borderRadius: 1 }}>
                      {selectedTemplate.templateRef}
                    </Typography>
                  </Box>

                  {/* Rendered HTML content */}
                  {selectedTemplate.body ? (
                    <Box
                      sx={{
                        '& p': { mb: 1.5, lineHeight: 1.7 },
                        '& table': { borderCollapse: 'collapse', width: '100%' },
                        '& td, & th': { border: `1px solid ${COLORS.separator}`, p: 1 },
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontSize: '14px',
                        lineHeight: 1.6,
                        color: COLORS.textDark,
                      }}
                      dangerouslySetInnerHTML={{ __html: selectedTemplate.body }}
                    />
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
                      <i className='tabler-file-off text-5xl block mb-2' />
                      <Typography variant='body2'>This template has no body content yet.</Typography>
                      <Button variant='tonal' size='small' sx={{ mt: 2 }} onClick={() => openEditor(selectedTemplate)}>
                        Add Content
                      </Button>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.disabled', gap: 2 }}>
                  <i className='tabler-file-text text-6xl' />
                  <Typography variant='body1'>Select a template from the tree to preview it</Typography>
                  <Typography variant='caption'>Double-click a template to open the editor</Typography>
                </Box>
              )}
            </Box>

            {/* ── Splitter ───────────────────────────────────────────────── */}
            <Box
              onMouseDown={onSplitterMouseDown}
              sx={{
                width: 5, flexShrink: 0, cursor: 'col-resize', bgcolor: 'divider',
                transition: 'background-color 0.15s',
                '&:hover': { bgcolor: 'primary.main' },
                '&:active': { bgcolor: 'primary.dark' },
              }}
            />

            {/* ── RIGHT: Category Tree ────────────────────────────────────── */}
            <Box sx={{ width: treeWidth, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderLeft: '1px solid', borderColor: 'divider' }}>
              <TemplateCategoryTree
                categories={categories}
                templates={displayTemplates}
                selectedTemplateId={selectedTemplate?.id ?? null}
                selectedCategoryId={selectedCategoryId}
                onSelectTemplate={handleSelectTemplate}
                onEditTemplate={t => openEditor(t)}
                onToggleFavorite={handleToggleFavorite}
                onSelectUncategorized={() => setSelectedCategoryId(UNCATEGORIZED_ID)}
                onCatsChange={setCategories}
                onRefresh={refreshAll}
              />
            </Box>
          </Box>
        )}
      </Paper>

      {/* ── Edit Dialog ─────────────────────────────────────────────────────── */}
      <TemplateEditDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        template={dialogTarget}
        categories={categories}
        onSave={async () => { await refreshAll(); setDialogOpen(false) }}
      />
    </>
  )
}
