import 'server-only'
import { and, eq, gt, lt } from 'drizzle-orm'
import { blocks, citas, conversions, db, leads, memberships, organizations, pages, users } from '@/db'
import { limitesDe, planEfectivo } from './planes'
import { dentroDelPlan } from './paginas'
import { createEventId } from './ids-y-hash'
import { detectarOrigen } from './analitica'
import { nombreOrigen } from './crm-etapas'
import { emailValido } from './normalizar'
import { enviarCitaAlCliente, enviarCitaAlNegocio } from './mail'
import {
  archivoIcs,
  enlaceGoogleCalendar,
  fechaLegible,
  fechaLocal,
  huecosDelDia,
  parametros,
  type EventoCita,
} from '@/bloques/reservas'
import type { ConfigReserva } from '@/bloques/tipos'

/** Los orígenes que aceptamos si la página nos los pasa (los mismos del panel). */
const ORIGENES_VALIDOS = new Set([
  'instagram', 'tiktok', 'facebook', 'google', 'youtube', 'linkedin', 'x', 'whatsapp',
  'qr', 'tarjeta', 'ads', 'snapchat', 'pinterest', 'threads', 'otro', 'directo',
])

type Contexto = {
  config: ConfigReserva
  bloqueId: string
  pagina: { id: string; slug: string; titulo: string; orgId: string }
}

/**
 * El bloque, solo si se puede reservar en él: es un bloque RESERVA de esa
 * página, la página está publicada, la cuenta tiene plan y la página cabe en
 * él. Las mismas puertas que el formulario de contacto.
 */
export async function contextoReserva(bloqueId: string, paginaId: string): Promise<Contexto | null> {
  if (!bloqueId || !paginaId) return null
  const [fila] = await db
    .select({
      tipo: blocks.tipo,
      activo: blocks.activo,
      config: blocks.config,
      pageId: blocks.pageId,
      slug: pages.slug,
      titulo: pages.titulo,
      estado: pages.estado,
      orgId: pages.orgId,
      plan: organizations.plan,
      pruebaHasta: organizations.pruebaHasta,
    })
    .from(blocks)
    .innerJoin(pages, eq(pages.id, blocks.pageId))
    .innerJoin(organizations, eq(organizations.id, pages.orgId))
    .where(eq(blocks.id, bloqueId))
    .limit(1)

  if (!fila || fila.pageId !== paginaId || fila.tipo !== 'RESERVA' || !fila.activo) return null
  if (fila.estado !== 'PUBLICADA') return null
  const plan = planEfectivo(fila.plan, fila.pruebaHasta)
  if (plan === 'GRATIS') return null
  if (!(await dentroDelPlan(fila.orgId, paginaId, limitesDe(plan).paginas))) return null

  return {
    config: fila.config as unknown as ConfigReserva,
    bloqueId,
    pagina: { id: paginaId, slug: fila.slug, titulo: fila.titulo, orgId: fila.orgId },
  }
}

/** Citas confirmadas que tocan ese día (con un día de margen por las zonas). */
async function ocupadasDelDia(pageId: string, fecha: string) {
  const desde = new Date(`${fecha}T00:00:00Z`)
  desde.setUTCDate(desde.getUTCDate() - 1)
  const hasta = new Date(`${fecha}T00:00:00Z`)
  hasta.setUTCDate(hasta.getUTCDate() + 2)
  return db
    .select({ inicio: citas.inicio, fin: citas.fin })
    .from(citas)
    .where(and(eq(citas.pageId, pageId), eq(citas.estado, 'CONFIRMADA'), lt(citas.inicio, hasta), gt(citas.fin, desde)))
}

export async function huecosLibres(ctx: Contexto, fecha: string, ahora = new Date()) {
  return huecosDelDia(ctx.config, fecha, await ocupadasDelDia(ctx.pagina.id, fecha), ahora)
}

export type DatosReserva = {
  inicio: string
  nombre: string
  telefono?: string
  email?: string
  nota?: string
  /** El origen que calculó la página al pintarse (Referer o utm de la visita). */
  origenPagina?: string
}

