import { and, eq, inArray, ne } from 'drizzle-orm'
import { adminLog, db, memberships, organizations, pages, reports, sessions, users } from '@/db'
import { DURACION_SUPLANTACION_MS, esSuperadmin, registrar, type Actor } from './admin'
import { crearSesion } from './session'
import { ORDEN_PLANES, type ClavePlan } from './planes'

/**
 * Lo que puede hacer un superadmin, sin saber desde dónde se pide.
 *
 * Lo usan las dos puertas: /admin dentro de TUENLACE (sesión propia) y la API
 * que llama Gestiona-lo (login de la central). Quién es y si puede lo decide
 * cada puerta ANTES de llamar aquí; esto solo hace el cambio y lo apunta.
 */

export type Resultado<T = undefined> = { ok: true; datos?: T } | { ok: false; error: string; codigo?: number }

const MAX_DIAS_PRUEBA = 365
const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NO_EXISTE = (que: string): Resultado<never> => ({ ok: false, error: `${que} no existe.`, codigo: 404 })

// ── Cuentas ──────────────────────────────────────────────────────────────────

export async function cambiarPlan(actor: Actor, orgId: string, plan: string): Promise<Resultado> {
  if (!ORDEN_PLANES.includes(plan as ClavePlan)) return { ok: false, error: 'Ese plan no existe.' }
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1)
  if (!org) return NO_EXISTE('La cuenta')
  if (org.plan === plan) return { ok: true }

  await db
    .update(organizations)
    .set({ plan: plan as ClavePlan, actualizadoEn: new Date() })
    .where(eq(organizations.id, orgId))
  await registrar(actor, 'cambiar_plan', `org:${orgId}`, {
    de: org.plan,
    a: plan,
    conSuscripcionStripe: Boolean(org.stripeSubscriptionId),
  })
  return { ok: true }
}

/** Fija los días de prueba que le quedan desde hoy. 0 la termina ya. */
export async function fijarPrueba(actor: Actor, orgId: string, diasPedidos: unknown): Promise<Resultado> {
  const dias = Math.round(Number(diasPedidos))
  if (!Number.isFinite(dias) || dias < 0 || dias > MAX_DIAS_PRUEBA) {
    return { ok: false, error: `Los días de prueba van de 0 a ${MAX_DIAS_PRUEBA}.` }
  }
  const [org] = await db
    .select({ pruebaHasta: organizations.pruebaHasta })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
  if (!org) return NO_EXISTE('La cuenta')

  const hasta = new Date(Date.now() + dias * 24 * 60 * 60 * 1000)
  await db
    .update(organizations)
    .set({ pruebaHasta: hasta, actualizadoEn: new Date() })
    .where(eq(organizations.id, orgId))
  await registrar(actor, 'fijar_prueba', `org:${orgId}`, {
    antes: org.pruebaHasta?.toISOString() ?? null,
    ahora: hasta.toISOString(),
    dias,
  })
  return { ok: true }
}

export async function renombrarCuenta(actor: Actor, orgId: string, nombrePedido: string): Promise<Resultado> {
  const nombre = nombrePedido.trim().slice(0, 120)
  if (!nombre) return { ok: false, error: 'El nombre no puede ir vacío.' }
  const [org] = await db
    .select({ nombre: organizations.nombre })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
  if (!org) return NO_EXISTE('La cuenta')
  if (org.nombre === nombre) return { ok: true }
  await db
    .update(organizations)
    .set({ nombre, actualizadoEn: new Date() })
    .where(eq(organizations.id, orgId))
  await registrar(actor, 'renombrar_cuenta', `org:${orgId}`, { de: org.nombre, a: nombre })
  return { ok: true }
}

/**
 * Borra la cuenta entera: organización, páginas, bloques, contactos y
 * estadísticas (en cascada) y los usuarios que no pertenezcan a otra cuenta.
 * Exige el correo de uno de sus miembros como confirmación.
 */
export async function borrarCuenta(actor: Actor, orgId: string, confirmacion: string): Promise<Resultado> {
  const miembros = await db
    .select({ userId: users.id, email: users.email })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.orgId, orgId))
  if (miembros.length === 0) return NO_EXISTE('La cuenta')
  if (!miembros.some((m) => m.email.toLowerCase() === confirmacion.trim().toLowerCase())) {
    return { ok: false, error: 'Para borrar la cuenta hay que escribir exactamente el correo de uno de sus miembros.' }
  }
  // Ni la cuenta propia ni la de otro superadmin: se quedaría sin acceso.
  if (miembros.some((m) => m.userId === actor.userId || esSuperadmin(m.email))) {
    return { ok: false, error: 'Esa cuenta es de un superadmin y no se borra desde aquí.' }
  }

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1)
  const slugs = await db.select({ slug: pages.slug }).from(pages).where(eq(pages.orgId, orgId))

  await db.transaction(async (tx) => {
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

  await registrar(actor, 'borrar_cuenta', `org:${orgId}`, {
    nombre: org?.nombre,
    plan: org?.plan,
    conSuscripcionStripe: Boolean(org?.stripeSubscriptionId),
    correos: miembros.map((m) => m.email),
    paginas: slugs.map((s) => s.slug),
  })
  return { ok: true }
}

// ── Usuarios ─────────────────────────────────────────────────────────────────

export async function cambiarEmail(actor: Actor, userId: string, emailPedido: string): Promise<Resultado> {
  const email = emailPedido.trim().toLowerCase().slice(0, 254)
  if (!PATRON_EMAIL.test(email)) return { ok: false, error: 'Ese correo no es válido.' }

  const [usuario] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!usuario) return NO_EXISTE('Ese usuario')
  if (usuario.email === email) return { ok: true }
  const [ocupado] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (ocupado) return { ok: false, error: 'Ese correo ya lo usa otra cuenta.' }

  await db.update(users).set({ email }).where(eq(users.id, userId))
  // Con el correo cambiado, que vuelva a entrar con el nuevo.
  await db.delete(sessions).where(eq(sessions.userId, userId))
  await registrar(actor, 'cambiar_email', `usuario:${userId}`, { de: usuario.email, a: email })
  return { ok: true }
}

