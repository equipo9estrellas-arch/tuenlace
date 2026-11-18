'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { db, memberships, organizations, pages, reports, sessions, users } from '@/db'
import {
  DURACION_SUPLANTACION_MS,
  borrarCookieAdmin,
  esSuperadmin,
  exigirSuperadmin,
  guardarSesionAdmin,
  registrar,
  sesionAdminGuardada,
} from '@/lib/admin'
import { NOMBRE_COOKIE_SESION, cerrarSesion, crearSesion, obtenerSesion, ponerCookieSesion } from '@/lib/session'
import { ORDEN_PLANES, type ClavePlan } from '@/lib/planes'

/**
 * Todas las acciones del superadmin. Cada una vuelve a comprobar que quien
 * llama es superadmin (una acción de servidor se puede invocar a mano, sin
 * pasar por la página) y deja su línea en admin_log.
 */

const MAX_DIAS_PRUEBA = 365
const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function texto(fd: FormData, clave: string, max = 300): string {
  const v = fd.get(clave)
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

function refrescarCuenta(orgId: string) {
  revalidatePath('/admin')
  revalidatePath('/admin/cuentas')
  revalidatePath(`/admin/cuentas/${orgId}`)
}

async function orgDePagina(pageId: string) {
  const [p] = await db
    .select({ orgId: pages.orgId, slug: pages.slug, estado: pages.estado })
    .from(pages)
    .where(eq(pages.id, pageId))
    .limit(1)
  return p ?? null
}

// ── Cuentas ──────────────────────────────────────────────────────────────────

export async function cambiarPlan(orgId: string, fd: FormData) {
  const admin = await exigirSuperadmin()
  const plan = texto(fd, 'plan') as ClavePlan
  if (!ORDEN_PLANES.includes(plan)) return

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1)
  if (!org || org.plan === plan) return

  await db
    .update(organizations)
    .set({ plan, actualizadoEn: new Date() })
    .where(eq(organizations.id, orgId))
  await registrar(admin, 'cambiar_plan', `org:${orgId}`, {
    de: org.plan,
    a: plan,
    conSuscripcionStripe: Boolean(org.stripeSubscriptionId),
  })
  refrescarCuenta(orgId)
}

/** Fija los días de prueba que le quedan desde hoy. 0 la termina ya. */
export async function fijarPrueba(orgId: string, fd: FormData) {
  const admin = await exigirSuperadmin()
  const dias = Math.round(Number(texto(fd, 'dias')))
  if (!Number.isFinite(dias) || dias < 0 || dias > MAX_DIAS_PRUEBA) return

  const [org] = await db
    .select({ pruebaHasta: organizations.pruebaHasta })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
  if (!org) return

  const hasta = new Date(Date.now() + dias * 24 * 60 * 60 * 1000)
  await db
    .update(organizations)
    .set({ pruebaHasta: hasta, actualizadoEn: new Date() })
    .where(eq(organizations.id, orgId))
  await registrar(admin, 'fijar_prueba', `org:${orgId}`, {
    antes: org.pruebaHasta?.toISOString() ?? null,
    ahora: hasta.toISOString(),
    dias,
  })
  refrescarCuenta(orgId)
}

export async function renombrarCuenta(orgId: string, fd: FormData) {
  const admin = await exigirSuperadmin()
  const nombre = texto(fd, 'nombre', 120)
  if (!nombre) return
  const [org] = await db
    .select({ nombre: organizations.nombre })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
  if (!org || org.nombre === nombre) return
  await db
    .update(organizations)
    .set({ nombre, actualizadoEn: new Date() })
    .where(eq(organizations.id, orgId))
  await registrar(admin, 'renombrar_cuenta', `org:${orgId}`, { de: org.nombre, a: nombre })
  refrescarCuenta(orgId)
}

/**
 * Borra la cuenta entera: organización, páginas, bloques, contactos y
 * estadísticas (en cascada) y los usuarios que no pertenezcan a otra cuenta.
 * Pide escribir el correo del dueño: no hay vuelta atrás.
 */