export type ResultadoReserva =
  | { ok: true; citaId: string; leadId: string; evento: EventoCita; enlaceGoogle: string; ics: string; cuando: string }
  | { ok: false; error: string; codigo: 'datos' | 'hueco' | 'ocupado' }

const corto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/**
 * Reserva una hora.
 *
 * La hora se vuelve a comprobar aquí contra los huecos libres: lo que manda
 * el navegador no vale como prueba. Y aunque dos personas pasen esa
 * comprobación a la vez, el índice único de la tabla deja entrar solo a una.
 */
export async function reservar(
  ctx: Contexto,
  datos: DatosReserva,
  cabeceras: { referer: string | null; userAgent: string | null },
  ahora = new Date(),
): Promise<ResultadoReserva> {
  const nombre = corto(datos.nombre, 120)
  const telefono = corto(datos.telefono, 40)
  const email = datos.email ? emailValido(datos.email) : null
  const nota = corto(datos.nota, 500)
  if (!nombre) return { ok: false, error: 'Escribe tu nombre.', codigo: 'datos' }
  if (!telefono && !email) return { ok: false, error: 'Déjanos un teléfono o un correo.', codigo: 'datos' }
  if (datos.email && !email) return { ok: false, error: 'Ese correo no parece válido.', codigo: 'datos' }

  const inicio = new Date(datos.inicio)
  if (Number.isNaN(inicio.getTime())) return { ok: false, error: 'Elige una hora.', codigo: 'hueco' }
  const { zona } = parametros(ctx.config)
  const libres = await huecosLibres(ctx, fechaLocal(inicio, zona), ahora)
  const hueco = libres.find((h) => h.inicio === inicio.toISOString())
  if (!hueco) return { ok: false, error: 'Esa hora ya no está libre. Elige otra.', codigo: 'ocupado' }
  const fin = new Date(hueco.fin)

  // De dónde viene: el navegador de la app manda; si no dice nada, lo que
  // calculó la página al abrirse (que vio el Referer y los utm de la visita).
  let origen = detectarOrigen(cabeceras.referer, null, cabeceras.userAgent)
  if ((origen === 'directo' || origen === 'otro') && datos.origenPagina && ORIGENES_VALIDOS.has(datos.origenPagina)) {
    origen = datos.origenPagina
  }

  const servicio = corto(ctx.config.servicio, 120) || 'Cita'
  const cuando = fechaLegible(inicio, zona)

  let ids: { citaId: string; leadId: string }
  try {
    ids = await db.transaction(async (tx) => {
      const [lead] = await tx
        .insert(leads)
        .values({
          pageId: ctx.pagina.id,
          datos: {
            nombre,
            ...(telefono ? { telefono } : {}),
            ...(email ? { email } : {}),
            cita: `${servicio} · ${cuando}`,
            ...(nota ? { mensaje: nota } : {}),
          },
          origen,
          etapa: 'CITA',
        })
        .returning({ id: leads.id })
      const [cita] = await tx
        .insert(citas)
        .values({
          pageId: ctx.pagina.id,
          bloqueId: ctx.bloqueId,
          leadId: lead.id,
          inicio,
          fin,
          servicio,
          nombre,
          email,
          telefono: telefono || null,
          nota: nota || null,
          origen,
        })
        .returning({ id: citas.id })
      await tx.insert(conversions).values({
        pageId: ctx.pagina.id,
        tipo: 'CITA',
        eventId: createEventId(),
        origen,
        metaEstado: 'pendiente',
      })
      return { citaId: cita.id, leadId: lead.id }
    })
  } catch (error) {
    // 23505: el índice único. Alguien ha cogido la hora en el mismo instante.
    if ((error as { code?: string; cause?: { code?: string } })?.code === '23505' || (error as { cause?: { code?: string } })?.cause?.code === '23505') {
      return { ok: false, error: 'Esa hora acaba de cogerse. Elige otra.', codigo: 'ocupado' }
    }
    throw error
  }

  const evento: EventoCita = {
    titulo: `${servicio} · ${ctx.pagina.titulo}`,
    inicio,
    fin,
    descripcion: `Reservada desde tuenlace.es/${ctx.pagina.slug}`,
    lugar: corto(ctx.config.direccion, 200) || undefined,
    uid: ids.citaId,
  }
  const enlaceGoogle = enlaceGoogleCalendar(evento)
  const ics = archivoIcs(evento)

  // Los correos no retrasan la respuesta al visitante.
  void avisar(ctx, { ...ids, servicio, cuando, nombre, telefono, email, nota, origen, inicio, fin })

  return { ok: true, ...ids, evento, enlaceGoogle, ics, cuando }
}

