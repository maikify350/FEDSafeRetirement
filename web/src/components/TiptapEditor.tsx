'use client'

/**
 * TiptapEditor — WYSIWYG template editor with Grok AI assistant.
 *
 * Features:
 *  - Full formatting toolbar
 *  - Custom FieldTag inline node: [[token]] renders as styled chips
 *  - AI Assistant panel (Grok via /api/ai/assist) — Write, Improve, Shorten,
 *    Expand, Formal, Friendly, Custom prompt
 *  - Outputs HTML compatible with existing preview renderer
 */

import {
  useEditor,
  EditorContent,
  Node,
  mergeAttributes,
} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'

// ── ResizableImage — extends Image with width attr + drag-to-resize NodeView ──
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 200,
        parseHTML: el => parseInt((el as HTMLElement).getAttribute('width') || (el as HTMLElement).style.width || '200'),
        renderHTML: attrs => ({ width: attrs.width, style: `width:${attrs.width}px;max-width:100%;display:block;` }),
      },
    }
  },

  addNodeView() {
    return ({ node, updateAttributes: updateAttr }: any) => {
      const wrapper = document.createElement('div')
      wrapper.style.cssText = 'display:inline-block;position:relative;max-width:100%;margin:4px 0;'

      const img = document.createElement('img')
      img.src = node.attrs.src
      img.alt = node.attrs.alt || ''
      img.style.cssText = `width:${node.attrs.width || 200}px;max-width:100%;display:block;border-radius:4px;`

      // Resize handle — bottom-right corner
      const handle = document.createElement('div')
      handle.title = 'Drag to resize'
      handle.style.cssText = [
        'position:absolute;bottom:2px;right:2px;',
        'width:14px;height:14px;',
        `background:${COLORS.brandPrimary};border-radius:3px;`,
        'cursor:se-resize;z-index:10;',
        'display:flex;align-items:center;justify-content:center;',
        'opacity:0;transition:opacity 0.15s;',
      ].join('')
      handle.innerHTML = '<svg width="8" height="8" viewBox="0 0 8 8" fill="white"><path d="M1 7L7 1M4 7L7 4M7 7V7"/></svg>'

      wrapper.addEventListener('mouseenter', () => { handle.style.opacity = '1' })
      wrapper.addEventListener('mouseleave', () => { handle.style.opacity = '0' })

      let startX = 0, startWidth = 0
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        startX = e.clientX
        startWidth = img.offsetWidth

        const onMove = (me: MouseEvent) => {
          const newW = Math.max(40, startWidth + me.clientX - startX)
          img.style.width = `${newW}px`
        }
        const onUp = (me: MouseEvent) => {
          const newW = Math.max(40, startWidth + me.clientX - startX)
          updateAttr({ width: newW })
          window.removeEventListener('mousemove', onMove)
          window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
      })

      wrapper.appendChild(img)
      wrapper.appendChild(handle)

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'image') return false
          img.src = updatedNode.attrs.src
          img.alt = updatedNode.attrs.alt || ''
          img.style.width = `${updatedNode.attrs.width || 200}px`
          return true
        },
      }
    }
  },
})
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import {
  Table,
  TableRow,
  TableHeader,
  TableCell,
} from '@tiptap/extension-table'
import Placeholder from '@tiptap/extension-placeholder'

import { forwardRef, useImperativeHandle, useCallback, useState, useRef } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import { COLORS } from '../theme/designTokens'


// ── FieldTag custom inline node ───────────────────────────────────────────────
const FieldTagNode = Node.create({
  name: 'fieldTag',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return { token: { default: '' } }
  },

  parseHTML() {
    return [{ tag: 'span[data-field-tag]', getAttrs: el => ({ token: (el as HTMLElement).getAttribute('data-field-tag') }) }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-field-tag': HTMLAttributes.token,
      style: `display:inline-block;background:rgba(115,103,240,0.15);color:${COLORS.brandPrimary};border-radius:4px;padding:0 5px;font-family:monospace;font-size:0.82em;font-weight:600;white-space:nowrap;cursor:default;user-select:none;`,
    }), HTMLAttributes.token]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span')
      dom.setAttribute('data-field-tag', node.attrs.token)
      dom.innerText = node.attrs.token
      dom.style.cssText = `display:inline-block;background:rgba(115,103,240,0.15);color:${COLORS.brandPrimary};border-radius:4px;padding:0 5px;font-family:monospace;font-size:0.82em;font-weight:600;white-space:nowrap;cursor:default;user-select:none;`
      dom.contentEditable = 'false'
      return { dom }
    }
  },
})

