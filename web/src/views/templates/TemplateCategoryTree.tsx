'use client'

/**
 * TemplateCategoryTree
 *
 * Windows-Explorer-style folder tree.
 * - Folders collapse / expand on chevron click
 * - Template leaves appear as child nodes of folders
 * - Click a template leaf → fires onSelectTemplate (previews on left)
 * - Single-click folder → expands; does NOT change preview
 * - Double-click template → fires onEditTemplate (opens full editor)
 * - Right-click folder → context menu: Add Subfolder | Rename | Delete
 * - Double-click folder label → inline rename
 * - Drag folder to reorder siblings (DnD via @dnd-kit)
 */

import React, {
  createContext, useContext, useState, useMemo, useCallback, useRef, useEffect,
} from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import { toast } from 'react-toastify'
import {
  DndContext, closestCenter, DragEndEvent, DragOverlay,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '@/lib/api'
import type { Template } from '@shared/contracts'

// ── Types ─────────────────────────────────────────────────────────────────────
export type TemplateCategory = {
  id: string
  name: string
  parentId: string | null
  sortOrder: number
}

type CategoryNode = TemplateCategory & { children: CategoryNode[]; templates: Template[] }

export const UNCATEGORIZED_ID = '__UNCATEGORIZED__'

// ── Build tree ────────────────────────────────────────────────────────────────
function buildTree(cats: TemplateCategory[], templates: Template[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>()
  cats.forEach(c => map.set(c.id, { ...c, children: [], templates: [] }))
  // Attach templates to their category
  templates.forEach(t => {
    if (t.categoryId && map.has(t.categoryId)) map.get(t.categoryId)!.templates.push(t)
  })
  const roots: CategoryNode[] = []
  cats.forEach(c => {
    if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.children.push(map.get(c.id)!)
    else roots.push(map.get(c.id)!)
  })
  const sort = (ns: CategoryNode[]) => {
    ns.sort((a, b) => a.sortOrder - b.sortOrder)
    ns.forEach(n => { sort(n.children); n.templates.sort((a, b) => a.name.localeCompare(b.name)) })
  }
  sort(roots)
  return roots
}

// ── Context ───────────────────────────────────────────────────────────────────
type Ctx = {
  selectedTemplateId: string | null
  selectedCategoryId: string | null  // UNCATEGORIZED_ID or category uuid
  expandedIds: Set<string>
  renamingId:  string | null
  renameValue: string
  contextMenu: { id: string; anchor: HTMLElement } | null
  categories:  TemplateCategory[]
  onSelectTemplate:   (t: Template) => void
  onEditTemplate:     (t: Template) => void
  onToggleFavorite:   (id: string, value: boolean) => void
  toggleExpand:   (id: string) => void
  startRename:    (id: string, name: string) => void
  commitRename:   () => void
  cancelRename:   () => void
  setRenameValue: (v: string) => void
  openCtxMenu:    (id: string, el: HTMLElement) => void
  closeCtxMenu:   () => void
  doAddChild:     (parentId: string | null) => void
  doDelete:       (id: string) => void
  onCatsChange:   (c: TemplateCategory[]) => void
  onRefresh:      () => Promise<void>
  hasAnyTemplates:(node: CategoryNode) => boolean
}
const TreeCtx = createContext<Ctx>({} as Ctx)

// ── Main component ────────────────────────────────────────────────────────────
type Props = {
  categories:          TemplateCategory[]
  templates:           Template[]
  selectedTemplateId:  string | null
  selectedCategoryId:  string | null
  onSelectTemplate:    (t: Template) => void
  onEditTemplate:      (t: Template) => void
  onToggleFavorite:    (id: string, value: boolean) => void
  onSelectUncategorized: () => void
  onCatsChange:        (c: TemplateCategory[]) => void
  onRefresh:           () => Promise<void>
}

export default function TemplateCategoryTree({
  categories, templates, selectedTemplateId, selectedCategoryId,
  onSelectTemplate, onEditTemplate, onToggleFavorite, onSelectUncategorized,
  onCatsChange, onRefresh,
}: Props) {
  const [expandedIds,  setExpandedIds]  = useState<Set<string>>(new Set())
  const [renamingId,   setRenamingId]   = useState<string | null>(null)
  const [renameValue,  setRenameValue]  = useState('')
  const [contextMenu,  setContextMenu]  = useState<{ id: string; anchor: HTMLElement } | null>(null)
  const [activeId,     setActiveId]     = useState<string | null>(null)

  const tree = useMemo(() => buildTree(categories, templates), [categories, templates])
  const uncategorized = useMemo(() => templates.filter(t => !t.categoryId), [templates])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))

  const toggleExpand = (id: string) => setExpandedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  // ── Tree-wide expand/collapse controls ─────────────────────────────────────
  const getAllIds = useCallback((nodes: CategoryNode[]): string[] =>
    nodes.flatMap(n => [n.id, ...getAllIds(n.children)]), [])

  const expandAll = useCallback(() =>
    setExpandedIds(new Set(getAllIds(tree))), [getAllIds, tree])

  const collapseAll = useCallback(() =>
    setExpandedIds(new Set()), [])

  const expandLevel1 = useCallback(() =>
    setExpandedIds(new Set(tree.map(n => n.id))), [tree])

  const expandLevel2 = useCallback(() =>
    setExpandedIds(new Set(tree.flatMap(n => [n.id, ...n.children.map(c => c.id)]))), [tree])

  const startRename = useCallback((id: string, name: string) => {
    setContextMenu(null); setRenamingId(id); setRenameValue(name)
  }, [])

  const commitRename = useCallback(async () => {
    if (!renamingId || !renameValue.trim()) { setRenamingId(null); return }
    const name = renameValue.trim()
    onCatsChange(categories.map(c => c.id === renamingId ? { ...c, name } : c))
    setRenamingId(null)
    try { await api.patch(`/api/template-categories/${renamingId}`, { name }) }
    catch { toast.error('Failed to rename folder'); onRefresh() }
  }, [renamingId, renameValue, categories, onCatsChange, onRefresh])

  const cancelRename = () => setRenamingId(null)

  const doAddChild = useCallback(async (parentId: string | null) => {
    setContextMenu(null)
    try {
      const newCat = await api.post<TemplateCategory>('/api/template-categories', { name: 'New Folder', parentId })
      onCatsChange([...categories, newCat as TemplateCategory])
      if (parentId) setExpandedIds(p => new Set([...p, parentId]))
      setTimeout(() => startRename((newCat as any).id, 'New Folder'), 80)
    } catch { toast.error('Failed to create folder') }
  }, [categories, onCatsChange, startRename])

  const doDelete = useCallback(async (id: string) => {
    setContextMenu(null)
    if (categories.some(c => c.parentId === id)) {
      toast.error('Delete sub-folders first before deleting this folder.'); return
    }
    try {
      await api.delete(`/api/template-categories/${id}`)
      onCatsChange(categories.filter(c => c.id !== id))
      await onRefresh()
    } catch { toast.error('Failed to delete folder') }
  }, [categories, onCatsChange, onRefresh])

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const a = categories.find(c => c.id === active.id)
    const o = categories.find(c => c.id === over.id)
    if (!a || !o || a.parentId !== o.parentId) return
    const siblings = categories.filter(c => c.parentId === a.parentId).sort((x, y) => x.sortOrder - y.sortOrder)
    const reordered = arrayMove(siblings, siblings.findIndex(c => c.id === a.id), siblings.findIndex(c => c.id === o.id))
    const updates = reordered.map((c, i) => ({ id: c.id, sortOrder: i }))
    onCatsChange(categories.map(c => { const u = updates.find(x => x.id === c.id); return u ? { ...c, sortOrder: u.sortOrder } : c }))
    api.post('/api/template-categories/reorder', { items: updates }).catch(() => { toast.error('Reorder failed'); onRefresh() })
  }, [categories, onCatsChange, onRefresh])

  const activeCat = activeId ? categories.find(c => c.id === activeId) : null

  const hasAnyTemplates = useCallback((node: CategoryNode): boolean =>
    node.templates.length > 0 || node.children.some(c => hasAnyTemplates(c)), [])

  const ctx: Ctx = {
    selectedTemplateId, selectedCategoryId, expandedIds, renamingId, renameValue, contextMenu, categories,
    onSelectTemplate, onEditTemplate, onToggleFavorite, toggleExpand, startRename, commitRename, cancelRename,
    setRenameValue, openCtxMenu: (id, anchor) => setContextMenu({ id, anchor }), closeCtxMenu: () => setContextMenu(null),
    doAddChild, doDelete, onCatsChange, onRefresh, hasAnyTemplates,
  }

  return (
    <TreeCtx.Provider value={ctx}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none' }}>
        {/* Header */}
        <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
          <Typography variant='caption' fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.disabled', whiteSpace: 'nowrap' }}>
            Template Library
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <Tooltip title='Expand All'>
              <IconButton size='small' onClick={expandAll} sx={{ p: 0.4 }}>
                <i className='tabler-arrows-maximize text-sm' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Collapse All'>
              <IconButton size='small' onClick={collapseAll} sx={{ p: 0.4 }}>
                <i className='tabler-arrows-minimize text-sm' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Expand Root Only'>
              <IconButton size='small' onClick={expandLevel1} sx={{ p: 0.4 }}>
                <i className='tabler-layout-sidebar text-sm' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Expand 2 Levels'>
              <IconButton size='small' onClick={expandLevel2} sx={{ p: 0.4 }}>
                <i className='tabler-layout-sidebar-right-expand text-sm' />
              </IconButton>
            </Tooltip>
            <Box sx={{ width: '1px', height: 16, bgcolor: 'divider', mx: 0.25 }} />
            <Tooltip title='New Root Folder'>
              <IconButton size='small' onClick={() => doAddChild(null)} sx={{ p: 0.4 }}>
                <i className='tabler-folder-plus text-sm' />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Uncategorized */}
        <Box
          onClick={onSelectUncategorized}
          sx={{ px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', flexShrink: 0,
            bgcolor: selectedCategoryId === UNCATEGORIZED_ID ? 'primary.lightOpacity' : 'transparent',
            borderBottom: '1px solid', borderColor: 'divider',
            '&:hover': { bgcolor: selectedCategoryId !== UNCATEGORIZED_ID ? 'action.hover' : undefined },
          }}
        >
          <i className={`tabler-inbox text-base ${selectedCategoryId === UNCATEGORIZED_ID ? 'text-primary' : 'text-textDisabled'}`} />
          <Typography variant='body2' sx={{ flex: 1, color: selectedCategoryId === UNCATEGORIZED_ID ? 'primary.main' : 'text.secondary' }}>
            Uncategorised
          </Typography>
          {uncategorized.length > 0 && <Chip label={uncategorized.length} size='small' sx={{ height: 18, fontSize: '0.65rem' }} />}
        </Box>

        {/* Tree */}
        <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5 }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter}
            onDragStart={e => setActiveId(e.active.id as string)}
            onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}
          >
            <SortableContext items={tree.map(n => n.id)} strategy={verticalListSortingStrategy}>
              {tree.map(node => <CategoryNode key={node.id} node={node} depth={0} />)}
            </SortableContext>
            <DragOverlay>
              {activeCat && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.5, bgcolor: 'background.paper', boxShadow: 4, borderRadius: 1, opacity: 0.9 }}>
                  <i className='tabler-folder text-warning text-base' />
                  <Typography variant='body2'>{activeCat.name}</Typography>
                </Box>
              )}
            </DragOverlay>
          </DndContext>
        </Box>
      </Box>

      {/* Context menu */}
      <Menu open={!!contextMenu} anchorEl={contextMenu?.anchor} onClose={() => setContextMenu(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <MenuItem dense onClick={() => contextMenu && doAddChild(contextMenu.id)}>
          <i className='tabler-folder-plus mr-2 text-sm' /> Add Subfolder
        </MenuItem>
        <MenuItem dense onClick={() => {
          const c = categories.find(x => x.id === contextMenu?.id)
          if (c) startRename(c.id, c.name)
        }}>
          <i className='tabler-pencil mr-2 text-sm' /> Rename
        </MenuItem>
        <Divider />
        <MenuItem dense sx={{ color: 'error.main' }} onClick={() => contextMenu && doDelete(contextMenu.id)}>
          <i className='tabler-trash mr-2 text-sm' /> Delete Folder
        </MenuItem>
      </Menu>
    </TreeCtx.Provider>
  )
}

