import { NextResponse } from 'next/server'

/**
 * GET /api/places/details?placeId=...
 *
 * Server-side proxy for Google Places Details.
 * Returns parsed address_components for a given place_id.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const placeId = searchParams.get('placeId')?.trim()

  if (!placeId) {
    return NextResponse.json({ error: 'placeId is required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 })
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    url.searchParams.set('place_id', placeId)
    url.searchParams.set('fields', 'address_components')
    url.searchParams.set('language', 'en')
    url.searchParams.set('key', apiKey)

    const res = await fetch(url.toString())
    const data = await res.json()

    if (!data.result?.address_components) {
      return NextResponse.json({ error: 'No address components' }, { status: 404 })
    }

    const components = data.result.address_components as Array<{ types: string[]; short_name: string; long_name: string }>
    let streetNumber = ''
    let route = ''
    let city = ''
    let state = ''
    let zipCode = ''
    let country = ''

    for (const c of components) {
      const hasType = (t: string) => c.types.includes(t)
      if (hasType('street_number'))              streetNumber = c.long_name
      else if (hasType('route'))                 route = c.long_name
      else if (hasType('locality'))              city = c.long_name
      else if (hasType('sublocality') && !city)  city = c.long_name
      else if (hasType('administrative_area_level_1')) state = c.short_name
      else if (hasType('postal_code'))           zipCode = c.long_name
      else if (hasType('country'))               country = c.short_name
    }

    return NextResponse.json({
      street:  [streetNumber, route].filter(Boolean).join(' '),
      street2: '',
      city,
      state,
      zipCode,
      country,
    })
  } catch (err) {
    console.error('[places/details] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch place details' }, { status: 500 })
  }
}