// ── Editor ref API ────────────────────────────────────────────────────────────
export type TiptapEditorRef = {
  insertFieldTag: (token: string) => void
  insertImage:    (url: string, alt: string) => void
  getHTML:        () => string
}

// ── Toolbar button ────────────────────────────────────────────────────────────
function TBtn({ label, icon, active, disabled, onClick }: {
  label: string; icon: string; active?: boolean; disabled?: boolean; onClick: () => void
}) {
  return (
    <Tooltip title={label} placement='top'>
      <span>
        <IconButton size='small' disabled={disabled} onClick={onClick} sx={{
          p: '4px', borderRadius: 0.5,
          color: active ? 'primary.main' : 'text.secondary',
          bgcolor: active ? 'primary.lightOpacity' : 'transparent',
          '&:hover': { bgcolor: active ? 'primary.lightOpacity' : 'action.hover' },
        }}>
          <i className={`${icon} text-sm`} />
        </IconButton>
      </span>
    </Tooltip>
  )
}

// ── AI quick actions ──────────────────────────────────────────────────────────
const AI_ACTIONS = [
  { action: 'write',    label: '✍️ Write for me', needsPrompt: true,  needsContext: false },
  { action: 'improve',  label: '✨ Improve',       needsPrompt: false, needsContext: true  },
  { action: 'shorten',  label: '✂️ Shorten',       needsPrompt: false, needsContext: true  },
  { action: 'expand',   label: '📝 Expand',        needsPrompt: false, needsContext: true  },
  { action: 'formal',   label: '🎩 More Formal',   needsPrompt: false, needsContext: true  },
  { action: 'friendly', label: '😊 Friendlier',    needsPrompt: false, needsContext: true  },
  { action: 'custom',   label: '💬 Custom...',     needsPrompt: true,  needsContext: true  },
] as const

type AiAction = typeof AI_ACTIONS[number]['action']

// ── Main component ────────────────────────────────────────────────────────────
interface TiptapEditorProps {
  value:      string
  onChange:   (html: string) => void
  appliesTo?: string
  placeholder?: string
}

