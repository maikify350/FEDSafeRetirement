/**
 * Public website lead intake.
 *
 * This endpoint is designed for the static marketing website. It accepts a
 * small, browser-safe payload, normalizes it, and writes to lead_funnel using
 * the server-side Supabase service role key. Do not require WEBHOOK_SECRET here:
 * that secret is for server-to-server webhooks and must not be exposed in site JS.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { createAdminClient } from '@/utils/supabase/server'

const ALLOWED_FORM_TYPES = new Set([
  'retirement-review',
  'newsletter',
  'contact',
  'checklist',
  'agency-briefing',
  'who-we-are-video',
  'generic',
])

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

type WebsiteLeadPayload = Record<string, unknown>

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)

  Object.entries(CORS_HEADERS).forEach(([key, value]) => headers.set(key, value))

  return NextResponse.json(data, {
    ...init,
    headers,
  })
}

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

function numberOrNull(value: unknown): number | null {
  const text = asString(value, 20)

  if (!text) return null

  const parsed = Number.parseInt(text, 10)

  return Number.isFinite(parsed) ? parsed : null
}

function birthYearFromPayload(body: WebsiteLeadPayload): number | null {
  const explicit = numberOrNull(body.birthYear)

  if (explicit && explicit > 1900 && explicit < 2100) return explicit

  const dateText = asString(body.dateOfBirth || body.dob, 32)

  if (!dateText) return null

  const match = dateText.match(/\b(19|20)\d{2}\b/)

  if (!match) return null

  const year = Number.parseInt(match[0], 10)

  return year > 1900 && year < 2100 ? year : null
}

function buildNotes(body: WebsiteLeadPayload, formType: string): string {
  const parts = [
    `Website form: ${formType}`,
    asString(body.sourcePage, 200) ? `Page: ${asString(body.sourcePage, 200)}` : null,
    asString(body.questionsComments || body.comments || body.message, 2000)
      ? `Message: ${asString(body.questionsComments || body.comments || body.message, 2000)}`
      : null,
  ].filter(Boolean)

  return parts.join('\n').slice(0, 4000)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  let body: WebsiteLeadPayload

  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Honeypot: static forms can include a hidden "website" field. Real users
  // leave it blank; many bots fill it. Return success without writing anything.
  if (asString(body.website || body.companyWebsite)) {
    return json({ ok: true, skipped: true })
  }

  const formTypeRaw = asString(body.formType, 80) || 'generic'
  const formType = ALLOWED_FORM_TYPES.has(formTypeRaw) ? formTypeRaw : 'generic'
  const firstName = asString(body.firstName || body.first_name, 120)
  const lastName = asString(body.lastName || body.last_name, 120)
  const email = asString(body.email || body.personalEmail || body.personal_email, 254)
  const phone = asString(body.phone || body.cellPhone || body.cell_phone, 80)

  if (!firstName && !lastName && !email && !phone) {
    return json({ error: 'At least one contact field is required' }, { status: 400 })
  }

  if (email && !emailLooksValid(email)) {
    return json({ error: 'Invalid email address' }, { status: 400 })
  }

  if (formType === 'newsletter' && !email) {
    return json({ error: 'Email is required for newsletter signup' }, { status: 400 })
  }

  const sourcePage = asString(body.sourcePage, 300)
  const referrer = asString(body.referrer, 300)

  const row = {
    event: 'website.form_submit',
    source: `website:${formType}`,
    lead_type: formType,
    status: 'pending',
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    cell_phone: phone,
    birth_year: birthYearFromPayload(body),
    agency: asString(body.agency || body.federalAgency || body.federal_agency, 200),
    years_employed: asString(body.yearsOfService || body.yearsMonthsOfService || body.years_employed, 120),
    city: asString(body.city, 120),
    state: asString(body.state, 40),
    zip: asString(body.zip || body.zipCode, 20),
    notes: buildNotes(body, formType),
    raw_payload: {
      ...body,
      normalizedFormType: formType,
      sourcePage,
      referrer,
      userAgent: request.headers.get('user-agent'),
      submittedAt: new Date().toISOString(),
    },
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('lead_funnel')
    .insert(row)
    .select('id')
    .single()

  if (error) {
    return json({ error: error.message }, { status: 500 })
  }

  return json({ ok: true, id: data?.id })
}
