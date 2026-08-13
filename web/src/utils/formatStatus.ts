/**
 * Formats a raw status/enum value into Proper Case for display.
 * Rule: ALL status labels shown in the UI must use this function.
 *
 * Examples:
 *   'draft'       → 'Draft'
 *   'in_progress' → 'In Progress'
 *   'on_hold'     → 'On Hold'
 *   'cancelled'   → 'Cancelled'
 */
export function fmtStatus(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
