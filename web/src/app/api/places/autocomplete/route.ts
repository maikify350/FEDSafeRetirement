import { NextResponse } from 'next/server'

/**
 * GET /api/places/autocomplete?input=123+Main+St
 *
 * Server-side proxy for Google Places Autocomplete.
 * Bypasses all HTTP referrer restrictions on the API key
 * since the request originates from the server, not the browser.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const input = searchParams.get('input')?.trim()

  if (!input || input.length < 3) {
    return NextResponse.json({ predictions: [] })
  }

  const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 })
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    url.searchParams.set('input', input)
    url.searchParams.set('types', 'address')
    url.searchParams.set('language', 'en')
    url.searchParams.set('key', apiKey)

    const res = await fetch(url.toString())
    const data = await res.json()

    return NextResponse.json({ predictions: data.predictions ?? [] })
  } catch (err) {
    console.error('[places/autocomplete] Error:', err)
    return NextResponse.json({ predictions: [] }, { status: 500 })
  }
}
