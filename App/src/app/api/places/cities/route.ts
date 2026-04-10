import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/places/cities?input=Fairf&state=Virginia
 *
 * Server-side proxy for Google Places Autocomplete restricted to cities
 * within a specific US state. Returns city names only (no full address).
 *
 * Query params:
 *   input  – user-typed text (min 1 char)
 *   state  – full US state name, e.g. "Virginia" or abbreviation "VA"
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const input = searchParams.get('input')?.trim()
  const state = searchParams.get('state')?.trim()

  if (!input || input.length < 1) {
    return NextResponse.json({ predictions: [] })
  }

  const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 })
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    // Combine city input with state name so Google scopes results correctly
    const queryText = state ? `${input}, ${state}, US` : `${input}, US`
    url.searchParams.set('input', queryText)
    url.searchParams.set('types', '(cities)')
    url.searchParams.set('components', 'country:us')
    url.searchParams.set('language', 'en')
    url.searchParams.set('key', apiKey)

    const res = await fetch(url.toString())
    const data = await res.json()

    // Extract just the city name (first term of each prediction)
    const predictions: { place_id: string; description: string; city: string }[] =
      (data.predictions ?? []).map((p: { place_id: string; description: string; terms?: { value: string }[] }) => ({
        place_id: p.place_id,
        description: p.description,
        // "terms[0]" is the city name (e.g. "Fairfax" from "Fairfax, Virginia, USA")
        city: p.terms?.[0]?.value ?? p.description.split(',')[0].trim(),
      }))

    return NextResponse.json({ predictions })
  } catch (err) {
    console.error('[places/cities] Error:', err)
    return NextResponse.json({ predictions: [] }, { status: 500 })
  }
}