const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
  ({ value, onChange, appliesTo = 'general', placeholder = 'Start typing your template…' }, ref) => {

    const [aiOpen,      setAiOpen]      = useState(false)
    const [aiLoading,   setAiLoading]   = useState(false)
    const [aiPrompt,    setAiPrompt]    = useState('')
    const [aiPreview,   setAiPreview]   = useState<string | null>(null)
    const [aiAction,    setAiAction]    = useState<AiAction | null>(null)
    const [aiError,     setAiError]     = useState<string | null>(null)
    const promptInputRef = useRef<HTMLInputElement>(null)
    // Save cursor position when editor loses focus (user clicks token dropdown etc.)
    const savedSelectionRef = useRef<{ from: number; to: number } | null>(null)

    const editor = useEditor({
      extensions: [
        StarterKit.configure({ codeBlock: { languageClassPrefix: 'language-' } }),
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Link.configure({ openOnClick: false }),
        ResizableImage.configure({ inline: false, allowBase64: false }),
        TextStyle,
        Color,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Placeholder.configure({ placeholder }),
        FieldTagNode,
      ],
      content: value,
      onUpdate: ({ editor: e }) => onChange(e.getHTML()),
      onBlur: ({ editor: e }) => {
        // Save cursor position so insertFieldTag can restore it after focus returns
        const { from, to } = e.state.selection
        savedSelectionRef.current = { from, to }
      },
      editorProps: {
        attributes: {
          style: `outline:none; min-height: 400px; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.7; color: ${COLORS.textDark};`,
        },
      },
    }, [])

    // Sync external value (when dialog opens with existing content)
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }

    useImperativeHandle(ref, () => ({
      insertFieldTag: (token: string) => {
        if (!editor) return
        const chain = editor.chain().focus()
        // Restore saved cursor position (lost when user clicked the dropdown button)
        if (savedSelectionRef.current) {
          chain.setTextSelection(savedSelectionRef.current)
          savedSelectionRef.current = null
        }
        chain.insertContent({ type: 'fieldTag', attrs: { token } }).run()
      },
      insertImage: (url: string, alt: string) => {
        if (!editor) return
        const chain = editor.chain().focus()
        if (savedSelectionRef.current) {
          chain.setTextSelection(savedSelectionRef.current)
          savedSelectionRef.current = null
        }
        chain.setImage({ src: url, alt, width: 200 } as any).run()
      },
      getHTML: () => editor?.getHTML() ?? '',
    }), [editor])

    const setLink = useCallback(() => {
      const url = window.prompt('Enter URL', editor?.getAttributes('link').href ?? '')
      if (url === null) return
      if (url === '') { editor?.chain().focus().unsetLink().run(); return }
      editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }, [editor])

    // ── AI call ────────────────────────────────────────────────────────────────
    const callAI = useCallback(async (action: AiAction, prompt?: string) => {
      setAiLoading(true)
      setAiError(null)
      setAiPreview(null)
      setAiAction(action)

      const context = editor?.getHTML() ?? ''

      try {
        const res = await fetch('/api/ai/assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, context, prompt, appliesTo }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'AI request failed')
        setAiPreview(data.result)
      } catch (err: any) {
        setAiError(err.message ?? 'Something went wrong')
      } finally {
        setAiLoading(false)
      }
    }, [editor, appliesTo])

    const handleAiAccept = useCallback(() => {
      if (!aiPreview || !editor) return
      // Replace entire document content with the AI result
      editor.commands.setContent(aiPreview, { emitUpdate: true })
      setAiPreview(null)
      setAiPrompt('')
      setAiAction(null)
    }, [aiPreview, editor])

    const handleAiInsertAtCursor = useCallback(() => {
      if (!aiPreview || !editor) return
      editor.chain().focus().insertContent(aiPreview).run()
      setAiPreview(null)
      setAiPrompt('')
      setAiAction(null)
    }, [aiPreview, editor])

    if (!editor) return null

    const needsPromptForAction = (a: AiAction) =>
      AI_ACTIONS.find(x => x.action === a)?.needsPrompt ?? false

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>

        {/* ── Formatting Toolbar ── */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.25, px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
          <TBtn label='Undo' icon='tabler-arrow-back-up' onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} />
          <TBtn label='Redo' icon='tabler-arrow-forward-up' onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} />
          <Divider orientation='vertical' flexItem sx={{ mx: 0.25 }} />

          <TBtn label='Paragraph' icon='tabler-pilcrow' active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()} />
          <TBtn label='Heading 1' icon='tabler-h-1' active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
          <TBtn label='Heading 2' icon='tabler-h-2' active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          <TBtn label='Heading 3' icon='tabler-h-3' active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
          <Divider orientation='vertical' flexItem sx={{ mx: 0.25 }} />

          <TBtn label='Bold'      icon='tabler-bold'          active={editor.isActive('bold')}      onClick={() => editor.chain().focus().toggleBold().run()} />
          <TBtn label='Italic'    icon='tabler-italic'        active={editor.isActive('italic')}    onClick={() => editor.chain().focus().toggleItalic().run()} />
          <TBtn label='Underline' icon='tabler-underline'     active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
          <TBtn label='Strike'    icon='tabler-strikethrough' active={editor.isActive('strike')}    onClick={() => editor.chain().focus().toggleStrike().run()} />
          <TBtn label='Code'      icon='tabler-code'          active={editor.isActive('code')}      onClick={() => editor.chain().focus().toggleCode().run()} />
          <Divider orientation='vertical' flexItem sx={{ mx: 0.25 }} />

          <TBtn label='Align Left'    icon='tabler-align-left'      active={editor.isActive({ textAlign: 'left' })}    onClick={() => editor.chain().focus().setTextAlign('left').run()} />
          <TBtn label='Align Center'  icon='tabler-align-center'    active={editor.isActive({ textAlign: 'center' })}  onClick={() => editor.chain().focus().setTextAlign('center').run()} />
          <TBtn label='Align Right'   icon='tabler-align-right'     active={editor.isActive({ textAlign: 'right' })}   onClick={() => editor.chain().focus().setTextAlign('right').run()} />
          <TBtn label='Align Justify' icon='tabler-align-justified' active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} />
          <Divider orientation='vertical' flexItem sx={{ mx: 0.25 }} />

          <TBtn label='Bullet List'  icon='tabler-list'         active={editor.isActive('bulletList')}  onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <TBtn label='Ordered List' icon='tabler-list-numbers' active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          <TBtn label='Block Quote'  icon='tabler-blockquote'   active={editor.isActive('blockquote')}  onClick={() => editor.chain().focus().toggleBlockquote().run()} />
          <Divider orientation='vertical' flexItem sx={{ mx: 0.25 }} />

          <TBtn label='Link'        icon='tabler-link'   active={editor.isActive('link')} onClick={setLink} />
          <TBtn label='Remove Link' icon='tabler-unlink' onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')} />
          <Divider orientation='vertical' flexItem sx={{ mx: 0.25 }} />

          <TBtn label='Insert Table'     icon='tabler-table'               onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
          <TBtn label='Add Column After' icon='tabler-column-insert-right' onClick={() => editor.chain().focus().addColumnAfter().run()} disabled={!editor.can().addColumnAfter()} />
          <TBtn label='Delete Column'    icon='tabler-column-remove'       onClick={() => editor.chain().focus().deleteColumn().run()}    disabled={!editor.can().deleteColumn()} />
          <TBtn label='Add Row After'    icon='tabler-row-insert-bottom'   onClick={() => editor.chain().focus().addRowAfter().run()}     disabled={!editor.can().addRowAfter()} />
          <TBtn label='Delete Row'       icon='tabler-row-remove'          onClick={() => editor.chain().focus().deleteRow().run()}       disabled={!editor.can().deleteRow()} />
          <TBtn label='Delete Table'     icon='tabler-table-off'           onClick={() => editor.chain().focus().deleteTable().run()}     disabled={!editor.can().deleteTable()} />
          <Divider orientation='vertical' flexItem sx={{ mx: 0.25 }} />

          <TBtn label='Horizontal Rule'  icon='tabler-separator'          onClick={() => editor.chain().focus().setHorizontalRule().run()} />
          <TBtn label='Clear Formatting' icon='tabler-clear-formatting'   onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} />

          {/* AI toggle — right side */}
          <Box sx={{ flex: 1 }} />
          <Tooltip title={aiOpen ? 'Close AI Assistant' : 'Open AI Assistant (Grok)'}>
            <Button
              size='small'
              variant={aiOpen ? 'contained' : 'outlined'}
              color='secondary'
              startIcon={<i className='tabler-sparkles text-sm' />}
              onClick={() => { setAiOpen(o => !o); setAiPreview(null); setAiError(null) }}
              sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.25, px: 1 }}
            >
              AI
            </Button>
          </Tooltip>
        </Box>

        {/* ── Editor area ── */}
        <Box sx={{
          flex: 1, overflow: 'auto', bgcolor: COLORS.gray50,
          '& .ProseMirror': { outline: 'none', minHeight: '400px', p: 2 },
          '& .ProseMirror table': { borderCollapse: 'collapse', width: '100%' },
          '& .ProseMirror td, & .ProseMirror th': { border: `1px solid ${COLORS.separator}`, p: '6px 10px', verticalAlign: 'top' },
          '& .ProseMirror p.is-editor-empty:first-child::before': { content: 'attr(data-placeholder)', color: COLORS.placeholder, pointerEvents: 'none', float: 'left', height: 0 },
        }}>
          <EditorContent editor={editor} style={{ height: '100%' }} />
        </Box>

        {/* ── AI Assistant Panel ── */}
        {aiOpen && (
          <Box sx={{ borderTop: '2px solid', borderColor: 'secondary.main', bgcolor: 'background.paper', flexShrink: 0, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className='tabler-sparkles text-base text-secondary' />
              <Typography variant='caption' fontWeight={700} color='secondary.main' sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Grok AI Assistant
              </Typography>
              <Chip label='Grok' size='small' color='secondary' variant='tonal' sx={{ height: 18, fontSize: '0.6rem' }} />
            </Box>

            {/* Quick action buttons */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {AI_ACTIONS.map(a => (
                <Button
                  key={a.action}
                  size='small'
                  variant={aiAction === a.action ? 'contained' : 'outlined'}
                  color='secondary'
                  disabled={aiLoading}
                  onClick={() => {
                    setAiAction(a.action)
                    setAiPreview(null)
                    setAiError(null)
                    if (!a.needsPrompt) {
                      callAI(a.action)
                    } else {
                      setTimeout(() => promptInputRef.current?.focus(), 50)
                    }
                  }}
                  sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.25 }}
                >
                  {a.label}
                </Button>
              ))}
            </Box>

            {/* Prompt input — shown for 'write' and 'custom' */}
            {aiAction && needsPromptForAction(aiAction) && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  inputRef={promptInputRef}
                  size='small'
                  fullWidth
                  placeholder={aiAction === 'write' ? 'Describe the template you want to create…' : 'Additional instructions for the AI…'}
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); callAI(aiAction, aiPrompt) } }}
                  disabled={aiLoading}
                />
                <Button
                  variant='contained' color='secondary'
                  disabled={aiLoading || !aiPrompt.trim()}
                  onClick={() => callAI(aiAction, aiPrompt)}
                  startIcon={aiLoading ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-send text-sm' />}
                  sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                >
                  {aiLoading ? 'Thinking…' : 'Generate'}
                </Button>
              </Box>
            )}

            {/* Loading spinner (for no-prompt actions) */}
            {aiLoading && !needsPromptForAction(aiAction ?? 'improve') && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} color='secondary' />
                <Typography variant='caption' color='text.secondary'>Grok is thinking…</Typography>
              </Box>
            )}

            {/* Error */}
            {aiError && (
              <Typography variant='caption' color='error.main'>⚠️ {aiError}</Typography>
            )}

            {/* Preview result */}
            {aiPreview && (
              <Box sx={{ border: '1px solid', borderColor: 'secondary.light', borderRadius: 1, p: 1.5, bgcolor: 'secondary.lightOpacity', maxHeight: 200, overflow: 'auto' }}>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                  AI Result — review before accepting:
                </Typography>
                <Box sx={{ fontSize: '0.8rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
                  dangerouslySetInnerHTML={{ __html: aiPreview }} />
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button size='small' variant='contained' color='success'
                    startIcon={<i className='tabler-check text-sm' />}
                    onClick={handleAiAccept}
                    sx={{ textTransform: 'none', fontSize: '0.72rem' }}>
                    Replace Document
                  </Button>
                  <Button size='small' variant='outlined' color='secondary'
                    startIcon={<i className='tabler-cursor-text text-sm' />}
                    onClick={handleAiInsertAtCursor}
                    sx={{ textTransform: 'none', fontSize: '0.72rem' }}>
                    Insert at Cursor
                  </Button>
                  <Button size='small' variant='text' color='error'
                    onClick={() => { setAiPreview(null); setAiAction(null) }}
                    sx={{ textTransform: 'none', fontSize: '0.72rem' }}>
                    Discard
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
    )
  }
)

TiptapEditor.displayName = 'TiptapEditor'
export default TiptapEditor