// ── CategoryNode (recursive) ──────────────────────────────────────────────────
function CategoryNode({ node, depth }: { node: CategoryNode; depth: number }) {
  const ctx = useContext(TreeCtx)
  const renameRef = useRef<HTMLInputElement>(null)
  const isExpanded = ctx.expandedIds.has(node.id)
  const isRenaming = ctx.renamingId === node.id
  const hasChildren = node.children.length > 0 || node.templates.length > 0
  const [hovered, setHovered] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id, data: { type: 'category', parentId: node.parentId },
  })

  useEffect(() => { if (isRenaming) setTimeout(() => renameRef.current?.focus(), 50) }, [isRenaming])

  const indent = depth * 16 + 8

  return (
    <Box ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.25 : 1 }}>
      {/* Folder row */}
      <Box
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onDoubleClick={() => ctx.startRename(node.id, node.name)}
        onContextMenu={e => { e.preventDefault(); ctx.openCtxMenu(node.id, e.currentTarget as HTMLElement) }}
        sx={{ display: 'flex', alignItems: 'center', pl: `${indent}px`, pr: 0.5, py: 0.3, gap: 0.5, cursor: 'default',
          '&:hover': { bgcolor: 'action.hover' }, borderRadius: 0.5, mx: 0.5,
        }}
      >
        {/* Drag handle */}
        <Box {...attributes} {...listeners} sx={{ cursor: 'grab', color: 'text.disabled', display: hovered ? 'flex' : 'none', mr: -0.5 }}>
          <i className='tabler-grip-vertical text-xs' />
        </Box>

        {/* Chevron */}
        <IconButton size='small' sx={{ p: 0.25, flexShrink: 0 }} onClick={() => ctx.toggleExpand(node.id)}>
          {hasChildren
            ? <i className={`text-xs text-textSecondary ${isExpanded ? 'tabler-chevron-down' : 'tabler-chevron-right'}`} />
            : <Box sx={{ width: 14 }} />
          }
        </IconButton>

        {/* Folder icon */}
        <i className={`text-base ${isExpanded ? 'tabler-folder-open text-warning' : 'tabler-folder text-warning'}`} />

        {/* Name or rename input */}
        {isRenaming ? (
          <TextField
            inputRef={renameRef} size='small' value={ctx.renameValue}
            onChange={e => ctx.setRenameValue(e.target.value)}
            onBlur={ctx.commitRename}
            onKeyDown={e => { if (e.key === 'Enter') ctx.commitRename(); if (e.key === 'Escape') ctx.cancelRename() }}
            sx={{ flex: 1 }} inputProps={{ style: { padding: '1px 6px', fontSize: '0.8rem' } }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <Typography variant='body2' noWrap sx={{ flex: 1, fontSize: '0.8rem', fontWeight: ctx.hasAnyTemplates(node) ? 700 : 400 }}>{node.name}</Typography>
        )}

        {/* Count badge */}
        {!isRenaming && node.templates.length > 0 && (
          <Typography variant='caption' sx={{ color: 'text.disabled', fontSize: '0.65rem', ml: 0.5 }}>
            {node.templates.length}
          </Typography>
        )}

        {/* Context menu button */}
        {hovered && !isRenaming && (
          <IconButton size='small' sx={{ p: 0.25, ml: 0.5 }}
            onClick={e => { e.stopPropagation(); ctx.openCtxMenu(node.id, e.currentTarget) }}>
            <i className='tabler-dots-vertical text-xs' />
          </IconButton>
        )}
      </Box>

      {/* Children (folders + templates) when expanded */}
      {isExpanded && (
        <>
          {node.children.length > 0 && (
            <SortableContext items={node.children.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {node.children.map(child => <CategoryNode key={child.id} node={child} depth={depth + 1} />)}
            </SortableContext>
          )}
          {node.templates.map(t => <TemplateLeaf key={t.id} template={t} depth={depth + 1} />)}
        </>
      )}
    </Box>
  )
}

