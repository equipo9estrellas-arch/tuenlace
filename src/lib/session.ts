import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { and, eq, gt } from 'drizzle-orm'
import { db, memberships, organizations, sessions, users } from '@/db'
import { env } from './env'
import { diasDePrueba, esDePago, planEfectivo } from './planes'

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
  /**
   * El plan con el que funciona la cuenta AHORA (ver planEfectivo): en
   * prueba es 'ESENCIAL'; sin plan y con la prueba acabada, 'GRATIS'.
   * Es el que deciden todas las puertas.
   */
  plan: 'GRATIS' | 'ESENCIAL' | 'NEGOCIO' | 'AGENCIA'
  /** Lo que tiene contratado de verdad (organizations.plan). */
  planContratado: 'GRATIS' | 'ESENCIAL' | 'NEGOCIO' | 'AGENCIA'
  pruebaHasta: Date | null
  /** Sin plan de pago y con días de prueba por delante. */
  enPrueba: boolean
  diasPrueba: number
  /** Sin plan de pago y sin prueba: su página no se publica. */
  sinPlan: boolean
  rol: 'PROPIETARIO' | 'ADMIN' | 'EDITOR' | 'CLIENTE'
  /** Si un superadmin está viendo la cuenta, su id de usuario. */
  suplantadoPor: string | null
}

/**
 * Crea la fila de sesión y devuelve su JWT firmado, sin tocar cookies. La usa
 * iniciarSesion y el "entrar como" del superadmin.
 */
export async function crearSesion(
  userId: string,
  opciones: { duracionMs?: number; suplantadoPor?: string } = {},
): Promise<{ jwt: string; expiraEn: Date; id: string }> {
  const expiraEn = new Date(Date.now() + (opciones.duracionMs ?? DURACION_DIAS * 24 * 60 * 60 * 1000))
  const [fila] = await db
    .insert(sessions)
    .values({ userId, expiraEn, suplantadoPor: opciones.suplantadoPor ?? null })
    .returning({ id: sessions.id })

  const jwt = await new SignJWT({ sid: fila.id, uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiraEn)
    .sign(secreto())
  return { jwt, expiraEn, id: fila.id }
}

/** Pone la cookie de sesión. */
export async function ponerCookieSesion(jwt: string, expiraEn: Date): Promise<void> {
  const store = await cookies()
  store.set(COOKIE, jwt, {
    httpOnly: true,
    secure: env.esProduccion,
    sameSite: 'lax',
    path: '/',
    expires: expiraEn,
  })
}

/** Lee un JWT de sesión y devuelve el id de su fila, o null si no vale. */
export async function sidDe(jwt: string | undefined): Promise<string | null> {
  if (!jwt) return null
  try {
    const { payload } = await jwtVerify(jwt, secreto())
    return typeof payload.sid === 'string' ? payload.sid : null
  } catch {
    return null
  }
}

export const NOMBRE_COOKIE_SESION = COOKIE

/** Crea la fila de sesión y deja la cookie firmada. */
export async function iniciarSesion(userId: string): Promise<void> {
  const { jwt, expiraEn } = await crearSesion(userId)

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
      planContratado: organizations.plan,
      pruebaHasta: organizations.pruebaHasta,
      rol: memberships.rol,
      suplantadoPor: sessions.suplantadoPor,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(memberships, eq(memberships.userId, users.id))
    .innerJoin(organizations, eq(organizations.id, memberships.orgId))
    .where(and(eq(sessions.id, sid), gt(sessions.expiraEn, new Date())))
    .limit(1)

  const f = filas[0]
  if (!f) return null
  const plan = planEfectivo(f.planContratado, f.pruebaHasta)
  const dePago = esDePago(f.planContratado)
  return {
    ...f,
    plan,
    enPrueba: !dePago && plan !== 'GRATIS',
    diasPrueba: dePago ? 0 : diasDePrueba(f.pruebaHasta),
    sinPlan: plan === 'GRATIS',
  }
}

/** Para rutas del panel: exige sesión o lanza. El layout la convierte en redirect. */
export async function exigirSesion(): Promise<Sesion> {
  const sesion = await obtenerSesion()
  if (!sesion) throw new Error('SIN_SESION')
  return sesion
}
