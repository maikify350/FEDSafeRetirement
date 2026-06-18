/**
 * GET /api/leads/radius
 *
 * Two modes:
 *
 * ── MODE: include (default / Seminar) ────────────────────────────────
 *   Find leads WITHIN a radius of a single address.
 *   ?address=...&radius=25&page=0&pageSize=25
 *
 * ── MODE: exclude (Webinar) ──────────────────────────────────────────
 *   Find leads matching filters but EXCLUDING those within any of the
 *   provided exclusion zones (multi-address).
 *   ?mode=exclude&zones=[{"address":"...","radius":50},...]&page=0&pageSize=100
 *
 * Common params:
 *   search, state, gender, favorite, filters, stateCounts, facilities
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// ── Geocode an address via Mapbox ────────────────────────────────────
// Returns the locality (city) alongside coords so exclusion zones can match
// by city name as well as radius — robust to mis-geocoded PO-box facilities.
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number; city: string | null } | null> {
  const mapboxKey = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  if (!mapboxKey) return null

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxKey}&limit=1`
  const res = await fetch(url)
  const data = await res.json()

  if (!data.features || data.features.length === 0) return null
  const feat = data.features[0]
  const [lon, lat] = feat.center
  const placeCtx = (feat.context ?? []).find((c: any) => typeof c.id === 'string' && c.id.startsWith('place'))
  const city = placeCtx?.text ?? (feat.place_type?.includes('place') ? feat.text : null) ?? null
  return { lat, lon, city }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const mode = searchParams.get('mode') ?? 'include'
  const page     = parseInt(searchParams.get('page') ?? '0')
  const pageSize = parseInt(searchParams.get('pageSize') ?? '25')

  const search        = searchParams.get('search') ?? ''
  const stateParam    = searchParams.get('state') ?? ''
  const genderParam   = searchParams.get('gender') ?? ''
  const favoriteParam = searchParams.get('favorite')
  const filtersRaw    = searchParams.get('filters') ?? '[]'
  const includeStateCounts = searchParams.get('stateCounts') === 'true'
  const includeFacilities  = searchParams.get('facilities') === 'true'

  let parsedFilters: any[] = []
  try { parsedFilters = JSON.parse(filtersRaw) } catch { /* ignore */ }

  const supabase = await createClient()

  // ═══════════════════════════════════════════════════════════════════
  //  MODE: EXCLUDE (Webinar) — multi-address exclusion zones
  // ═══════════════════════════════════════════════════════════════════
  if (mode === 'exclude') {
    const zonesRaw = searchParams.get('zones') ?? '[]'
    let zones: { address: string; radius: number }[] = []
    try { zones = JSON.parse(zonesRaw) } catch { /* ignore */ }

    if (zones.length === 0) {
      return NextResponse.json({ error: 'At least one exclusion zone is required' }, { status: 400 })
    }

    // Geocode all zone addresses in parallel
    const geocodeResults = await Promise.all(
      zones.map(async (z) => {
        const coords = await geocodeAddress(z.address)
        return coords ? { ...coords, radius_miles: z.radius, address: z.address } : null
      })
    )

    const failedZones = zones.filter((_, i) => !geocodeResults[i])
    if (failedZones.length > 0) {
      return NextResponse.json({
        error: `Could not geocode: ${failedZones.map(z => z.address).join(', ')}`,
      }, { status: 404 })
    }

    const exclusionZones = geocodeResults
      .filter(Boolean)
      .map(r => ({ lat: r!.lat, lon: r!.lon, radius_miles: r!.radius_miles, city: r!.city }))

    // Simple single-page RPC call (client handles batching for large exports)
    const dataResult = await supabase.rpc('search_leads_exclude_radius', {
      p_exclusion_zones: exclusionZones,
      p_limit: pageSize,
      p_offset: page * pageSize,
      p_search: search.trim(),
      p_state: stateParam,
      p_gender: genderParam,
      p_favorite: favoriteParam === 'true' ? true : null,
      p_filters: parsedFilters,
    })

    if (dataResult.error) {
      console.error('[API /leads/radius] Exclusion RPC Error:', dataResult.error.message)
      return NextResponse.json({ error: dataResult.error.message }, { status: 500 })
    }

    const rows = (dataResult.data ?? []).filter((r: any) => r.lead_data !== null)
    const total = rows.length > 0 ? Number(rows[0].total_count) : 0
    const leads = rows.map((r: any) => ({ ...r.lead_data }))

    // State counts + total-before-exclusion in parallel
    const stateCountsPromise = includeStateCounts
      ? supabase.rpc('exclusion_state_counts', {
          p_exclusion_zones: exclusionZones,
          p_search: search.trim(),
          p_state: stateParam,
          p_gender: genderParam,
          p_favorite: favoriteParam === 'true' ? true : null,
          p_filters: parsedFilters,
        })
      : Promise.resolve({ data: null, error: null })

    const totalBeforePromise = supabase.rpc('search_leads_exclude_radius', {
      p_exclusion_zones: [],
      p_limit: 1,
      p_offset: 0,
      p_search: search.trim(),
      p_state: stateParam,
      p_gender: genderParam,
      p_favorite: favoriteParam === 'true' ? true : null,
      p_filters: parsedFilters,
    })

    const [stateResult, totalBeforeResult] = await Promise.all([
      stateCountsPromise, totalBeforePromise,
    ])

    const totalBefore = totalBeforeResult.data?.[0]?.total_count
      ? Number(totalBeforeResult.data[0].total_count)
      : undefined

    const stateCounts = stateResult.data
      ? (stateResult.data as any[])
          .filter((r: any) => r.facility_state)
          .sort((a: any, b: any) => Number(b.lead_count) - Number(a.lead_count))
      : undefined

    // Return geocoded zones so the frontend can draw circles on the map
    const geocodedZones = geocodeResults.map((r, i) => ({
      address: zones[i].address,
      lat: r!.lat,
      lon: r!.lon,
      radius: zones[i].radius,
    }))

    return NextResponse.json({
      mode: 'exclude',
      data: leads,
      total,
      totalBeforeExclusion: totalBefore,
      page,
      pageSize,
      exclusionZones: geocodedZones,
      ...(stateCounts ? { stateCounts } : {}),
    })
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MODE: INCLUDE (Seminar) — single address, find within radius
  // ═══════════════════════════════════════════════════════════════════
  const address  = searchParams.get('address') ?? ''
  const radiusMi = parseFloat(searchParams.get('radius') ?? '25')

  let lat = parseFloat(searchParams.get('lat') ?? '')
  let lon = parseFloat(searchParams.get('lon') ?? '')

  if (isNaN(lat) || isNaN(lon)) {
    if (!address.trim()) {
      return NextResponse.json({ error: 'Either address or lat/lon is required' }, { status: 400 })
    }

    const coords = await geocodeAddress(address)
    if (!coords) {
      return NextResponse.json({ error: 'Could not geocode the provided address' }, { status: 404 })
    }
    lat = coords.lat
    lon = coords.lon
  }

  // Simple single-page RPC call (client handles batching for large exports)
  const dataResult = await supabase.rpc('search_leads_by_radius', {
    p_lat: lat,
    p_lon: lon,
    p_radius_miles: radiusMi,
    p_limit: pageSize,
    p_offset: page * pageSize,
    p_search: search.trim(),
    p_state: stateParam,
    p_gender: genderParam,
    p_favorite: favoriteParam === 'true' ? true : null,
    p_filters: parsedFilters,
  })

  if (dataResult.error) {
    console.error('[API /leads/radius] RPC Error:', dataResult.error.message)
    return NextResponse.json({ error: dataResult.error.message }, { status: 500 })
  }

  const rows = (dataResult.data ?? []).filter((r: any) => r.lead_data !== null)
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0
  const leads = rows.map((r: any) => ({
    ...r.lead_data,
    distance_miles: parseFloat(r.distance_miles?.toFixed(1) ?? '0'),
  }))

  // State counts + facilities in parallel (after data is fetched)
  const stateCountsPromise = includeStateCounts
    ? supabase.rpc('radius_state_counts', {
        p_lat: lat,
        p_lon: lon,
        p_radius_miles: radiusMi,
        p_search: search.trim(),
        p_state: stateParam,
        p_gender: genderParam,
        p_favorite: favoriteParam === 'true' ? true : null,
        p_filters: parsedFilters,
      })
    : Promise.resolve({ data: null, error: null })

  const facilitiesPromise = includeFacilities
    ? supabase.rpc('radius_facilities', {
        p_lat: lat,
        p_lon: lon,
        p_radius_miles: radiusMi,
        p_search: search.trim(),
        p_state: stateParam,
        p_gender: genderParam,
        p_favorite: favoriteParam === 'true' ? true : null,
        p_filters: parsedFilters,
      })
    : Promise.resolve({ data: null, error: null })

  const [stateResult, facilitiesResult] = await Promise.all([
    stateCountsPromise, facilitiesPromise,
  ])

  const stateCounts = stateResult.data
    ? (stateResult.data as any[])
        .filter((r: any) => r.facility_state)
        .sort((a: any, b: any) => Number(b.lead_count) - Number(a.lead_count))
    : undefined

  if (facilitiesResult.error) {
    console.error('[API /leads/radius] radius_facilities error:', facilitiesResult.error.message)
  }

  const facilities = facilitiesResult.data
    ? (facilitiesResult.data as any[]).map((f: any) => ({
        facility_name:    f.facility_name,
        facility_address: f.facility_address,
        facility_city:    f.facility_city,
        facility_state:   f.facility_state,
        lat:              f.lat,
        lon:              f.lon,
        lead_count:       Number(f.lead_count),
        distance_miles:   parseFloat(Number(f.distance_miles).toFixed(1)),
      }))
    : undefined

  return NextResponse.json({
    mode: 'include',
    data: leads,
    total,
    page,
    pageSize,
    center: { lat, lon },
    radius: radiusMi,
    ...(stateCounts ? { stateCounts } : {}),
    ...(facilities ? { facilities } : {}),
  })
}
