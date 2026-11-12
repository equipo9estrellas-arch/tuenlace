import type { NextConfig } from 'next'
import { CSP } from './src/lib/csp'
import { CSP_LEGADO, PAGINAS_LEGADO } from './src/lib/legado'

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

  // Las tres páginas heredadas del cPanel. `beforeFiles` las resuelve ANTES
  // de la ruta [slug], que es justo lo que hace falta: con afterFiles,
  // notFound() de [slug] gana y la URL sigue dando 404.
  //
  // El 308 de /slug/ a /slug lo pone Next solo (trailingSlash: false), así que
  // los enlaces antiguos con barra final siguen llegando aquí.
  async rewrites() {
    return {
      beforeFiles: PAGINAS_LEGADO.map((slug) => ({
        source: `/${slug}`,
        destination: `/legado/${slug}.html`,
      })),
      afterFiles: [],
      fallback: [],
    }
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
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ],
      },
      // La CSP, solo en la raíz y en las rutas de dos o más segmentos. Las de
      // uno (/<slug>, /panel, /crear...) la reciben del middleware, que es el
      // único que sabe si /<slug> es una página del cPanel y necesita otra.
      // Ver src/lib/csp.ts.
      { source: '/', headers: [{ key: 'Content-Security-Policy', value: CSP }] },
      {
        // Menos /api/cpanel/*: el middleware reescribe ahí las páginas del
        // cPanel, y next.config aplica sus cabeceras también a la ruta
        // reescrita. Sin esta excepción la CSP del producto las rompería.
        source: '/:primero((?!api/cpanel/)[^/]+)/:resto+',
        headers: [{ key: 'Content-Security-Policy', value: CSP }],
      },
      {
        // El panel nunca debe aparecer dentro de un iframe ajeno, ni siquiera
        // propio: el botón de salir y el editor son objetivo de clickjacking.
        source: '/panel/:ruta*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
      // Las páginas heredadas cargan cosas de fuera (Google Fonts, el iframe
      // del formulario) que la CSP del producto bloquea. Cada una declara
      // SOLO lo suyo; ninguna de estas excepciones toca al resto del dominio.
      //
      // Estas entradas van DESPUÉS de la de '/(.*)': en Next la última
      // cabecera con la misma clave es la que se envía, así que aquí se
      // sustituye la Content-Security-Policy general por la de la página.
      ...PAGINAS_LEGADO.map((slug) => ({
        source: `/${slug}`,
        headers: [{ key: 'Content-Security-Policy', value: CSP_LEGADO[slug] }],
      })),
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
