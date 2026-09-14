import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,

  // Las páginas públicas se sirven cacheadas desde Cloudflare. Estas cabeceras
  // son la base; la purga por etiqueta se hace desde lib/cache.ts al publicar.
  async headers() {
    return [
      {
        source: '/:slug',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
}

export default config
