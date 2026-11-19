import { DIAS_PRUEBA } from './planes'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { db, loginTokens, memberships, organizations, users } from '@/db'
import { createToken, sha256 } from './ids-y-hash'
import { enviarEnlaceAcceso, enviarEnlaceClave } from './mail'
import { HUELLA_FALSA, claveCorrecta } from './clave'
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
  /** Huella de la contraseña elegida en el alta; se guarda al confirmar el correo. */
  claveHash?: string
}

/** Lo que lleva un enlace de «crear o cambiar contraseña». */
type ContextoClave = { proposito: 'clave' }

/**
 * Enlace por correo. Desde noviembre de 2026 se entra con correo y
 * contraseña; el enlace queda para confirmar el correo al darse de alta
 * (corta el abuso: nadie publica sin un correo que sea suyo) y para crear o
 * recuperar la contraseña.
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

  const contexto = (fila.contexto as (ContextoOnboarding & Partial<ContextoClave>) | null) ?? null
  // Un enlace de contraseña no sirve para entrar sin más: se usa en
  // /entrar/nueva-clave, que lo consume al guardar la contraseña nueva.
  if (contexto?.proposito === 'clave') {
    return { ok: false, error: 'Este enlace es para crear tu contraseña.' }
  }

  await db.update(loginTokens).set({ usadoEn: new Date() }).where(eq(loginTokens.id, fila.id))
  // La contraseña del alta solo se guarda al confirmar el correo, y SOLO si la
  // cuenta no tenía ya una: si no, cualquiera podría darse de alta con el
  // correo de otro, elegir la contraseña y esperar a que el dueño pulse el
  // enlace para quedarse con su cuenta.
  const [actual] = await db.select({ claveHash: users.claveHash }).from(users).where(eq(users.id, fila.userId)).limit(1)
  await db
    .update(users)
    .set({
      emailVerificadoEn: new Date(),
      ...(contexto?.claveHash && !actual?.claveHash ? { claveHash: contexto.claveHash } : {}),
    })
    .where(eq(users.id, fila.userId))

  if (contexto) delete contexto.claveHash
  return { ok: true, userId: fila.userId, contexto }
}

// ── Contraseña ──────────────────────────────────────────────────────────────

/**
 * Entrar con correo y contraseña. El error es siempre el mismo, exista o no
 * la cuenta y tenga o no contraseña: así no sirve para averiguar quién está
 * dado de alta. Y se calcula la huella también cuando no hay cuenta, para que
 * el tiempo de respuesta no lo delate.
 */
export async function entrarConClave(email: string, clave: string): Promise<{ ok: true; userId: string } | { ok: false }> {
  const normalizado = email.trim().toLowerCase()
  const [usuario] = await db
    .select({ id: users.id, claveHash: users.claveHash })
    .from(users)
    .where(eq(users.email, normalizado))
    .limit(1)
  const correcta = await claveCorrecta(clave, usuario?.claveHash ?? HUELLA_FALSA)
  if (!usuario?.claveHash || !correcta) return { ok: false }
  return { ok: true, userId: usuario.id }
}

/**
 * Manda el enlace para crear o cambiar la contraseña. Si el correo no tiene
 * cuenta no se manda nada, pero se responde igual (no se delata).
 */
export async function solicitarCambioDeClave(email: string): Promise<{ ok: boolean }> {
  const normalizado = email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(normalizado)) return { ok: true }
  const [usuario] = await db
    .select({ id: users.id, claveHash: users.claveHash })
    .from(users)
    .where(eq(users.email, normalizado))
    .limit(1)
  if (!usuario) return { ok: true }

  const url = await crearEnlaceDeClave(usuario.id, MINUTOS_VALIDEZ)
  const envio = await enviarEnlaceClave(normalizado, url, !usuario.claveHash)
  return { ok: envio.ok }
}

/**
 * Crea un enlace de un solo uso para poner o cambiar la contraseña. Devuelve
 * la URL completa; en base de datos solo queda el hash del token.
 */
export async function crearEnlaceDeClave(userId: string, minutos: number): Promise<string> {
  const token = createToken()
  const contexto: ContextoClave = { proposito: 'clave' }
  await db.insert(loginTokens).values({
    tokenHash: sha256(token),
    userId,
    expiraEn: new Date(Date.now() + minutos * 60 * 1000),
    contexto,
  })
  return `${env.appUrl}/entrar/nueva-clave?token=${encodeURIComponent(token)}`
}

/** ¿Sigue valiendo este enlace de contraseña? No lo consume (los antivirus del correo abren los enlaces). */
export async function enlaceDeClaveValido(token: string): Promise<boolean> {
  const [fila] = await db
    .select({ contexto: loginTokens.contexto })
    .from(loginTokens)
    .where(and(eq(loginTokens.tokenHash, sha256(token)), gt(loginTokens.expiraEn, new Date()), isNull(loginTokens.usadoEn)))
    .limit(1)
  return (fila?.contexto as ContextoClave | null)?.proposito === 'clave'
}

/** Consume el enlace y guarda la contraseña. Confirma también el correo. */
export async function cambiarClaveConEnlace(token: string, claveHash: string): Promise<{ ok: true; userId: string } | { ok: false }> {
  const [fila] = await db
    .update(loginTokens)
    .set({ usadoEn: new Date() })
    .where(and(eq(loginTokens.tokenHash, sha256(token)), gt(loginTokens.expiraEn, new Date()), isNull(loginTokens.usadoEn)))
    .returning({ userId: loginTokens.userId, contexto: loginTokens.contexto })
  if (!fila || (fila.contexto as ContextoClave | null)?.proposito !== 'clave') return { ok: false }
  await db.update(users).set({ claveHash, emailVerificadoEn: new Date() }).where(eq(users.id, fila.userId))
  return { ok: true, userId: fila.userId }
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
    .values({
      nombre: nombreSugerido?.trim() || 'Mi cuenta',
      tipo: 'PERSONAL',
      plan: 'GRATIS',
      // No hay plan gratis: empieza la prueba de 15 días con todo Esencial.
      pruebaHasta: new Date(Date.now() + DIAS_PRUEBA * 86_400_000),
    })
    .returning({ id: organizations.id })

  await db.insert(memberships).values({ userId, orgId: org.id, rol: 'PROPIETARIO' })
  return org.id
}