/** Cierra todas sus sesiones abiertas: tendrá que volver a entrar. */
export async function cerrarSesionesDe(actor: Actor, userId: string): Promise<Resultado<{ sesiones: number }>> {
  if (userId === actor.userId) return { ok: false, error: 'No puedes cerrar tus propias sesiones desde aquí.' }
  const borradas = await db
    .delete(sessions)
    .where(eq(sessions.userId, userId))
    .returning({ id: sessions.id })
  await registrar(actor, 'cerrar_sesiones', `usuario:${userId}`, { sesiones: borradas.length })
  return { ok: true, datos: { sesiones: borradas.length } }
}

/**
 * Abre una sesión de 2 horas en la cuenta de este usuario, marcada como
 * suplantada (el panel lo enseña en rojo). Devuelve el JWT de esa sesión;
 * cómo llega al navegador lo decide cada puerta.
 */
export async function abrirSesionComo(
  actor: Actor,
  userId: string,
): Promise<Resultado<{ jwt: string; expiraEn: Date; sessionId: string; email: string }>> {
  if (userId === actor.userId) return { ok: false, error: 'Esa es tu propia cuenta.' }
  const [usuario] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!usuario) return NO_EXISTE('Ese usuario')
  // Entrar como otro superadmin daría su acceso a quien no lo es por sí mismo.
  if (esSuperadmin(usuario.email)) return { ok: false, error: 'No se puede entrar en la cuenta de un superadmin.', codigo: 403 }

  const { jwt, expiraEn, id } = await crearSesion(usuario.id, {
    duracionMs: DURACION_SUPLANTACION_MS,
    suplantadoPor: actor.userId ?? undefined,
    suplantadoEmail: actor.email,
  })
  await registrar(actor, 'entrar_como', `usuario:${usuario.id}`, { email: usuario.email, sesion: id })
  return { ok: true, datos: { jwt, expiraEn, sessionId: id, email: usuario.email } }
}

// ── Páginas ──────────────────────────────────────────────────────────────────

async function paginaPorId(pageId: string) {
  const [p] = await db
    .select({ orgId: pages.orgId, slug: pages.slug, estado: pages.estado })
    .from(pages)
    .where(eq(pages.id, pageId))
    .limit(1)
  return p ?? null
}

export async function suspenderPagina(actor: Actor, pageId: string, motivoPedido: string): Promise<Resultado<{ orgId: string }>> {
  const motivo = motivoPedido.trim().slice(0, 300) || 'Suspendida por el equipo de TUENLACE'
  const p = await paginaPorId(pageId)
  if (!p) return NO_EXISTE('Esa página')
  await db
    .update(pages)
    .set({ estado: 'SUSPENDIDA', motivoSuspension: motivo, revisadaEn: new Date() })
    .where(eq(pages.id, pageId))
  await registrar(actor, 'suspender_pagina', `pagina:${p.slug}`, { antes: p.estado, motivo })
  return { ok: true, datos: { orgId: p.orgId } }
}

/** Vuelve a publicarla y la saca de revisión. */
export async function restaurarPagina(actor: Actor, pageId: string): Promise<Resultado<{ orgId: string }>> {
  const p = await paginaPorId(pageId)
  if (!p) return NO_EXISTE('Esa página')
  await db
    .update(pages)
    .set({ estado: 'PUBLICADA', motivoSuspension: null, revisionPendiente: false, revisadaEn: new Date() })
    .where(eq(pages.id, pageId))
  await registrar(actor, 'restaurar_pagina', `pagina:${p.slug}`, { antes: p.estado })
  return { ok: true, datos: { orgId: p.orgId } }
}

// ── Denuncias ────────────────────────────────────────────────────────────────

export async function resolverDenuncia(
  actor: Actor,
  reportId: string,
  decision: string,
  notaPedida: string,
): Promise<Resultado<{ orgId: string | null }>> {
  if (decision !== 'desestimar' && decision !== 'suspender') {
    return { ok: false, error: 'La decisión es «desestimar» o «suspender».' }
  }
  const nota = notaPedida.trim().slice(0, 1000) || null
  const [denuncia] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1)
  if (!denuncia) return NO_EXISTE('Esa denuncia')

  // Todas las abiertas de la misma página se resuelven a la vez: son el
  // mismo caso, y dejarlas abiertas volvería a suspender la página sola.
  await db
    .update(reports)
    .set({ estado: decision === 'desestimar' ? 'DESESTIMADA' : 'REVISADA', nota, revisadoEn: new Date() })
    .where(and(eq(reports.pageId, denuncia.pageId), eq(reports.estado, 'ABIERTA')))

  const p = await paginaPorId(denuncia.pageId)
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

  await registrar(actor, `denuncia_${decision}`, `pagina:${p?.slug ?? denuncia.pageId}`, {
    motivo: denuncia.motivo,
    nota,
  })
  return { ok: true, datos: { orgId: p?.orgId ?? null } }
}

/** ¿Ya se usó este enlace de «entrar como»? (son de un solo uso) */
export async function enlaceYaUsado(sessionId: string): Promise<boolean> {
  const [fila] = await db
    .select({ id: adminLog.id })
    .from(adminLog)
    .where(and(eq(adminLog.accion, 'entrar_como_usado'), eq(adminLog.objetivo, `sesion:${sessionId}`)))
    .limit(1)
  return Boolean(fila)
}
