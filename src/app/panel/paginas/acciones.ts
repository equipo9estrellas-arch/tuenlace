'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { db, pages } from '@/db'
import { exigirSesion } from '@/lib/session'
import { COOKIE_PAGINA, fijarPaginaActiva, paginasDe } from '@/lib/paginas'

const DESTINOS = new Set(['/panel', '/panel/editor', '/panel/contactos', '/panel/pipeline', '/panel/paginas'])

/** Cambia la página con la que trabaja el panel. */
export async function elegirPagina(pageId: string, destino: string) {
  const sesion = await exigirSesion()
  await fijarPaginaActiva(sesion.orgId, pageId)
  revalidatePath('/panel', 'layout')
  redirect(DESTINOS.has(destino) ? destino : '/panel')
}

/**
 * Borra una página de la cuenta con todo lo suyo (bloques, contactos,
 * estadísticas). Pide escribir su dirección. La última no se borra: una
 * cuenta sin página no sirve para nada.
 */
export async function borrarPagina(pageId: string, fd: FormData) {
  const sesion = await exigirSesion()
  const todas = await paginasDe(sesion.orgId)
  const pagina = todas.find((p) => p.id === pageId)
  if (!pagina) redirect('/panel/paginas')
  if (todas.length <= 1) redirect('/panel/paginas?error=ultima')
  const confirmacion = String(fd.get('confirmacion') ?? '').trim().toLowerCase().replace(/^\//, '')
  if (confirmacion !== pagina.slug) redirect(`/panel/paginas?error=confirmacion&p=${pageId}`)

  await db.delete(pages).where(and(eq(pages.id, pageId), eq(pages.orgId, sesion.orgId)))
  const store = await cookies()
  if (store.get(COOKIE_PAGINA)?.value === pageId) store.delete(COOKIE_PAGINA)
  revalidatePath('/panel', 'layout')
  redirect('/panel/paginas?borrada=1')
}
