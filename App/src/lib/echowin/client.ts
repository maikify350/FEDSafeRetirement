/**
 * echowin API client
 * Wraps the echo.win REST API with typed helpers.
 * Base URL: https://echo.win/api/v1
 * Auth: X-API-Key header
 */

const BASE = 'https://echo.win/api/v1'
const KEY  = process.env.ECHOWIN_API_KEY ?? ''

async function echoFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'X-API-Key': KEY,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`echowin ${init.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  }
  return res.json()
}

// ── Calls ────────────────────────────────────────────────────────────────────

export interface EchoCall {
  id: string
  from: string
  to: string
  type: 'INCOMING' | 'OUTGOING'
  status: string | null
  duration: number | null
  createdAt: string
  endedAt: string | null
  summary: string | null
  score: number | null
  flagged: boolean
  spam: boolean
  agent: { id: string; name: string }
  transcript: { speaker: string; text: string; timestamp: string }[]
  recordingUrl: string | null
}

export async function listCalls(params: {
  page?: number
  limit?: number
  agentId?: string
  after?: string   // ISO date — createdAt >= after
} = {}): Promise<{ data: EchoCall[]; pagination: { totalCount: number; totalPages: number; page: number; limit: number } }> {
  const q = new URLSearchParams()
  if (params.page)    q.set('page',    String(params.page))
  if (params.limit)   q.set('limit',   String(params.limit))
  if (params.agentId) q.set('agentId', params.agentId)
  if (params.after)   q.set('after',   params.after)
  return echoFetch(`/calls?${q}`)
}

export async function getCall(callId: string): Promise<EchoCall> {
  return echoFetch(`/calls/${callId}`)
}

// ── Contacts ─────────────────────────────────────────────────────────────────

export interface EchoContact {
  id: string
  firstName: string | null
  lastName: string | null
  number: string
  email: string | null
  customFields: Record<string, string>
  tags: { id: string; name: string }[]
}

export async function listContacts(params: { search?: string; limit?: number } = {}): Promise<{ data: EchoContact[] }> {
  const q = new URLSearchParams()
  if (params.search) q.set('search', params.search)
  if (params.limit)  q.set('limit',  String(params.limit))
  return echoFetch(`/contacts?${q}`)
}

/**
 * Look up echowin's contact record for a phone number. echowin enriches
 * contacts with caller-ID (CNAM) names and any details collected on the call,
 * so this fills gaps the transcript parser couldn't (e.g. dropped/short calls).
 * Returns the best phone-number match, or null. Never throws.
 */
export async function findContactByNumber(number: string): Promise<EchoContact | null> {
  if (!number) return null
  const digits = (s: string) => s.replace(/\D/g, '')
  try {
    const { data } = await listContacts({ search: number, limit: 5 })
    if (!data?.length) return null
    const target = digits(number)
    return data.find(c => digits(c.number) === target) ?? data[0] ?? null
  } catch {
    return null
  }
}

export async function createContact(body: {
  number: string
  firstName?: string
  lastName?: string
  email?: string
  customFields?: Record<string, string>
  tagNames?: string[]
  notes?: string
}): Promise<EchoContact> {
  return echoFetch('/contacts', { method: 'POST', body: JSON.stringify(body) })
}

export async function updateContact(contactId: string, body: {
  firstName?: string
  lastName?: string
  email?: string
  customFields?: Record<string, string>
  tagNames?: string[]
  notes?: string
}): Promise<EchoContact> {
  return echoFetch(`/contacts/${contactId}`, { method: 'PUT', body: JSON.stringify(body) })
}
