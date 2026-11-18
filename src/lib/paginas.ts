import 'server-only'
import { cookies } from 'next/headers'
import { and, asc, eq } from 'drizzle-orm'
import { db, organizations, pages } from '@/db'
import { env } from './env'
import { limitesDe, planEfectivo } from './planes'

/**
 * VARIAS PÁGINAS POR CUENTA (plan Agencia)
 *
 * Una cuenta puede tener tantas páginas como diga su plan (Esencial 1,
 * Agencia 25). El panel trabaja siempre sobre UNA, la «página activa», que se
 * recuerda en una cookie. Inicio, editor, contactos y pipeline enseñan los
 * datos de esa página; el selector del menú lateral la cambia.
 *
 * Orden: de la más antigua a la más nueva. La más antigua es la principal y
 * la que se queda publicada si la cuenta baja a un plan con menos páginas.
 */

export const COOKIE_PAGINA = 'te_pagina'

export type PaginaResumen = {
  id: string
  slug: string
  titulo: string
  estado: 'BORRADOR' | 'PUBLICADA' | 'SUSPENDIDA'
  creadoEn: Date
}

export async function paginasDe(orgId: string): Promise<PaginaResumen[]> {
  return db
    .select({ id: pages.id, slug: pages.slug, titulo: pages.titulo, estado: pages.estado, creadoEn: pages.creadoEn })
    .from(pages)
    .where(eq(pages.orgId, orgId))
    .orderBy(asc(pages.creadoEn), asc(pages.id))
}

/** La página con la que trabaja el panel ahora mismo, y todas las de la cuenta. */
export async function paginaActiva(orgId: string): Promise<{ activa: PaginaResumen | null; todas: PaginaResumen[] }> {
  const todas = await paginasDe(orgId)
  const store = await cookies()
  const elegida = store.get(COOKIE_PAGINA)?.value
  return { activa: todas.find((p) => p.id === elegida) ?? todas[0] ?? null, todas }
}

/** Fija la página activa, solo si es de esta cuenta. */
export async function fijarPaginaActiva(orgId: string, pageId: string): Promise<boolean> {
  const [p] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.orgId, orgId)))
    .limit(1)
  if (!p) return false
  const store = await cookies()
  store.set(COOKIE_PAGINA, p.id, {
    httpOnly: true,
    secure: env.esProduccion,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return true
}

/**
 * ¿Cabe esta página en el plan de su cuenta? Las que pasan del límite (una
 * agencia que baja a Esencial) dejan de publicarse, empezando por las más
 * nuevas. No se borra nada: vuelven al subir de plan.
 */
export async function dentroDelPlan(orgId: string, pageId: string, limite: number): Promise<boolean> {
  const orden = await db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.orgId, orgId))
    .orderBy(asc(pages.creadoEn), asc(pages.id))
    .limit(limite)
  return orden.some((p) => p.id === pageId)
}

/** Cuántas páginas más puede crear la cuenta con su plan de hoy. */
export async function huecosDePaginas(orgId: string): Promise<{ usadas: number; limite: number }> {
  const [org] = await db
    .select({ plan: organizations.plan, pruebaHasta: organizations.pruebaHasta })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
  const limite = org ? limitesDe(planEfectivo(org.plan, org.pruebaHasta)).paginas : 0
  const usadas = (await paginasDe(orgId)).length
  return { usadas, limite }
}
