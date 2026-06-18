/**
 * Public partner/rep bios feed.
 *
 * Read-only endpoint for the marketing website to pull biographies straight
 * from the app (the source of truth). Returns every user that has a bio
 * (short or long). Data here is already public (it is published on the site),
 * so no auth is required — but CORS is open and only safe, public-facing
 * fields are exposed.
 *
 *   GET /api/public/partner-bios            → all users with a bio
 *   GET /api/public/partner-bios?email=...  → a single user by email
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { createAdminClient } from '@/utils/supabase/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v))
  return NextResponse.json(data, { ...init, headers })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) {
  const admin = createAdminClient()
  const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase()

  let query = admin
    .from('users')
    .select('id, first_name, last_name, email, role, avatar_url, bio_short, bio_long, mod_dt')
    .order('last_name', { ascending: true })

  if (email) {
    query = query.eq('email', email)
  }

  const { data, error } = await query
  if (error) return json({ error: error.message }, { status: 500 })

  const rows = (data ?? [])
    // Only return people who actually have bio content to publish.
    .filter(u => (u.bio_short && u.bio_short.trim()) || (u.bio_long && u.bio_long.trim()))
    .map(u => ({
      id: u.id,
      first_name: u.first_name ?? '',
      last_name: u.last_name ?? '',
      full_name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
      email: u.email,
      role: u.role,
      avatar_url: u.avatar_url || null,
      bio_short: u.bio_short ?? '',
      bio_long: u.bio_long ?? '',
      updated_at: u.mod_dt ?? null,
    }))

  return json({ count: rows.length, partners: rows })
}
