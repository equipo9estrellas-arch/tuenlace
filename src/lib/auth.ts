import { and, eq, gt, isNull } from 'drizzle-orm'
import { db, loginTokens, memberships, organizations, users } from '@/db'
import { createToken, sha256 } from './ids-y-hash'
import { enviarEnlaceAcceso } from './mail'
import { env } from './env'

const MINUTOS_VALIDEZ = 30

export type ContextoOnboarding = {
  slug: string
  titulo: string
  categoria: string
  sector: string | null
  descripcionNegocio: string
  objetivos: string[]
  canales: string[]
  datos: Record<string, string>
}

/**
 * Enlace mágico. Sin contraseñas: para un producto cuyo usuario es la dueña
 * de una peluquería, una contraseña más es una barrera y un ticket de soporte.
 *
 * El token viaja por email; en base de datos solo queda su hash.
 */
export async function solicitarAcceso(
  email: string,
  contexto?: ContextoOnboarding,
): Promise<{ ok: boolean; error?: string }> {
  const normalizado = email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(normalizado)) {
    return { ok: false, error: 'Ese correo no parece válido.' }
  }

  const existentes = await db.select().from(users).where(eq(users.email, normalizado)).limit(1)
  let usuario = existentes[0]
  const esNuevo = !usuario

  if (!usuario) {
    const [creado] = await db.insert(users).values({ email: normalizado }).returning()
    usuario = creado
  }

  const token = createToken()
  await db.insert(loginTokens).values({
    tokenHash: sha256(token),
    userId: usuario.id,
    expiraEn: new Date(Date.now() + MINUTOS_VALIDEZ * 60 * 1000),
    contexto: contexto ?? null,
  })

  const url = `${env.appUrl}/entrar/verificar?token=${encodeURIComponent(token)}`
  const envio = await enviarEnlaceAcceso(normalizado, url, esNuevo)
  if (!envio.ok) return { ok: false, error: 'No hemos podido enviar el correo. Inténtalo otra vez.' }

  return { ok: true }
}

export type ResultadoVerificacion =
  | { ok: true; userId: string; contexto: ContextoOnboarding | null }
  | { ok: false; error: string }

/** Consume el token: comprueba hash, caducidad y que no se haya usado ya. */
export async function verificarToken(token: string): Promise<ResultadoVerificacion> {
  const hash = sha256(token)

  const filas = await db
    .select()
    .from(loginTokens)
    .where(
      and(
        eq(loginTokens.tokenHash, hash),
        gt(loginTokens.expiraEn, new Date()),
        isNull(loginTokens.usadoEn),
      ),
    )
    .limit(1)

  const fila = filas[0]
  if (!fila) {
    return { ok: false, error: 'Este enlace ya no es válido. Pide uno nuevo.' }
  }

  await db.update(loginTokens).set({ usadoEn: new Date() }).where(eq(loginTokens.id, fila.id))
  await db
    .update(users)
    .set({ emailVerificadoEn: new Date() })
    .where(eq(users.id, fila.userId))

  return {
    ok: true,
    userId: fila.userId,
    contexto: (fila.contexto as ContextoOnboarding | null) ?? null,
  }
}

/**
 * Toda cuenta necesita una organización. Un particular es una organización
 * de tipo PERSONAL con una sola página; no hay dos modelos.
 */
export async function asegurarOrganizacion(
  userId: string,
  nombreSugerido?: string,
): Promise<string> {
  const existentes = await db
    .select({ orgId: memberships.orgId })
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .limit(1)

  if (existentes[0]) return existentes[0].orgId

  const [org] = await db
    .insert(organizations)
    .values({ nombre: nombreSugerido?.trim() || 'Mi cuenta', tipo: 'PERSONAL', plan: 'GRATIS' })
    .returning({ id: organizations.id })

  await db.insert(memberships).values({ userId, orgId: org.id, rol: 'PROPIETARIO' })
  return org.id
}