async function correoDelNegocio(ctx: Contexto): Promise<string | null> {
  const propio = ctx.config.emailAvisos ? emailValido(ctx.config.emailAvisos) : null
  if (propio) return propio
  const [dueno] = await db
    .select({ email: users.email })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.orgId, ctx.pagina.orgId), eq(memberships.rol, 'PROPIETARIO')))
    .limit(1)
  return dueno?.email ?? null
}

async function avisar(
  ctx: Contexto,
  c: {
    citaId: string
    leadId: string
    servicio: string
    cuando: string
    nombre: string
    telefono: string
    email: string | null
    nota: string
    origen: string
    inicio: Date
    fin: Date
  },
) {
  try {
    const lugar = corto(ctx.config.direccion, 200) || undefined
    const paraNegocio = await correoDelNegocio(ctx)

    // El evento del NEGOCIO lleva los datos del cliente; el del cliente, no.
    if (paraNegocio) {
      const evento: EventoCita = {
        titulo: `${c.servicio} · ${c.nombre}`,
        inicio: c.inicio,
        fin: c.fin,
        descripcion: [c.telefono && `Tel: ${c.telefono}`, c.email && `Correo: ${c.email}`, c.nota && `Nota: ${c.nota}`, `Llegó desde ${nombreOrigen(c.origen)}`]
          .filter(Boolean)
          .join('\n'),
        lugar,
        uid: `${c.citaId}-negocio`,
      }
      await enviarCitaAlNegocio({
        para: paraNegocio,
        slug: ctx.pagina.slug,
        servicio: c.servicio,
        cuando: c.cuando,
        cliente: { nombre: c.nombre, telefono: c.telefono || null, email: c.email, nota: c.nota || null },
        origen: nombreOrigen(c.origen),
        enlaceGoogle: enlaceGoogleCalendar(evento),
        ics: archivoIcs(evento),
        leadId: c.leadId,
      })
    }

    if (c.email) {
      const evento: EventoCita = {
        titulo: `${c.servicio} · ${ctx.pagina.titulo}`,
        inicio: c.inicio,
        fin: c.fin,
        descripcion: `Reservada desde tuenlace.es/${ctx.pagina.slug}`,
        lugar,
        uid: c.citaId,
      }
      await enviarCitaAlCliente({
        para: c.email,
        negocio: ctx.pagina.titulo,
        servicio: c.servicio,
        cuando: c.cuando,
        lugar,
        enlaceGoogle: enlaceGoogleCalendar(evento),
        ics: archivoIcs(evento),
        responderA: paraNegocio ?? undefined,
      })
    }
  } catch (error) {
    console.error('[reservas] no se han podido mandar los avisos de la cita', c.citaId, error)
  }
}

/** Para el panel: las próximas citas confirmadas de una página. */
export async function proximasCitas(pageId: string, limite = 8, ahora = new Date()) {
  return db
    .select({
      id: citas.id,
      inicio: citas.inicio,
      fin: citas.fin,
      servicio: citas.servicio,
      nombre: citas.nombre,
      telefono: citas.telefono,
      email: citas.email,
      origen: citas.origen,
      leadId: citas.leadId,
      bloqueId: citas.bloqueId,
    })
    .from(citas)
    .where(and(eq(citas.pageId, pageId), eq(citas.estado, 'CONFIRMADA'), gt(citas.fin, ahora)))
    .orderBy(citas.inicio)
    .limit(limite)
}
