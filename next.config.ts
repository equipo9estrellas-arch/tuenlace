import type { NextConfig } from 'next'

/**
 * Política de seguridad de contenidos.
 *
 * `unsafe-inline` en style es inevitable: el tema de cada página se inyecta
 * como variables CSS en el atributo style del <main>. En script hace falta por
 * el JSON-LD; el día que se quite ese bloque, se quita de aquí.
 *
 * img-src admite https: entero a propósito: el editor permite pegar la URL de
 * una imagen alojada en cualquier sitio, que es justo lo que hace un cliente
 * que ya tiene su logo en su web.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self' https://api.leadconnectorhq.com",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ')

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

  async headers() {
    return [
      {
        // Antes esto cubría solo '/:slug', que es UN segmento de ruta: el
        // panel, /entrar/verificar y todo /api quedaban sin ninguna de las
        // tres cabeceras. El panel era enmarcable.
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ],
      },
      {
        // El panel nunca debe aparecer dentro de un iframe ajeno, ni siquiera
        // propio: el botón de salir y el editor son objetivo de clickjacking.
        source: '/panel/:ruta*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
    ]
  },

  images: {
    // next/image no se usa en ningún sitio del proyecto. Con el optimizador
    // activo y remotePatterns en '**', /_next/image era un proxy abierto:
    // cualquiera podía servir 50 MB de un host ajeno a costa de Railway.
    unoptimized: true,
  },
}

export default config
