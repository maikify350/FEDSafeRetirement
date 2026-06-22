/**
 * Shared normalizers for echowin registration data.
 */

import { parseLooseDate } from './linkEvent'

/**
 * Coerce a DOB value ("$dob" template, ISO, US slash or human date) into a
 * Postgres date string (yyyy-mm-dd), or null. 2-digit years are assumed to be
 * 1900s (the webinar audience are pre-retirees born last century).
 */
export function coerceDob(raw: unknown): string | null {
  if (raw == null) return null
  const s = String(raw).trim()

  if (!s || s.startsWith('$')) return null

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)

  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`

  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (m) {
    let y = +m[3]

    if (y < 100) y += 1900
    return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }

  const d = parseLooseDate(s) // "October 11, 1957"

  if (d?.year) return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`

  return null
}

/**
 * Current age in whole years from a DOB (ISO yyyy-mm-dd), or null. Computed
 * against "today", so callers get a live value rather than a stored one that
 * drifts out of date.
 */
export function computeAge(dob: string | null | undefined): number | null {
  if (!dob) return null
  const d = new Date(`${String(dob).slice(0, 10)}T00:00:00`)

  if (Number.isNaN(d.getTime())) return null

  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()

  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--

  return age >= 0 && age < 130 ? age : null
}

/**
 * Normalize a stated retirement year to a 4-digit YYYY string. Callers often
 * say "27" instead of "2027" — a 1–2 digit value becomes 20YY. Returns null
 * when there's nothing numeric (e.g. an unresolved "$retirementYear" template).
 */
export function normalizeRetirementYear(raw: unknown): string | null {
  if (raw == null) return null
  const s = String(raw).trim()

  if (!s || s.startsWith('$')) return null

  // Already a full 4-digit year somewhere in the string.
  const four = s.match(/\b(19|20)\d{2}\b/)

  if (four) return four[0]

  // 1–2 digit year like "27" or "'27" → 20YY.
  const two = s.match(/\d{1,2}/)

  if (two) return String(2000 + +two[0])

  return null
}
