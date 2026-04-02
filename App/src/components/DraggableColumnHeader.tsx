/**
 * DraggableColumnHeader
 *
 * Drop-in replacement for <th> that enables:
 *  - Drag-to-reorder (via @dnd-kit/sortable)
 *  - Column sort (TanStack Table)
 *  - Multi-condition column filter (when showFilters=true)
 *    Supports: Contains / Not Contains / Starts With / Ends With / Equals / Not Equals / Is Empty / Is Not Empty
 *    With AND / OR combinator between four conditions.
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { flexRender, type Header } from '@tanstack/react-table'
import classnames from 'classnames'
import {
  FILTER_OPS,
  DEFAULT_FILTER_VALUE,
  isConditionActive,
  type ColFilterValue,
  type FilterCondition,
  type FilterOp,
} from '@/lib/columnFilter'

interface Props<T> {
  header: Header<T, unknown>
  showFilters?: boolean
}

// ─── Condition row ─────────────────────────────────────────────────────────────
function ConditionRow({
  condition,
  onChange,
}: {
  condition: FilterCondition
  onChange: (c: FilterCondition) => void
}) {
  const noValue = condition.op === 'isEmpty' || condition.op === 'isNotEmpty'

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <select
        value={condition.op}
        onChange={e => onChange({ ...condition, op: e.target.value as FilterOp, value: noValue ? '' : condition.value })}
        style={selectStyle}
      >
        {FILTER_OPS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {!noValue && (
        <input
          value={condition.value}
          onChange={e => onChange({ ...condition, value: e.target.value })}
          placeholder='Value…'
          style={inputStyle}
        />
      )}
    </div>
  )
}

// ─── Filter popover ────────────────────────────────────────────────────────────
function FilterPopover({
  column,
  anchorRef,
  onClose,
}: {
  column: Header<any, unknown>['column']
  anchorRef: React.RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const raw = column.getFilterValue() as ColFilterValue | undefined
  const [draft, setDraft] = useState<ColFilterValue>(raw ?? DEFAULT_FILTER_VALUE)
  const popRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popRef.current &&
        !popRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [anchorRef, onClose])

  const setCondition = (index: 0 | 1 | 2 | 3, c: FilterCondition) => {
    setDraft(d => {
      const next = { ...d, conditions: [...d.conditions] as ColFilterValue['conditions'] }
      next.conditions[index] = c
      return next
    })
  }

  const apply = () => {
    column.setFilterValue(draft)
    onClose()
  }

  const clear = () => {
    setDraft(DEFAULT_FILTER_VALUE)
    column.setFilterValue(undefined)
    onClose()
  }

  // Track how many condition rows are visible (start at 1, grow to 4)
  const [visibleCount, setVisibleCount] = useState<number>(() => {
    const active = (raw?.conditions ?? DEFAULT_FILTER_VALUE.conditions)
      .filter(isConditionActive).length
    return Math.max(1, active)
  })

  const removeCondition = (idx: 0 | 1 | 2 | 3) => {
    // Shift remaining conditions up, fill last slot with empty default
    setDraft(d => {
      const next = [...d.conditions] as ColFilterValue['conditions']
      for (let i = idx; i < 3; i++) next[i] = next[i + 1]
      next[3] = { op: 'contains', value: '' }
      return { ...d, conditions: next }
    })
    setVisibleCount(v => Math.max(1, v - 1))
  }

  // Position below anchor
  const rect = anchorRef.current?.getBoundingClientRect()
  const top = rect ? rect.bottom + window.scrollY + 2 : 0
  const left = rect ? Math.max(4, Math.min(rect.left + window.scrollX, window.innerWidth - 320)) : 0

  return (
    <div ref={popRef} style={{ ...popoverStyle, top, left }} onClick={e => e.stopPropagation()}>

      {/* Match ALL / ANY radio — plain English */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--mui-palette-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          Column Filter
        </div>
        {(['and', 'or'] as const).map(combo => (
          <label key={combo} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 4 }}>
            <input
              type='radio'
              name='global-combinator'
              checked={draft.combinator === combo}
              onChange={() => setDraft(d => ({ ...d, combinator: combo }))}
              style={{ accentColor: 'var(--mui-palette-primary-main)', margin: 0, width: 14, height: 14 }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--mui-palette-text-primary)' }}>
              {combo === 'and' ? 'Match ALL conditions' : 'Match ANY condition'}
            </span>
          </label>
        ))}
      </div>

      <div style={{ height: 1, background: 'var(--mui-palette-divider)', marginBottom: 8 }} />

      {/* Condition rows */}
      {Array.from({ length: visibleCount }, (_, i) => i as 0 | 1 | 2 | 3).map((i) => (
        <div key={i}>
          {/* AND/OR connector badge between rows */}
          {i > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '5px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--mui-palette-divider)' }} />
              <span style={{
                fontSize: '0.63rem', fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                background: 'var(--mui-palette-primary-lightOpacity)',
                color: 'var(--mui-palette-primary-main)',
                border: '1px solid var(--mui-palette-primary-light)',
              }}>
                {draft.combinator.toUpperCase()}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--mui-palette-divider)' }} />
            </div>
          )}
          {/* Condition row + remove button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ flex: 1 }}>
              <ConditionRow condition={draft.conditions[i]} onChange={c => setCondition(i, c)} />
            </div>
            {visibleCount > 1 && (
              <button
                onClick={() => removeCondition(i)}
                title='Remove condition'
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: 'var(--mui-palette-text-secondary)', fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}

      {/* + Add condition */}
      {visibleCount < 4 && (
        <button
          onClick={() => setVisibleCount(v => Math.min(4, v + 1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0 2px', color: 'var(--mui-palette-primary-main)', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Add condition
        </button>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--mui-palette-divider)', paddingTop: 8 }}>
        <button onClick={clear} style={btnStyle('secondary')}>Clear</button>
        <button onClick={apply} style={btnStyle('primary')}>Apply</button>
      </div>
    </div>
  )
}

// ─── Filter trigger (inline pill in header) ────────────────────────────────────
function FilterInput({ column }: { column: Header<any, unknown>['column'] }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  const filterVal = column.getFilterValue() as ColFilterValue | undefined
  const isActive =
    filterVal?.conditions.some(c => c.op === 'isEmpty' || c.op === 'isNotEmpty' || c.value.trim() !== '') ?? false

  const handleClose = useCallback(() => setOpen(false), [])

  if (!column.getCanFilter()) return <div style={{ height: 24 }} />

  // Show a compact summary when a filter is active
  let summary = ''
  if (isActive && filterVal) {
    const parts = filterVal.conditions
      .filter(c => c.op === 'isEmpty' || c.op === 'isNotEmpty' || c.value.trim() !== '')
      .map(c => (c.op === 'isEmpty' || c.op === 'isNotEmpty') ? c.op : `"${c.value}"`)
    summary = parts.join(` ${filterVal.combinator.toUpperCase()} `)
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        title={isActive ? `Filter: ${summary}` : 'Click to filter'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          marginTop: 4,
          width: '100%',
          padding: '2px 6px',
          fontSize: '0.72rem',
          border: `1px solid ${isActive ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-divider)'}`,
          borderRadius: 4,
          background: isActive ? 'color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)' : 'var(--mui-palette-background-paper)',
          color: isActive ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-text-secondary)',
          cursor: 'pointer',
          textAlign: 'left',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
        }}
      >
        <i className='tabler-filter text-[10px]' style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isActive ? summary : 'Filter…'}
        </span>
        {isActive && (
          <i
            className='tabler-x text-[10px]'
            style={{ flexShrink: 0 }}
            onClick={e => { e.stopPropagation(); column.setFilterValue(undefined) }}
            title='Clear filter'
          />
        )}
      </button>

      {open && (
        <FilterPopover
          column={column}
          anchorRef={btnRef as React.RefObject<HTMLElement>}
          onClose={handleClose}
        />
      )}
    </>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────
export function DraggableColumnHeader<T>({ header, showFilters }: Props<T>) {
  const isFixedCol = ['action', 'apply', 'select'].includes(header.column.id)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.column.id,
    disabled: isFixedCol,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: header.getSize(),
    opacity: isDragging ? 0.5 : 1,
    cursor: isFixedCol ? 'default' : (header.column.getCanSort() ? 'pointer' : 'grab'),
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
    whiteSpace: 'nowrap',
    verticalAlign: 'top',
  }

  return (
    <th ref={setNodeRef} style={style}>
      {header.isPlaceholder ? null : (
        <>
          <div
            className={classnames({
              'flex items-center gap-1': true,
              'cursor-pointer select-none': header.column.getCanSort(),
            })}
            onClick={header.column.getToggleSortingHandler()}
          >
            {!['action', 'apply', 'select'].includes(header.column.id) && (
              <span
                {...attributes}
                {...listeners}
                style={{ cursor: 'grab', display: 'inline-flex', alignItems: 'center', opacity: 0.4, fontSize: '0.9rem' }}
                onClick={e => e.stopPropagation()}
                title='Drag to reorder'
              >
                <i className='tabler-grip-vertical' />
              </span>
            )}

            {flexRender(header.column.columnDef.header, header.getContext())}

            {{
              asc: <i className='tabler-chevron-up text-xl text-primary' />,
              desc: <i className='tabler-chevron-down text-xl text-primary' />,
            }[header.column.getIsSorted() as 'asc' | 'desc'] ??
              (header.column.getCanSort()
                ? <i className='tabler-arrows-sort text-xl' style={{ opacity: 0.25 }} />
                : null
              )}
          </div>

          {showFilters && <FilterInput column={header.column} />}
        </>
      )}

      {/* Resize handle */}
      {header.column.getCanResize() && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onDoubleClick={() => header.column.resetSize()}
          title='Drag to resize (double-click to reset)'
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            height: '100%',
            width: 4,
            cursor: 'col-resize',
            userSelect: 'none',
            touchAction: 'none',
            background: header.column.getIsResizing()
              ? 'var(--mui-palette-primary-main)'
              : 'transparent',
          }}
          className='hover:bg-primary/40'
        />
      )}
    </th>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  flex: '0 0 auto',
  fontSize: '0.72rem',
  padding: '2px 4px',
  border: '1px solid var(--mui-palette-divider)',
  borderRadius: 4,
  background: 'var(--mui-palette-background-paper)',
  color: 'var(--mui-palette-text-primary)',
  cursor: 'pointer',
  maxWidth: 110,
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  fontSize: '0.72rem',
  padding: '2px 6px',
  border: '1px solid var(--mui-palette-divider)',
  borderRadius: 4,
  background: 'var(--mui-palette-background-paper)',
  color: 'var(--mui-palette-text-primary)',
  outline: 'none',
  minWidth: 0,
  boxSizing: 'border-box',
}

const popoverStyle: React.CSSProperties = {
  position: 'fixed',
  zIndex: 9999,
  width: 310,
  background: 'var(--mui-palette-background-paper)',
  border: '1px solid var(--mui-palette-divider)',
  borderRadius: 8,
  padding: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
}

function btnStyle(variant: 'primary' | 'secondary'): React.CSSProperties {
  return {
    padding: '4px 12px',
    fontSize: '0.72rem',
    fontWeight: 600,
    borderRadius: 4,
    cursor: 'pointer',
    border: variant === 'primary' ? 'none' : '1px solid var(--mui-palette-divider)',
    background: variant === 'primary' ? 'var(--mui-palette-primary-main)' : 'transparent',
    color: variant === 'primary' ? 'var(--mui-palette-primary-contrastText)' : 'var(--mui-palette-text-secondary)',
  }
}
