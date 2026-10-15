import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'

/**
 * No existía. Sin robots.txt, /api/* queda abierto al rastreo (esas rutas no
 * tienen metadatos robots: solo los tienen las páginas), y no hay ninguna
 * directiva para los rastreadores de IA, que es justo el canal donde este
 * producto quiere aparecer.
 *
 * `src/lib/slug.ts` ya reservaba la palabra "robots" para esta ruta.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/panel/', '/panel', '/crear', '/entrar'],
      },
      // Los rastreadores de IA sí deben poder leer las páginas públicas: son
      // el canal que el producto quiere ganar. Lo privado sigue fuera.
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'OAI-SearchBot', 'Google-Extended'],
        allow: '/',
        disallow: ['/api/', '/panel/', '/panel', '/crear', '/entrar'],
      },
    ],
    sitemap: `${env.appUrl}/sitemap.xml`,
    host: env.appUrl,
  }
}
