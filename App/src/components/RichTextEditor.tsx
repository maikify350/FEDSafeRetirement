'use client'

/**
 * RichTextEditor — Tiptap-based WYSIWYG component.
 * Toolbar: Bold | Italic | Underline | Link | Bullet List | Ordered List | Clear
 * Styled to match MUI theme tokens (dark/light mode aware via CSS variables).
 */

import { useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

interface Props {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  placeholder?: string
  label?: string
  minHeight?: number
  /** Trimmed toolbar: only basic text styling (Bold / Italic / Underline). */
  minimal?: boolean
}

// ── Toolbar button ──────────────────────────────────────────────────────────
const ToolBtn = ({
  title, icon, active, disabled, onClick,
}: {
  title: string; icon: string; active?: boolean; disabled?: boolean; onClick: () => void
}) => (
  <Tooltip title={title} placement='top'>
    <span>
      <IconButton
        size='small'
        disabled={disabled}
        onClick={onClick}
        sx={{
          borderRadius: 1,
          width: 28, height: 28,
          color: active ? 'primary.main' : 'text.secondary',
          bgcolor: active ? 'primary.main' + '20' : 'transparent',
          '&:hover': { bgcolor: 'action.hover' },
          '&.Mui-disabled': { opacity: 0.35 },
        }}
      >
        <i className={`${icon} text-base`} />
      </IconButton>
    </span>
  </Tooltip>
)

// ── Main component ──────────────────────────────────────────────────────────
export default function RichTextEditor({
  value, onChange, disabled = false, placeholder = 'Enter bio…', label, minHeight = 160, minimal = false,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, code: false, blockquote: false, horizontalRule: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sync external value changes (e.g. when dialog opens for a different user)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (current !== value) {
      editor.commands.setContent(value || '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Sync disabled state
  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url  = window.prompt('URL', prev ?? 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  const tb = editor // shorthand

  return (
    <Box>
      {label && (
        <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
          {label}
        </Typography>
      )}

      {/* Editor shell */}
      <Box
        sx={{
          border: '1px solid',
          borderColor: disabled ? 'divider' : 'rgba(var(--mui-palette-primary-mainChannel) / 0.3)',
          borderRadius: 2,
          overflow: 'hidden',
          opacity: disabled ? 0.6 : 1,
          transition: 'border-color .2s',
          '&:focus-within': {
            borderColor: 'primary.main',
            boxShadow: '0 0 0 2px rgba(var(--mui-palette-primary-mainChannel) / 0.15)',
          },
        }}
      >
        {/* Toolbar */}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.25, px: 1, py: 0.5,
            borderBottom: '1px solid', borderColor: 'divider',
            bgcolor: 'background.paper',
            flexWrap: 'wrap',
          }}
        >
          <ToolBtn title='Bold'         icon='tabler-bold'          active={tb.isActive('bold')}          disabled={disabled} onClick={() => tb.chain().focus().toggleBold().run()} />
          <ToolBtn title='Italic'       icon='tabler-italic'        active={tb.isActive('italic')}        disabled={disabled} onClick={() => tb.chain().focus().toggleItalic().run()} />
          <ToolBtn title='Underline'    icon='tabler-underline'     active={tb.isActive('underline')}     disabled={disabled} onClick={() => tb.chain().focus().toggleUnderline().run()} />
          {!minimal && (
            <>
              <Divider orientation='vertical' flexItem sx={{ mx: 0.5, my: 0.5 }} />
              <ToolBtn title='Link'         icon='tabler-link'          active={tb.isActive('link')}          disabled={disabled} onClick={setLink} />
              <ToolBtn title='Remove Link'  icon='tabler-link-off'      active={false}                        disabled={disabled || !tb.isActive('link')} onClick={() => tb.chain().focus().unsetLink().run()} />
              <Divider orientation='vertical' flexItem sx={{ mx: 0.5, my: 0.5 }} />
              <ToolBtn title='Bullet List'   icon='tabler-list'         active={tb.isActive('bulletList')}   disabled={disabled} onClick={() => tb.chain().focus().toggleBulletList().run()} />
              <ToolBtn title='Ordered List'  icon='tabler-list-numbers' active={tb.isActive('orderedList')}  disabled={disabled} onClick={() => tb.chain().focus().toggleOrderedList().run()} />
            </>
          )}
          <Divider orientation='vertical' flexItem sx={{ mx: 0.5, my: 0.5 }} />
          <ToolBtn title='Clear formatting' icon='tabler-clear-formatting' active={false} disabled={disabled} onClick={() => tb.chain().focus().unsetAllMarks().clearNodes().run()} />
        </Box>

        {/* Content area */}
        <Box
          sx={{
            minHeight,
            px: 1.5, py: 1,
            bgcolor: 'background.paper',
            cursor: disabled ? 'default' : 'text',
            '& .tiptap': {
              outline: 'none',
              minHeight,
              fontSize: '0.875rem',
              lineHeight: 1.6,
              color: 'text.primary',
              '& p': { m: 0, mb: 0.5 },
              '& p.is-editor-empty:first-child::before': {
                content: `"${placeholder}"`,
                color: 'text.disabled',
                pointerEvents: 'none',
                float: 'left',
                height: 0,
              },
              '& ul, & ol': { pl: 2.5, my: 0.5 },
              '& li': { mb: 0.25 },
              '& a': { color: 'primary.main', textDecoration: 'underline', cursor: 'pointer' },
              '& strong': { fontWeight: 700 },
              '& em': { fontStyle: 'italic' },
            },
          }}
          onClick={() => { if (!disabled) editor.commands.focus() }}
        >
          <EditorContent editor={editor} />
        </Box>
      </Box>
    </Box>
  )
}
