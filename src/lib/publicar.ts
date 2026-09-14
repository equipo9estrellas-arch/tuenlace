import 'server-only'
import { eq } from 'drizzle-orm'
import { blocks, db, organizations, pages } from '@/db'
import type { AjustesPagina } from '@/db/schema'
import type { ContextoOnboarding } from './auth'
import { generarPagina } from '@/onboarding/generador'
import type { ClaveCanal, ClaveCategoria, ClaveObjetivo } from '@/onboarding/definicion'
import { slugDisponible } from './slug-db'

/**
 * Materializa el onboarding en una página real: organización, página y bloques.
 *
 * Vive aquí y no dentro de la ruta para que se pueda probar sin levantar el
 * servidor. Es el paso más crítico del producto — si esto falla, el usuario
 * verifica su correo y no encuentra nada.
 */
export async function publicarDesdeOnboarding(
  orgId: string,
  contexto: ContextoOnboarding,
): Promise<{ slug: string; pageId: string; bloques: number }> {
  // Alguien pudo coger el slug mientras el correo estaba en la bandeja.
  let slug = contexto.slug
  if (!(await slugDisponible(slug))) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`
  }

  const descripcion = contexto.datos.__descripcion ?? ''
  let botones: Record<string, string> = {}
  try {
    botones = JSON.parse(contexto.datos.__botones ?? '{}') as Record<string, string>
  } catch {
    botones = {}
  }

  const generada = generarPagina(
    {
      slug,
      categoria: contexto.categoria as ClaveCategoria,
      descripcionNegocio: contexto.descripcionNegocio,
      objetivos: contexto.objetivos as ClaveObjetivo[],
      canales: contexto.canales as ClaveCanal[],
      datos: contexto.datos,
    },
    {
      titulo: contexto.titulo,
      descripcion,
      botones: botones as Partial<Record<ClaveObjetivo, string>>,
    },
  )

  const ajustes: AjustesPagina = {
    // Indexación selectiva por calidad: una página recién creada nunca se
    // indexa. Ver blueprint bloque 3, punto 8.8.
    indexable: false,
    idioma: 'es',
    mostrarMarca: true,
  }

  const [pagina] = await db
    .insert(pages)
    .values({
      orgId,
      slug,
      estado: 'PUBLICADA',
      titulo: generada.titulo,
      descripcion: generada.descripcion,
      categoria: contexto.categoria,
      descripcionNegocio: contexto.descripcionNegocio,
      objetivos: contexto.objetivos,
      canales: contexto.canales,
      tema: generada.tema,
      ajustes,
      publicadaEn: new Date(),
    })
    .returning({ id: pages.id, slug: pages.slug })

  if (generada.bloques.length > 0) {
    await db.insert(blocks).values(
      generada.bloques.map((b) => ({
        pageId: pagina.id,
        tipo: b.tipo,
        orden: b.orden,
        prioridad: b.prioridad,
        config: b.config,
      })),
    )
  }

  await db
    .update(organizations)
    .set({ nombre: generada.titulo, actualizadoEn: new Date() })
    .where(eq(organizations.id, orgId))

  return { slug: pagina.slug, pageId: pagina.id, bloques: generada.bloques.length }
}
