import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH,
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: true,
        locale: false
      }
    ]
  },

  // API routes serve live, mutable data (leads, radius/exclusion results,
  // exports). Never let the browser, a proxy, or Vercel's CDN cache them —
  // a stale cached response once made an exclusion export show leads that
  // had already been re-geocoded out of range.
  headers: async () => {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' }
        ]
      }
    ]
  }
}

export default nextConfig