export async function borrarCuenta(orgId: string, fd: FormData) {
  const admin = await exigirSuperadmin()
  const confirmacion = texto(fd, 'confirmacion').toLowerCase()

  const miembros = await db
    .select({ userId: users.id, email: users.email })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.orgId, orgId))
  if (miembros.length === 0) return
  if (!miembros.some((m) => m.email.toLowerCase() === confirmacion)) {
    redirect(`/admin/cuentas/${orgId}?error=confirmacion`)
  }
  // Un superadmin no se borra a sí mismo desde aquí: se quedaría sin acceso.
  if (miembros.some((m) => m.userId === admin.userId)) {
    redirect(`/admin/cuentas/${orgId}?error=propia`)
  }

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1)
  const slugs = await db.select({ slug: pages.slug }).from(pages).where(eq(pages.orgId, orgId))

  await db.transaction(async (tx) => {
    // Usuarios que solo están en esta cuenta: se van con ella.
    const ids = miembros.map((m) => m.userId)
    const enOtras = await tx
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(and(inArray(memberships.userId, ids), ne(memberships.orgId, orgId)))
    const quedan = new Set(enOtras.map((f) => f.userId))
    await tx.delete(organizations).where(eq(organizations.id, orgId))
    const borrar = ids.filter((id) => !quedan.has(id))
    if (borrar.length) await tx.delete(users).where(inArray(users.id, borrar))
  })

  await registrar(admin, 'borrar_cuenta', `org:${orgId}`, {
    nombre: org?.nombre,
    plan: org?.plan,
    conSuscripcionStripe: Boolean(org?.stripeSubscriptionId),
    correos: miembros.map((m) => m.email),
    paginas: slugs.map((s) => s.slug),
  })
  revalidatePath('/admin')
  redirect('/admin/cuentas?borrada=1')
}

// ── Usuarios ─────────────────────────────────────────────────────────────────

export async function cambiarEmail(orgId: string, userId: string, fd: FormData) {
  const admin = await exigirSuperadmin()
  const email = texto(fd, 'email', 254).toLowerCase()
  if (!PATRON_EMAIL.test(email)) redirect(`/admin/cuentas/${orgId}?error=email`)

  const [usuario] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!usuario || usuario.email === email) return
  const [ocupado] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (ocupado) redirect(`/admin/cuentas/${orgId}?error=email-ocupado`)

  await db.update(users).set({ email }).where(eq(users.id, userId))
  // Con el correo cambiado, que vuelva a entrar con el nuevo.
  await db.delete(sessions).where(eq(sessions.userId, userId))
  await registrar(admin, 'cambiar_email', `usuario:${userId}`, { de: usuario.email, a: email })
  refrescarCuenta(orgId)
}

/** Cierra todas sus sesiones abiertas: tendrá que volver a entrar. */
export async function cerrarSesionesDe(orgId: string, userId: string) {
  const admin = await exigirSuperadmin()
  if (userId === admin.userId) return
  const borradas = await db
    .delete(sessions)
    .where(eq(sessions.userId, userId))
    .returning({ id: sessions.id })
  await registrar(admin, 'cerrar_sesiones', `usuario:${userId}`, { sesiones: borradas.length })
  refrescarCuenta(orgId)
}

/**
 * Entra en el panel como este usuario, para soporte. La sesión propia se
 * guarda aparte y se recupera con «Volver a mi cuenta».
 */
export async function entrarComo(userId: string) {
  const admin = await exigirSuperadmin()
  if (userId === admin.userId) redirect('/panel')

  const [usuario] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!usuario) return
  // Entrar como otro superadmin daría su acceso a quien no lo es por sí mismo.
  if (esSuperadmin(usuario.email)) return

  const store = await cookies()
  const jwtAdmin = store.get(NOMBRE_COOKIE_SESION)?.value
  const [propia] = await db
    .select({ expiraEn: sessions.expiraEn })
    .from(sessions)
    .where(eq(sessions.id, admin.sessionId))
    .limit(1)
  if (!jwtAdmin || !propia) return

  const { jwt, expiraEn } = await crearSesion(usuario.id, {
    duracionMs: DURACION_SUPLANTACION_MS,
    suplantadoPor: admin.userId,
  })
  await guardarSesionAdmin(jwtAdmin, propia.expiraEn)
  await ponerCookieSesion(jwt, expiraEn)
  await registrar(admin, 'entrar_como', `usuario:${usuario.id}`, { email: usuario.email })
  redirect('/panel')
}