// ── Template leaf node ────────────────────────────────────────────────────────
function TemplateLeaf({ template: t, depth }: { template: Template; depth: number }) {
  const ctx = useContext(TreeCtx)
  const isSelected  = ctx.selectedTemplateId === t.id
  const isFav       = (t as any).isFavorite === true
  const [hovered, setHovered] = useState(false)
  const indent = depth * 16 + 8 + 28 // align with folder label

  return (
    <Box
      onClick={() => ctx.onSelectTemplate(t)}
      onDoubleClick={() => ctx.onEditTemplate(t)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.75,
        pl: `${indent}px`, pr: 0.5, py: 0.3, mx: 0.5, borderRadius: 0.5, cursor: 'default',
        bgcolor: isSelected ? 'primary.main' : 'transparent',
        color: isSelected ? 'primary.contrastText' : 'text.primary',
        '&:hover': { bgcolor: isSelected ? 'primary.dark' : 'action.hover' },
      }}
    >
      <i className={`text-sm ${isSelected ? 'tabler-file-filled' : 'tabler-file-text'}`} style={{ flexShrink: 0 }} />
      <Typography variant='body2' noWrap sx={{ flex: 1, fontSize: '0.8rem' }}>{t.name}</Typography>
      {!t.isEnabled && <i className='tabler-eye-off text-xs opacity-50' style={{ flexShrink: 0 }} />}
      {/* Star / favourite toggle — always visible when starred, hover-only otherwise */}
      {(isFav || hovered) && (
        <Tooltip title={isFav ? 'Remove from favourites' : 'Mark as favourite'}>
          <IconButton
            size='small' sx={{ p: 0.2, flexShrink: 0, opacity: isFav ? 1 : 0.5 }}
            onClick={e => { e.stopPropagation(); ctx.onToggleFavorite(t.id, !isFav) }}
          >
            <i className={`text-xs ${isFav ? 'tabler-star-filled text-warning' : 'tabler-star'}`} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}
