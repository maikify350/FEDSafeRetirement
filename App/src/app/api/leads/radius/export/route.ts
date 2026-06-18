/**
 * GET /api/leads/radius/export
 *
 * Returns the FULL set of leads inside a radius — bypasses pagination so
 * the UI can offer an "Export All" action without hitting the page-size
 * cap of /api/leads/radius. Hard ceiling of 50,000 rows protects the DB
 * and the client from runaway downloads.
 *
 * Query params:
 *   address         – full address string to geocode (skip if lat/lon given)
 *   lat / lon       – optional; bypass geocoding when provided
 *   radius          – radius in miles (default 25)
 *   max             – hard upper bound on rows returned (default 50000, max 50000)
 *   format          – 'json' (default) or 'csv'
 *
 * Response shapes:
 *   format=json → { data: Lead[], total, center, radius }
 *   format=csv  → text/csv attachment with the same default lead columns
 *                 used by the leads grid's CSV export.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const HARD_MAX = 50_000

type Lead = Record<string, any>

function escapeCsvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function leadsToCsv(leads: Lead[]): string {
  const headers = [
    'First Name', 'Last Name', 'Occupation', 'Grade', 'Annual Salary', 'Hourly Rate',
    'Facility', 'City', 'State', 'Zip', 'Duty Date', 'Years of Service', 'Distance (mi)',
  ]
  const rows = leads.map(r => [
    r.first_name, r.last_name, r.occupation_title ?? '', r.grade_level ?? '',
    r.annual_salary ?? '', r.hourly_rate ?? '',
    r.facility_name ?? '', r.facility_city ?? '', r.facility_state ?? '', r.facility_zip_code ?? '',
    r.entered_on_duty_date ?? '', r.years_of_service ?? '', r.distance_miles ?? '',
  ])
  return [headers, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\n')
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const address  = searchParams.get('address') ?? ''
  const radiusMi = parseFloat(searchParams.get('radius') ?? '25')
  const max      = Math.min(parseInt(searchParams.get('max') ?? String(HARD_MAX)), HARD_MAX)
  const format   = (searchParams.get('format') ?? 'json').toLowerCase()

  let lat = parseFloat(searchParams.get('lat') ?? '')
  let lon = parseFloat(searchParams.get('lon') ?? '')

  // Geocode if lat/lon not provided
  if (isNaN(lat) || isNaN(lon)) {
    if (!address.trim()) {
      return NextResponse.json({ error: 'Either address or lat/lon is required' }, { status: 400 })
    }
    const mapboxKey = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!mapboxKey) {
      return NextResponse.json({ error: 'Mapbox API key not configured' }, { status: 500 })
    }
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxKey}&limit=1`
      const geoRes = await fetch(url)
      const geoData = await geoRes.json()
      if (!geoData.features || geoData.features.length === 0) {
        return NextResponse.json({ error: 'Could not geocode the provided address' }, { status: 404 })
      }
      ;[lon, lat] = geoData.features[0].center
    } catch (err) {
      console.error('[API /leads/radius/export] Geocoding error:', err)
      return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 })
    }
  }

  // Supabase / PostgREST caps RPC responses at 1,000 rows by default
  // regardless of p_limit, so fetch in chunks until the cap is reached
  // or the RPC reports fewer rows than asked for.
  const supabase = await createClient()

  const search        = searchParams.get('search') ?? ''
  const stateParam    = searchParams.get('state') ?? ''
  const genderParam   = searchParams.get('gender') ?? ''
  const favoriteParam = searchParams.get('favorite')
  const filtersRaw    = searchParams.get('filters') ?? '[]'

  let parsedFilters = []
  try {
    parsedFilters = JSON.parse(filtersRaw)
  } catch (e) {
    console.error('[API /leads/radius/export] Failed to parse filtersRaw:', e)
  }

  const PAGE = 1000
  const leads: Lead[] = []
  let offset = 0

  while (offset < max) {
    const limit = Math.min(PAGE, max - offset)
    const { data, error } = await supabase.rpc('search_leads_by_radius', {
      p_lat: lat,
      p_lon: lon,
      p_radius_miles: radiusMi,
      p_limit: limit,
      p_offset: offset,
      p_search: search.trim(),
      p_state: stateParam,
      p_gender: genderParam,
      p_favorite: favoriteParam === 'true' ? true : null,
      p_filters: parsedFilters,
    })
    if (error) {
      console.error('[API /leads/radius/export] RPC error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const batch = (data ?? []).filter((r: any) => r.lead_data !== null)
    if (batch.length === 0) break
    for (const r of batch) {
      leads.push({
        ...r.lead_data,
        distance_miles: parseFloat(r.distance_miles?.toFixed(1) ?? '0'),
      })
    }
    // RPC returned fewer than asked for → no more rows
    if (batch.length < limit) break
    offset += limit
  }

  if (format === 'csv') {
    const csv = leadsToCsv(leads)
    const stamp = new Date().toISOString().slice(0, 10)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads_radius_${stamp}.csv"`,
        'Cache-Control':       'no-store',
      },
    })
  }

  return NextResponse.json({
    data:   leads,
    total:  leads.length,
    center: { lat, lon },
    radius: radiusMi,
    capped: leads.length === max,
  })
}
