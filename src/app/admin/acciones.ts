'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db, sessions } from '@/db'
import {
  borrarCookieAdmin,
  exigirSuperadmin,
  guardarSesionAdmin,
  registrar,
  sesionAdminGuardada,
  type Actor,
} from '@/lib/admin'
import * as ops from '@/lib/admin-ops'
import { NOMBRE_COOKIE_SESION, cerrarSesion, obtenerSesion, ponerCookieSesion } from '@/lib/session'
import { env } from '@/lib/env'

/**
 * Las acciones de /admin. Cada una vuelve a comprobar que quien llama es
 * superadmin (una acción de servidor se puede invocar a mano, sin pasar por
 * la página). El cambio en sí lo hace lib/admin-ops.ts, el mismo que usa la
 * API de Gestiona-lo, y queda en admin_log.
 */

async function actor(): Promise<Actor> {
  const s = await exigirSuperadmin()
  return { userId: s.userId, email: s.email, origen: 'tuenlace' }
}

function texto(fd: FormData, clave: string): string {
  const v = fd.get(clave)
  return typeof v === 'string' ? v : ''
}

function refrescarCuenta(orgId?: string | null) {
  revalidatePath('/admin')
  revalidatePath('/admin/cuentas')
  revalidatePath('/admin/paginas')
  revalidatePath('/admin/denuncias')
  if (orgId) revalidatePath(`/admin/cuentas/${orgId}`)
}

// ── Cuentas ──────────────────────────────────────────────────────────────────

export async function cambiarPlan(orgId: string, fd: FormData) {
  await ops.cambiarPlan(await actor(), orgId, texto(fd, 'plan'))
  refrescarCuenta(orgId)
}

export async function fijarPrueba(orgId: string, fd: FormData) {
  await ops.fijarPrueba(await actor(), orgId, texto(fd, 'dias'))
  refrescarCuenta(orgId)
}

export async function renombrarCuenta(orgId: string, fd: FormData) {
  await ops.renombrarCuenta(await actor(), orgId, texto(fd, 'nombre'))
  refrescarCuenta(orgId)
}

export async function borrarCuenta(orgId: string, fd: FormData) {
  const r = await ops.borrarCuenta(await actor(), orgId, texto(fd, 'confirmacion'))
  if (!r.ok) {
    const error = r.error.includes('superadmin') ? 'propia' : r.codigo === 404 ? 'no-existe' : 'confirmacion'
    redirect(`/admin/cuentas/${orgId}?error=${error}`)
  }
  revalidatePath('/admin')
  redirect('/admin/cuentas?borrada=1')
}

// ── Usuarios ─────────────────────────────────────────────────────────────────

export async function cambiarEmail(orgId: string, userId: string, fd: FormData) {
  const r = await ops.cambiarEmail(await actor(), userId, texto(fd, 'email'))
  if (!r.ok) redirect(`/admin/cuentas/${orgId}?error=${r.error.includes('otra cuenta') ? 'email-ocupado' : 'email'}`)
  refrescarCuenta(orgId)
}

export async function cerrarSesionesDe(orgId: string, userId: string) {
  await ops.cerrarSesionesDe(await actor(), userId)
  refrescarCuenta(orgId)
}

/**
 * Entra en el panel como este usuario, para soporte. La sesión propia se
 * guarda aparte y se recupera con «Volver a mi cuenta».
 */
export async function entrarComo(userId: string) {
  const admin = await exigirSuperadmin()
  const store = await cookies()
  const jwtAdmin = store.get(NOMBRE_COOKIE_SESION)?.value
  const [propia] = await db
    .select({ expiraEn: sessions.expiraEn })
    .from(sessions)
    .where(eq(sessions.id, admin.sessionId))
    .limit(1)
  if (!jwtAdmin || !propia) return

  const r = await ops.abrirSesionComo({ userId: admin.userId, email: admin.email, origen: 'tuenlace' }, userId)
  if (!r.ok || !r.datos) return
  await guardarSesionAdmin(jwtAdmin, propia.expiraEn)
  await ponerCookieSesion(r.datos.jwt, r.datos.expiraEn)
  redirect('/panel')
}

/**
 * Sale de la cuenta suplantada. Desde /admin recupera la sesión de
 * superadmin; desde Gestiona-lo cierra y vuelve a la central.
 */
export async function volverAMiCuenta() {
  const actual = await obtenerSesion()
  const guardada = await sesionAdminGuardada()

  // La sesión suplantada se borra siempre: no se queda viva por ahí.
  if (actual?.suplantadoPor) {
    await db.delete(sessions).where(eq(sessions.id, actual.sessionId))
  }

  if (actual?.suplantadoDesdeCentral) {
    await registrar(
      { userId: null, email: actual.suplantadoPor ?? 'desconocido', origen: 'gestiona-lo' },
      'salir_de_cuenta',
      `usuario:${actual.userId}`,
      { email: actual.email },
    )
    const store = await cookies()
    store.delete(NOMBRE_COOKIE_SESION)
    redirect(env.gestionaloUrl ?? '/')
  }

  if (!guardada) {
    await borrarCookieAdmin()
    await cerrarSesion()
    redirect('/entrar')
  }

  await ponerCookieSesion(guardada.jwt, guardada.expiraEn)
  await borrarCookieAdmin()
  if (actual?.suplantadoPor) {
    await registrar(guardada, 'salir_de_cuenta', `usuario:${actual.userId}`, { email: actual.email })
  }
  redirect(actual ? `/admin/cuentas/${actual.orgId}` : '/admin')
}

// ── Páginas ──────────────────────────────────────────────────────────────────

export async function suspenderPagina(pageId: string, fd: FormData) {
  const r = await ops.suspenderPagina(await actor(), pageId, texto(fd, 'motivo'))
  refrescarCuenta(r.ok ? r.datos?.orgId : null)
}

export async function restaurarPagina(pageId: string) {
  const r = await ops.restaurarPagina(await actor(), pageId)
  refrescarCuenta(r.ok ? r.datos?.orgId : null)
}

// ── Denuncias ────────────────────────────────────────────────────────────────

export async function resolverDenuncia(reportId: string, fd: FormData) {
  const r = await ops.resolverDenuncia(await actor(), reportId, texto(fd, 'decision'), texto(fd, 'nota'))
  refrescarCuenta(r.ok ? r.datos?.orgId : null)
}
