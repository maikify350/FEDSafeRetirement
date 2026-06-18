/**
 * columnFilter — multi-condition column filter for TanStack Table
 *
 * Supports four conditions joined by AND / OR with an operator per condition:
 *   contains | notContains | startsWith | endsWith | equals | notEquals | isEmpty | isNotEmpty
 *
 * All comparisons are CASE-INSENSITIVE by default.
 */

import type { FilterFn } from '@tanstack/react-table'

export const MULTI_FILTER_KEY = 'multiCondition' as const

export type FilterOp =
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'equals'
  | 'notEquals'
  | 'isEmpty'
  | 'isNotEmpty'

export type FilterCondition = { op: FilterOp; value: string }

export type ColFilterValue = {
  combinator: 'and' | 'or'
  conditions: [FilterCondition, FilterCondition, FilterCondition, FilterCondition]
}

export const DEFAULT_FILTER_VALUE: ColFilterValue = {
  combinator: 'and',
  conditions: [
    { op: 'contains', value: '' },
    { op: 'contains', value: '' },
    { op: 'contains', value: '' },
    { op: 'contains', value: '' },
  ],
}

export const FILTER_OPS: { value: FilterOp; label: string }[] = [
  { value: 'contains',     label: 'Contains' },
  { value: 'notContains',  label: 'Not Contains' },
  { value: 'startsWith',   label: 'Starts With' },
  { value: 'endsWith',     label: 'Ends With' },
  { value: 'equals',       label: 'Equals' },
  { value: 'notEquals',    label: 'Not Equals' },
  { value: 'isEmpty',      label: 'Is Empty' },
  { value: 'isNotEmpty',   label: 'Is Not Empty' },
]

function matchCondition(cellValue: string, condition: FilterCondition): boolean {
  const { op, value } = condition
  const cell = cellValue.toLowerCase()
  const v = value.toLowerCase()

  switch (op) {
    case 'contains':    return cell.includes(v)
    case 'notContains': return !cell.includes(v)
    case 'startsWith':  return cell.startsWith(v)
    case 'endsWith':    return cell.endsWith(v)
    case 'equals':      return cell === v
    case 'notEquals':   return cell !== v
    case 'isEmpty':     return cell.trim() === ''
    case 'isNotEmpty':  return cell.trim() !== ''
    default:            return cell.includes(v)
  }
}

export function isConditionActive(c: FilterCondition): boolean {
  return c.op === 'isEmpty' || c.op === 'isNotEmpty' || c.value.trim() !== ''
}

export const multiConditionFilterFn: FilterFn<any> = (row, columnId, filterValue: ColFilterValue) => {
  if (!filterValue) return true

  const { conditions, combinator } = filterValue
  const cellValue = String(row.getValue(columnId) ?? '')

  const active = conditions.filter(isConditionActive)
  if (active.length === 0) return true

  const results = active.map(c => matchCondition(cellValue, c))
  return combinator === 'or' ? results.some(Boolean) : results.every(Boolean)
}

// Required by TanStack to auto-remove empty filters
multiConditionFilterFn.autoRemove = (val: ColFilterValue) => {
  if (!val) return true
  return !val.conditions.some(isConditionActive)
}
