import type { MetadataRoute } from 'next'
import { eq, sql } from 'drizzle-orm'
import { db, pages } from '@/db'
import { env } from '@/lib/env'

// Se genera al pedirlo, no en el build: durante `next build` no hay base de
// datos y recoger estos datos ahí tumbaba el despliegue entero.
export const dynamic = 'force-dynamic'
export const revalidate = 3600

/**
 * Solo entran aquí las páginas de cliente marcadas como indexables.
 *
 * Es la otra mitad de la indexación selectiva por calidad: 40.000 páginas de
 * contenido fino en Google dañan la reputación del dominio entero, incluida la
 * web comercial. Mientras `ajustes.indexable` siga sin interfaz que lo active,
 * esta consulta devuelve cero filas y el sitemap solo lista la web comercial,
 * que es exactamente lo correcto.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const comerciales: MetadataRoute.Sitemap = [
    { url: `${env.appUrl}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${env.appUrl}/agencias`, changeFrequency: 'monthly', priority: 0.7 },
  ]

  try {
    const publicas = await db
      .select({ slug: pages.slug, actualizadoEn: pages.actualizadoEn })
      .from(pages)
      .where(
        sql`${pages.estado} = 'PUBLICADA' AND coalesce((${pages.ajustes} ->> 'indexable')::boolean, false) = true`,
      )
      .limit(50_000)

    return [
      ...comerciales,
      ...publicas.map((p) => ({
        url: `${env.appUrl}/${p.slug}`,
        lastModified: p.actualizadoEn ?? undefined,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      })),
    ]
  } catch (error) {
    // Un sitemap incompleto es mucho mejor que un 500 en /sitemap.xml.
    console.error('[sitemap] No se pudieron cargar las páginas:', error)
    return comerciales
  }
}
