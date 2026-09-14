import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { and, eq, gt } from 'drizzle-orm'
import { db, memberships, organizations, sessions, users } from '@/db'
import { env } from './env'

const COOKIE = 'te_sesion'
const DURACION_DIAS = 30

function secreto(): Uint8Array {
  return new TextEncoder().encode(env.authSecret)
}

export type Sesion = {
  sessionId: string
  userId: string
  email: string
  nombre: string | null
  orgId: string
  orgNombre: string
  orgTipo: 'PERSONAL' | 'AGENCIA'
  plan: 'GRATIS' | 'ESENCIAL' | 'NEGOCIO' | 'AGENCIA'
  rol: 'PROPIETARIO' | 'ADMIN' | 'EDITOR' | 'CLIENTE'
}

/** Crea la fila de sesión y deja la cookie firmada. */
export async function iniciarSesion(userId: string): Promise<void> {
  const expiraEn = new Date(Date.now() + DURACION_DIAS * 24 * 60 * 60 * 1000)

  const [fila] = await db.insert(sessions).values({ userId, expiraEn }).returning({ id: sessions.id })

  const jwt = await new SignJWT({ sid: fila.id, uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiraEn)
    .sign(secreto())

  const store = await cookies()
  store.set(COOKIE, jwt, {
    httpOnly: true,
    secure: env.esProduccion,
    sameSite: 'lax',
    path: '/',
    expires: expiraEn,
  })
}

export async function cerrarSesion(): Promise<void> {
  const store = await cookies()
  const jwt = store.get(COOKIE)?.value
  if (jwt) {
    try {
      const { payload } = await jwtVerify(jwt, secreto())
      await db.delete(sessions).where(eq(sessions.id, payload.sid as string))
    } catch {
      // Cookie inválida: da igual, la borramos de todas formas.
    }
  }
  store.delete(COOKIE)
}

/**
 * Devuelve la sesión actual o null. Verifica la cookie Y la fila en base de
 * datos: así una sesión revocada deja de funcionar de inmediato, cosa que un
 * JWT sin estado no permite.
 */
export async function obtenerSesion(): Promise<Sesion | null> {
  const store = await cookies()
  const jwt = store.get(COOKIE)?.value
  if (!jwt) return null

  let sid: string
  try {
    const { payload } = await jwtVerify(jwt, secreto())
    sid = payload.sid as string
  } catch {
    return null
  }

  const filas = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      email: users.email,
      nombre: users.nombre,
      orgId: organizations.id,
      orgNombre: organizations.nombre,
      orgTipo: organizations.tipo,
      plan: organizations.plan,
      rol: memberships.rol,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(memberships, eq(memberships.userId, users.id))
    .innerJoin(organizations, eq(organizations.id, memberships.orgId))
    .where(and(eq(sessions.id, sid), gt(sessions.expiraEn, new Date())))
    .limit(1)

  return filas[0] ?? null
}

/** Para rutas del panel: exige sesión o lanza. El layout la convierte en redirect. */
export async function exigirSesion(): Promise<Sesion> {
  const sesion = await obtenerSesion()
  if (!sesion) throw new Error('SIN_SESION')
  return sesion
}
