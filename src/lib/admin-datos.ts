import { and, desc, eq, gte, ilike, inArray, or, sql, type SQL } from 'drizzle-orm'
import {
  adminLog,
  blockClicks,
  db,
  leads,
  memberships,
  organizations,
  pageViews,
  pages,
  reports,
  sessions,
  users,
} from '@/db'
import { PLANES, esDePago, type ClavePlan } from './planes'

/**
 * Las lecturas del panel de superadmin. Solo las llama /admin, que antes ha
 * pasado por exigirSuperadmin().
 */

export type EstadoCuenta = 'PAGO' | 'CORTESIA' | 'PRUEBA' | 'CADUCADA'

export const NOMBRE_ESTADO: Record<EstadoCuenta, string> = {
  PAGO: 'De pago',
  CORTESIA: 'Cortesía',
  PRUEBA: 'En prueba',
  CADUCADA: 'Sin plan',
}

/**
 * De pago: plan de pago con suscripción en Stripe. Cortesía: plan de pago
 * puesto a mano, sin suscripción (no cobra). Prueba y caducada: sin plan.
 */
export function estadoCuenta(
  o: { plan: string; stripeSubscriptionId: string | null; pruebaHasta: Date | null },
  ahora = new Date(),
): EstadoCuenta {
  if (esDePago(o.plan)) return o.stripeSubscriptionId ? 'PAGO' : 'CORTESIA'
  return o.pruebaHasta && o.pruebaHasta > ahora ? 'PRUEBA' : 'CADUCADA'
}

/** La condición SQL de cada estado, para filtrar en la base de datos. */
function condicionEstado(estado: EstadoCuenta): SQL {
  const conPlan = sql`${organizations.plan} <> 'GRATIS'`
  switch (estado) {
    case 'PAGO':
      return sql`${conPlan} and ${organizations.stripeSubscriptionId} is not null`
    case 'CORTESIA':
      return sql`${conPlan} and ${organizations.stripeSubscriptionId} is null`
    case 'PRUEBA':
      return sql`${organizations.plan} = 'GRATIS' and ${organizations.pruebaHasta} > now()`
    case 'CADUCADA':
      return sql`${organizations.plan} = 'GRATIS' and (${organizations.pruebaHasta} is null or ${organizations.pruebaHasta} <= now())`
  }
}

const hace = (dias: number) => new Date(Date.now() - dias * 24 * 60 * 60 * 1000)

// ── Resumen ──────────────────────────────────────────────────────────────────

export async function metricas() {
  const desde30 = hace(30)

  const [cuentas] = await db
    .select({
      total: sql<number>`count(*)::int`,
      pago: sql<number>`count(*) filter (where ${condicionEstado('PAGO')})::int`,
      cortesia: sql<number>`count(*) filter (where ${condicionEstado('CORTESIA')})::int`,
      prueba: sql<number>`count(*) filter (where ${condicionEstado('PRUEBA')})::int`,
      caducadas: sql<number>`count(*) filter (where ${condicionEstado('CADUCADA')})::int`,
      altas30: sql<number>`count(*) filter (where ${organizations.creadoEn} >= ${desde30})::int`,
      pruebaAcaba3: sql<number>`count(*) filter (where ${organizations.plan} = 'GRATIS' and ${organizations.pruebaHasta} > now() and ${organizations.pruebaHasta} <= now() + interval '3 days')::int`,
    })
    .from(organizations)

  // Lo que suman al mes las suscripciones activas, a precio de catálogo.
  const porPlan = await db
    .select({ plan: organizations.plan, n: sql<number>`count(*)::int` })
    .from(organizations)
    .where(condicionEstado('PAGO'))
    .groupBy(organizations.plan)
  const mrrCentimos = porPlan.reduce(
    (t, f) => t + f.n * PLANES[f.plan as ClavePlan].precioMensualCentimos,
    0,
  )

  const [paginas] = await db
    .select({
      publicadas: sql<number>`count(*) filter (where ${pages.estado} = 'PUBLICADA')::int`,
      suspendidas: sql<number>`count(*) filter (where ${pages.estado} = 'SUSPENDIDA')::int`,
      borradores: sql<number>`count(*) filter (where ${pages.estado} = 'BORRADOR')::int`,
    })
    .from(pages)

  // De las tablas en bruto, igual que el panel de cada cliente: así las
  // cifras de aquí y las suyas cuadran.
  const [[visitas], [clics]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(pageViews).where(gte(pageViews.ts, desde30)),
    db.select({ n: sql<number>`count(*)::int` }).from(blockClicks).where(gte(blockClicks.ts, desde30)),
  ])

  const [contactos] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(leads)
    .where(gte(leads.ts, desde30))

  const [denuncias] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reports)
    .where(eq(reports.estado, 'ABIERTA'))

  return {
    cuentas,
    mrrCentimos,
    paginas,
    visitas30: visitas?.n ?? 0,
    clics30: clics?.n ?? 0,
    contactos30: contactos?.n ?? 0,
    denunciasAbiertas: denuncias?.n ?? 0,
  }
}

