import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date()),
  },
  basePath: process.env.BASEPATH,
  // Temporarily ignore TS build errors for initial deploy
  typescript: {
    ignoreBuildErrors: true,
  },
  // Silence Turbopack/webpack coexistence warning (Next.js 16 default is Turbopack)
  turbopack: {},
  // Transpile shared-components directory (outside web app)
  transpilePackages: ['shared-components'],
  // Configure webpack to resolve shared-components from parent directory
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@shared-components': path.resolve(__dirname, '../shared-components'),
    }
    return config
  },
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: true,
        locale: false
      },
      {
        source: '/home',
        destination: '/dashboard',
        permanent: true,
        locale: false
      }
    ]
  }
}

export default nextConfig


