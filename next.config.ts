import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,

  // www manda a tuenlace.es con un 301. Los dos hostnames apuntan al mismo
  // servicio de Railway; sin esto cada pagina viviria en dos URLs.
  async redirects() {
    return [
      {
        source: '/:ruta*',
        has: [{ type: 'host', value: 'www.tuenlace.es' }],
        destination: 'https://tuenlace.es/:ruta*',
        permanent: true,
      },
    ]
  },

  // Las paginas publicas se sirven cacheadas desde Cloudflare. Estas cabeceras
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