// ── Cuentas ──────────────────────────────────────────────────────────────────

export async function listarCuentas(filtro: { q?: string; estado?: EstadoCuenta }) {
  const condiciones: SQL[] = []
  if (filtro.estado) condiciones.push(condicionEstado(filtro.estado))
  if (filtro.q) {
    const patron = `%${filtro.q.replace(/[%_\\]/g, '\\$&')}%`
    // Por nombre de la cuenta, correo de cualquier miembro o slug de cualquier página.
    condiciones.push(
      or(
        ilike(organizations.nombre, patron),
        sql`exists (select 1 from ${memberships} m join ${users} u on u.id = m.user_id where m.org_id = ${organizations.id} and u.email ilike ${patron})`,
        sql`exists (select 1 from ${pages} p where p.org_id = ${organizations.id} and p.slug ilike ${patron})`,
      )!,
    )
  }

  const orgs = await db
    .select({
      id: organizations.id,
      nombre: organizations.nombre,
      plan: organizations.plan,
      pruebaHasta: organizations.pruebaHasta,
      stripeSubscriptionId: organizations.stripeSubscriptionId,
      creadoEn: organizations.creadoEn,
    })
    .from(organizations)
    .where(condiciones.length ? and(...condiciones) : undefined)
    .orderBy(desc(organizations.creadoEn))
    .limit(200)

  if (orgs.length === 0) return []
  const ids = orgs.map((o) => o.id)

  const [correos, slugs] = await Promise.all([
    db
      .select({ orgId: memberships.orgId, email: users.email })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(inArray(memberships.orgId, ids)),
    db
      .select({ orgId: pages.orgId, slug: pages.slug, estado: pages.estado })
      .from(pages)
      .where(inArray(pages.orgId, ids)),
  ])

  return orgs.map((o) => ({
    ...o,
    estado: estadoCuenta(o),
    correos: correos.filter((c) => c.orgId === o.id).map((c) => c.email),
    paginas: slugs.filter((p) => p.orgId === o.id),
  }))
}

