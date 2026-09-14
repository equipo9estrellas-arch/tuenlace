import 'server-only'
import { eq } from 'drizzle-orm'
import { db, pages } from '@/db'
import { candidatosSlug, validarSlug } from './slug'

export async function slugDisponible(slug: string): Promise<boolean> {
  const existente = await db.select({ id: pages.id }).from(pages).where(eq(pages.slug, slug)).limit(1)
  return existente.length === 0
}

/** Sugerencias cuando el slug está ocupado. Nunca dejar al usuario en un muro. */
export async function sugerirSlugs(base: string, cuantas = 3): Promise<string[]> {
  const libres: string[] = []
  for (const candidato of candidatosSlug(base)) {
    if (libres.length >= cuantas) break
    const r = validarSlug(candidato)
    if (!r.valido) continue
    if (await slugDisponible(r.slug)) libres.push(r.slug)
  }
  return libres
}
