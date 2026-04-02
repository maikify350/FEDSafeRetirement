/**
 * Public Booking Page — Server Component
 *
 * Fetches company info, service items, and states via SSR,
 * then renders the client-side BookingForm component.
 *
 * URL: /booking/{subscriberId}
 */
import type { Metadata } from 'next'

import BookingPageClient from '@/views/booking/BookingPageClient'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

// Use the shared type from BookingPageClient
type BookingConfig = import('@/views/booking/BookingPageClient').BookingConfig

async function fetchBookingConfig(subscriberId: string): Promise<BookingConfig | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/public/booking-config/${subscriberId}`, {
      cache: 'no-store', // Always fetch fresh config — services/settings change frequently
    })

    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subscriberId: string }>
}): Promise<Metadata> {
  const { subscriberId } = await params
  const config = await fetchBookingConfig(subscriberId)

  if (!config) {
    return { title: 'Booking Page Not Available' }
  }

  const pageTitle = config.bookingConfig?.pageTitle || 'Request Service'

  return {
    title: `${pageTitle} — ${config.company.name}`,
    description: `Submit a service request to ${config.company.name}. Fast, easy online booking.`,
  }
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ subscriberId: string }>
}) {
  const { subscriberId } = await params
  const config = await fetchBookingConfig(subscriberId)

  if (!config) {
    return (
      <div className='w-full max-w-lg mx-auto mt-20 text-center'>
        <div className='bg-white rounded-2xl shadow-lg p-10'>
          <div className='text-6xl mb-4'>🔍</div>
          <h1 className='text-2xl font-bold text-gray-800 mb-2'>Page Not Available</h1>
          <p className='text-gray-500'>
            This booking page is not available. Please check the URL and try again.
          </p>
        </div>
      </div>
    )
  }

  return <BookingPageClient config={config} subscriberId={subscriberId} />
}
