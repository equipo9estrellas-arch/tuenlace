import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { and, eq, gt } from 'drizzle-orm'
import { adminLog, db, sessions, users } from '@/db'
import { env } from './env'
import { obtenerSesion, sidDe, type Sesion } from './session'

/**
 * SUPERADMINS
 *
 * Quién lo es lo decide una variable de entorno (SUPERADMINS, correos
 * separados por comas), no una columna: así nadie se hace superadmin desde
 * la web aunque encuentre un fallo en el panel, y quitarle el acceso a
 * alguien es cambiar la variable y redesplegar.
 *
 * Para todo lo demás, /admin no existe: quien no es superadmin recibe un 404,
 * no un "no tienes permiso" que confirme que ahí hay algo.
 */

export function correosSuperadmin(): Set<string> {
  return new Set(
    (process.env.SUPERADMINS ?? '')
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function esSuperadmin(email: string | null | undefined): boolean {
  return Boolean(email) && correosSuperadmin().has(email!.toLowerCase())
}

/**
 * Exige superadmin o devuelve 404. Una sesión de "entrar como" NUNCA es
 * superadmin, aunque la cuenta suplantada lo fuera: dentro de una cuenta
 * ajena solo se ve esa cuenta.
 */
export async function exigirSuperadmin(): Promise<Sesion> {
  const sesion = await obtenerSesion()
  if (!sesion || sesion.suplantadoPor || !esSuperadmin(sesion.email)) notFound()
  return sesion
}

/**
 * Quién hace una acción de superadmin. Desde /admin es un usuario de
 * TUENLACE (userId); desde Gestiona-lo es un usuario de la central, que no
 * existe aquí: userId null y origen 'gestiona-lo'.
 */
export type Actor = { userId: string | null; email: string; origen?: 'tuenlace' | 'gestiona-lo' }

/** Deja constancia de una acción. Todo lo que cambia algo pasa por aquí. */
export async function registrar(
  actor: Actor,
  accion: string,
  objetivo: string,
  detalle?: Record<string, unknown>,
): Promise<void> {
  await db.insert(adminLog).values({
    adminId: actor.userId,
    adminEmail: actor.email,
    accion,
    objetivo,
    detalle: { ...(detalle ?? {}), ...(actor.origen === 'gestiona-lo' ? { desde: 'Gestiona-lo' } : {}) },
  })
}

// ── Entrar como ──────────────────────────────────────────────────────────────
//
// Para soporte: ver el panel exactamente como lo ve el cliente. Mientras
// dura, la sesión del superadmin se guarda aparte (cookie te_admin) y el
// panel enseña una franja roja con «Volver a mi cuenta». La sesión suplantada
// caduca sola a las 2 horas.

export const COOKIE_ADMIN = 'te_admin'
export const DURACION_SUPLANTACION_MS = 2 * 60 * 60 * 1000

export async function guardarSesionAdmin(jwt: string, expiraEn: Date): Promise<void> {
  const store = await cookies()
  store.set(COOKIE_ADMIN, jwt, {
    httpOnly: true,
    secure: env.esProduccion,
    sameSite: 'lax',
    path: '/',
    expires: expiraEn,
  })
}

/**
 * La sesión de superadmin guardada al entrar como otro, si sigue valiendo:
 * la fila existe, no ha caducado y su usuario sigue en SUPERADMINS.
 */
export async function sesionAdminGuardada(): Promise<{
  jwt: string
  userId: string
  email: string
  expiraEn: Date
} | null> {
  const store = await cookies()
  const jwt = store.get(COOKIE_ADMIN)?.value
  const sid = await sidDe(jwt)
  if (!jwt || !sid) return null
  const [fila] = await db
    .select({ userId: users.id, email: users.email, suplantadoPor: sessions.suplantadoPor, expiraEn: sessions.expiraEn })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sid), gt(sessions.expiraEn, new Date())))
    .limit(1)
  if (!fila || fila.suplantadoPor || !esSuperadmin(fila.email)) return null
  return { jwt, userId: fila.userId, email: fila.email, expiraEn: fila.expiraEn }
}

export async function borrarCookieAdmin(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_ADMIN)
}
