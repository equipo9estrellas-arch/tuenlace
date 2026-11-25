'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { citas, db, pages } from '@/db'
import { exigirSesion } from '@/lib/session'

/** Cancela una cita: libera la hora en el calendario. El contacto se queda. */
export async function cancelarCita(citaId: string) {
  const sesion = await exigirSesion()
  const [fila] = await db
    .select({ id: citas.id })
    .from(citas)
    .innerJoin(pages, eq(pages.id, citas.pageId))
    .where(and(eq(citas.id, citaId), eq(pages.orgId, sesion.orgId)))
    .limit(1)
  if (!fila) return
  await db.update(citas).set({ estado: 'CANCELADA' }).where(eq(citas.id, fila.id))
  revalidatePath('/panel')
}
