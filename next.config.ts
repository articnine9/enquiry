import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },

  webpack(config, { isServer }) {
    if (!isServer) {
      // Prevent Node.js-only modules from being bundled into the client bundle
      config.resolve = config.resolve ?? {}
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Node built-ins that server-only packages reference
        fs:             false,
        net:            false,
        tls:            false,
        crypto:         false,
        os:             false,
        path:           false,
        stream:         false,
        http:           false,
        https:          false,
        zlib:           false,
        'diagnostics_channel': false,
        'node:diagnostics_channel': false,
      }
    }

    // Allow Webpack to resolve node: URI scheme (used by Node 18+ built-ins)
    config.externals = config.externals ?? []
    if (isServer) {
      const existing = Array.isArray(config.externals) ? config.externals : [config.externals]
      config.externals = [
        ...existing,
        // Mark node: prefixed built-ins as external (resolved by Node at runtime)
        ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
          if (request?.startsWith('node:')) {
            return callback(null, `commonjs ${request}`)
          }
          callback()
        },
      ]
    }

    return config
  },
}

export default nextConfig
