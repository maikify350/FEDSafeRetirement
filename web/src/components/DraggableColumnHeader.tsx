/**
 * DraggableColumnHeader
 *
 * Drop-in replacement for <th> that enables:
 *  - Drag-to-reorder (via @dnd-kit/sortable)
 *  - Column sort (TanStack Table)
 *  - Multi-condition column filter (when showFilters=true)
 *    Supports: Contains / Not Contains / Starts With / Ends With / Equals / Not Equals / Is Empty / Is Not Empty
 *    With AND / OR combinator between two conditions — matching Telerik-style column filtering.
 *
 * Usage:
 *   1. Wrap <thead> in <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
 *   2. Wrap the table container in <DndContext onDragEnd={handleDragEnd}>
 *   3. Replace <th> with <DraggableColumnHeader header={h} showFilters={showFilters}>
 *   4. In useReactTable, add:
 *        import { multiConditionFilterFn, MULTI_FILTER_KEY } from '@/lib/columnFilter'
 *        filterFns: { fuzzy: fuzzyFilter, [MULTI_FILTER_KEY]: multiConditionFilterFn },
 *        defaultColumn: { filterFn: MULTI_FILTER_KEY },
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
  anchorRef: React.RefObject<HTMLElement>
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

  // Position below anchor
  const rect = anchorRef.current?.getBoundingClientRect()
  const top = rect ? rect.bottom + window.scrollY + 2 : 0
  const left = rect ? Math.max(4, Math.min(rect.left + window.scrollX, window.innerWidth - 320)) : 0

  return (
    <div ref={popRef} style={{ ...popoverStyle, top, left }} onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--mui-palette-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Column Filter
      </div>

      <ConditionRow condition={draft.conditions[0]} onChange={c => setCondition(0, c)} />

      {/* Combinator between conditions */}
      {([0, 1, 2] as const).map(i => (
        <div key={i}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '6px 0' }}>
            {(['and', 'or'] as const).map(combo => (
              <label key={combo} style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', fontSize: '0.72rem', fontWeight: draft.combinator === combo ? 700 : 400, color: draft.combinator === combo ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-text-secondary)' }}>
                <input
                  type='radio'
                  name='combinator'
                  checked={draft.combinator === combo}
                  onChange={() => setDraft(d => ({ ...d, combinator: combo }))}
                  style={{ accentColor: 'var(--mui-palette-primary-main)', margin: 0 }}
                />
                {combo.toUpperCase()}
              </label>
            ))}
            <div style={{ flex: 1, height: 1, background: 'var(--mui-palette-divider)' }} />
          </div>
          <ConditionRow condition={draft.conditions[i + 1]} onChange={c => setCondition((i + 1) as 1 | 2 | 3, c)} />
        </div>
      ))}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.column.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: header.getSize(),
    opacity: isDragging ? 0.5 : 1,
    cursor: header.column.getCanSort() ? 'pointer' : 'grab',
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
            <span
              {...attributes}
              {...listeners}
              style={{ cursor: 'grab', display: 'inline-flex', alignItems: 'center', opacity: 0.4, fontSize: '0.9rem' }}
              onClick={e => e.stopPropagation()}
              title='Drag to reorder'
            >
              <i className='tabler-grip-vertical' />
            </span>

            {flexRender(header.column.columnDef.header, header.getContext())}

            {{
              asc: <i className='tabler-chevron-up text-xl' />,
              desc: <i className='tabler-chevron-down text-xl' />,
            }[header.column.getIsSorted() as 'asc' | 'desc'] ?? null}
          </div>

          {showFilters && <FilterInput column={header.column} />}
        </>
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