export async function detalleCuenta(orgId: string) {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1)
  if (!org) return null
  const desde30 = hace(30)

  const miembros = await db
    .select({
      userId: users.id,
      email: users.email,
      nombre: users.nombre,
      rol: memberships.rol,
      creadoEn: users.creadoEn,
      verificado: users.emailVerificadoEn,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.orgId, orgId))

  const ids = miembros.map((m) => m.userId)
  const sesionesAbiertas = ids.length
    ? await db
        .select({
          userId: sessions.userId,
          n: sql<number>`count(*)::int`,
          ultimo: sql<Date | null>`max(${sessions.ultimoUso})`,
        })
        .from(sessions)
        .where(and(inArray(sessions.userId, ids), sql`${sessions.expiraEn} > now()`))
        .groupBy(sessions.userId)
    : []

  const paginas = await db
    .select({
      id: pages.id,
      slug: pages.slug,
      titulo: pages.titulo,
      estado: pages.estado,
      motivoSuspension: pages.motivoSuspension,
      revisionPendiente: pages.revisionPendiente,
      creadoEn: pages.creadoEn,
      visitas30: sql<number>`(select count(*)::int from ${pageViews} v where v.page_id = ${pages.id} and v.ts >= ${desde30})`,
      contactos: sql<number>`(select count(*)::int from ${leads} l where l.page_id = ${pages.id})`,
      denuncias: sql<number>`(select count(*)::int from ${reports} r where r.page_id = ${pages.id} and r.estado = 'ABIERTA')`,
    })
    .from(pages)
    .where(eq(pages.orgId, orgId))
    .orderBy(pages.creadoEn)

  const historial = await db
    .select()
    .from(adminLog)
    .where(
      or(
        eq(adminLog.objetivo, `org:${orgId}`),
        ids.length ? inArray(adminLog.objetivo, ids.map((i) => `usuario:${i}`)) : undefined,
        paginas.length ? inArray(adminLog.objetivo, paginas.map((p) => `pagina:${p.slug}`)) : undefined,
      ),
    )
    .orderBy(desc(adminLog.ts))
    .limit(30)

  return {
    org,
    estado: estadoCuenta(org),
    miembros: miembros.map((m) => ({
      ...m,
      sesiones: sesionesAbiertas.find((s) => s.userId === m.userId)?.n ?? 0,
      ultimoUso: sesionesAbiertas.find((s) => s.userId === m.userId)?.ultimo ?? null,
    })),
    paginas,
    historial,
  }
}

// ── Páginas ──────────────────────────────────────────────────────────────────

type EstadoPagina = 'BORRADOR' | 'PUBLICADA' | 'SUSPENDIDA'

export async function listarPaginas(filtro: { q?: string; estado?: EstadoPagina; revision?: boolean }) {
  const condiciones: SQL[] = []
  if (filtro.estado) condiciones.push(eq(pages.estado, filtro.estado))
  if (filtro.revision) condiciones.push(eq(pages.revisionPendiente, true))
  if (filtro.q) {
    const patron = `%${filtro.q.replace(/[%_\\]/g, '\\$&')}%`
    condiciones.push(or(ilike(pages.slug, patron), ilike(pages.titulo, patron))!)
  }
  return db
    .select({
      id: pages.id,
      slug: pages.slug,
      titulo: pages.titulo,
      estado: pages.estado,
      revisionPendiente: pages.revisionPendiente,
      motivoSuspension: pages.motivoSuspension,
      orgId: pages.orgId,
      orgNombre: organizations.nombre,
      creadoEn: pages.creadoEn,
    })
    .from(pages)
    .innerJoin(organizations, eq(organizations.id, pages.orgId))
    .where(condiciones.length ? and(...condiciones) : undefined)
    .orderBy(desc(pages.creadoEn))
    .limit(200)
}

// ── Denuncias y registro ─────────────────────────────────────────────────────

export async function listarDenuncias(abiertas: boolean) {
  return db
    .select({
      id: reports.id,
      motivo: reports.motivo,
      detalle: reports.detalle,
      estado: reports.estado,
      nota: reports.nota,
      creadoEn: reports.creadoEn,
      revisadoEn: reports.revisadoEn,
      pageId: pages.id,
      slug: pages.slug,
      estadoPagina: pages.estado,
      orgId: pages.orgId,
    })
    .from(reports)
    .innerJoin(pages, eq(pages.id, reports.pageId))
    .where(abiertas ? eq(reports.estado, 'ABIERTA') : sql`${reports.estado} <> 'ABIERTA'`)
    .orderBy(desc(reports.creadoEn))
    .limit(200)
}

export async function listarRegistro() {
  return db.select().from(adminLog).orderBy(desc(adminLog.ts)).limit(300)
}
