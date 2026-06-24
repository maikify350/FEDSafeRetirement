import type { NextRequest } from 'next/server'

import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (svg, png, jpg, etc.)
     * - api/proxy/* (public API routes — must return JSON without auth)
     * - static .html pages (e.g. /ACT_PRIVACY_POLICY.html — must be public)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/proxy|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)',
  ],
}