/** Sale de la cuenta suplantada y recupera la sesión de superadmin. */
export async function volverAMiCuenta() {
  const actual = await obtenerSesion()
  const guardada = await sesionAdminGuardada()

  // La sesión suplantada se borra siempre: no se queda viva por ahí.
  if (actual?.suplantadoPor) {
    await db.delete(sessions).where(eq(sessions.id, actual.sessionId))
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
  const admin = await exigirSuperadmin()
  const motivo = texto(fd, 'motivo', 300) || 'Suspendida por el equipo de TUENLACE'
  const p = await orgDePagina(pageId)
  if (!p) return
  await db
    .update(pages)
    .set({ estado: 'SUSPENDIDA', motivoSuspension: motivo, revisadaEn: new Date() })
    .where(eq(pages.id, pageId))
  await registrar(admin, 'suspender_pagina', `pagina:${p.slug}`, { antes: p.estado, motivo })
  refrescarCuenta(p.orgId)
  revalidatePath('/admin/paginas')
  revalidatePath('/admin/denuncias')
}

/** Vuelve a publicarla y la saca de revisión. */
export async function restaurarPagina(pageId: string) {
  const admin = await exigirSuperadmin()
  const p = await orgDePagina(pageId)
  if (!p) return
  await db
    .update(pages)
    .set({
      estado: 'PUBLICADA',
      motivoSuspension: null,
      revisionPendiente: false,
      revisadaEn: new Date(),
    })
    .where(eq(pages.id, pageId))
  await registrar(admin, 'restaurar_pagina', `pagina:${p.slug}`, { antes: p.estado })
  refrescarCuenta(p.orgId)
  revalidatePath('/admin/paginas')
}

// ── Denuncias ────────────────────────────────────────────────────────────────

export async function resolverDenuncia(reportId: string, fd: FormData) {
  const admin = await exigirSuperadmin()
  const decision = texto(fd, 'decision')
  const nota = texto(fd, 'nota', 1000) || null
  if (decision !== 'desestimar' && decision !== 'suspender') return

  const [denuncia] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1)
  if (!denuncia) return

  // Todas las abiertas de la misma página se resuelven a la vez: son el
  // mismo caso, y dejarlas abiertas volvería a suspender la página sola.
  await db
    .update(reports)
    .set({
      estado: decision === 'desestimar' ? 'DESESTIMADA' : 'REVISADA',
      nota,
      revisadoEn: new Date(),
    })
    .where(and(eq(reports.pageId, denuncia.pageId), eq(reports.estado, 'ABIERTA')))

  const p = await orgDePagina(denuncia.pageId)
  if (p && decision === 'suspender') {
    await db
      .update(pages)
      .set({
        estado: 'SUSPENDIDA',
        motivoSuspension: nota ?? `Denuncia: ${denuncia.motivo}`,
        revisionPendiente: false,
        revisadaEn: new Date(),
      })
      .where(eq(pages.id, denuncia.pageId))
  }
  // Desestimada y suspendida solo por las denuncias: vuelve a publicarse.
  if (p && decision === 'desestimar' && p.estado === 'SUSPENDIDA') {
    await db
      .update(pages)
      .set({ estado: 'PUBLICADA', motivoSuspension: null, revisionPendiente: false, revisadaEn: new Date() })
      .where(eq(pages.id, denuncia.pageId))
  }

  await registrar(admin, `denuncia_${decision}`, `pagina:${p?.slug ?? denuncia.pageId}`, {
    motivo: denuncia.motivo,
    nota,
  })
  revalidatePath('/admin/denuncias')
  revalidatePath('/admin')
  if (p) refrescarCuenta(p.orgId)
}
