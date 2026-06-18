/**
 * Public newsletter signup endpoint.
 *
 * Accepts POST from the static marketing website newsletter form.
 * Validates required fields, deduplicates by email, and writes to the
 * `newsletter` table using the service-role key (bypasses RLS).
 *
 * Vercel URL:
 *   POST https://fedsafe-retirement.vercel.app/api/public/newsletter-signup
 *
 * CORS is fully open so any origin (e.g. the marketing site) can call it.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createAdminClient } from '@/utils/supabase/server'

/* ── CORS ────────────────────────────────────────────────────────────────── */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)

  Object.entries(CORS_HEADERS).forEach(([key, value]) => headers.set(key, value))

  return NextResponse.json(data, { ...init, headers })
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function asString(value: unknown, max = 500): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()

  if (!text) return null

  return text.slice(0, max)
}

function emailLooksValid(email: string | null): boolean {
  if (!email) return false

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')

  if (digits.length < 7) return null

  // Format as (XXX) XXX-XXXX for US numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }

  return raw.trim()
}

/* ── CORS preflight ──────────────────────────────────────────────────────── */

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

/* ── POST handler ────────────────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Honeypot: hidden field bots tend to fill
  if (asString(body.website || body.companyWebsite)) {
    return json({ ok: true, skipped: true })
  }

  // ── Extract & validate fields ────────────────────────────────────────
  const firstName     = asString(body.firstName || body.first_name, 120)
  const lastName      = asString(body.lastName || body.last_name, 120)
  const cellPhone     = normalizePhone(asString(body.cellPhone || body.cell_phone || body.phone, 80))
  const personalEmail = asString(body.personalEmail || body.personal_email || body.email, 254)

  // All four fields are required per the form
  if (!firstName) return json({ error: 'First name is required' }, { status: 400 })
  if (!lastName)  return json({ error: 'Last name is required' }, { status: 400 })
  if (!cellPhone) return json({ error: 'Cell phone is required' }, { status: 400 })
  if (!personalEmail) return json({ error: 'Personal email is required' }, { status: 400 })

  if (!emailLooksValid(personalEmail)) {
    return json({ error: 'Invalid email address' }, { status: 400 })
  }

  // ── Build row ────────────────────────────────────────────────────────
  const sourcePage = asString(body.sourcePage || body.source_page, 300)
  const referrer   = asString(body.referrer, 300)

  const row = {
    first_name:     firstName,
    last_name:      lastName,
    cell_phone:     cellPhone,
    personal_email: personalEmail,
    source_page:    sourcePage,
    referrer,
    ip_address:     request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    user_agent:     request.headers.get('user-agent'),
    sms_consent:    body.smsConsent !== false,  // default true
    cre_by:         'website:newsletter',
    mod_by:         'website:newsletter',
    raw_payload: {
      ...body,
      sourcePage,
      referrer,
      submittedAt: new Date().toISOString(),
    },
  }

  // ── Insert (upsert on email for idempotency) ─────────────────────────
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('newsletter')
    .upsert(row, { onConflict: 'personal_email' })
    .select('id')
    .single()

  if (error) {
    console.error('[API /public/newsletter-signup] Supabase error:', error.message)

    return json({ error: error.message }, { status: 500 })
  }

  return json({ ok: true, id: data?.id })
}
