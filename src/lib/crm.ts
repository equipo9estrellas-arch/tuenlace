import 'server-only'
import { and, asc, count, desc, eq, gte, sql, sum } from 'drizzle-orm'
import { db, leadNotas, leads, pages, users } from '@/db'
import { ETAPAS, type Etapa } from './crm-etapas'

/**
 * EL MINI CRM
 *
 * Un contacto es una fila de `leads`. Llega solo desde el formulario de la
 * página (con su origen: Instagram, QR, TikTok...) o lo añade el negocio a
 * mano, que es como entran los que escriben por WhatsApp: de esos sabemos que
 * alguien pulsó el botón, pero no quién era.
 *
 * Todo pasa por la organización: un contacto es de una página y la página es
 * de una organización. Ninguna función de aquí devuelve nada sin `orgId`.
 */

export type Contacto = {
  id: string
  pageId: string
  ts: Date
  etapa: Etapa
  importeCentimos: number | null
  manual: boolean
  origen: string | null
  cerradoEn: Date | null
  actualizadoEn: Date
  nombre: string
  email: string
  telefono: string
  mensaje: string
}

export type Nota = {
  id: string
  tipo: 'NOTA' | 'ETAPA' | 'IMPORTE'
  texto: string
  ts: Date
  autor: string | null
}

const COLUMNAS = {
  id: leads.id,
  pageId: leads.pageId,
  ts: leads.ts,
  datos: leads.datos,
  etapa: leads.etapa,
  importeCentimos: leads.importeCentimos,
  manual: leads.manual,
  origen: leads.origen,
  cerradoEn: leads.cerradoEn,
  actualizadoEn: leads.actualizadoEn,
}

type Fila = {
  id: string
  pageId: string
  ts: Date
  datos: Record<string, string>
  etapa: Etapa
  importeCentimos: number | null
  manual: boolean
  origen: string | null
  cerradoEn: Date | null
  actualizadoEn: Date
}

function aContacto(f: Fila): Contacto {
  const d = f.datos ?? {}
  return {
    id: f.id,
    pageId: f.pageId,
    ts: f.ts,
    etapa: f.etapa,
    importeCentimos: f.importeCentimos,
    manual: f.manual,
    origen: f.origen,
    cerradoEn: f.cerradoEn,
    actualizadoEn: f.actualizadoEn,
    nombre: d.nombre ?? '',
    email: d.email ?? '',
    telefono: d.telefono ?? '',
    mensaje: d.mensaje ?? '',
  }
}

/** Lo que se enseña como nombre cuando el formulario no lo pedía. */
export function nombreVisible(c: Pick<Contacto, 'nombre' | 'email' | 'telefono'>): string {
  return c.nombre || c.email || c.telefono || 'Sin nombre'
}

export async function listarContactos(
  orgId: string,
  filtros: { etapa?: Etapa; q?: string } = {},
): Promise<Contacto[]> {
  const condiciones = [eq(pages.orgId, orgId)]
  if (filtros.etapa) condiciones.push(eq(leads.etapa, filtros.etapa))
  const q = filtros.q?.trim()
  if (q) {
    // Buscar en el JSON entero: nombre, teléfono, correo y mensaje a la vez.
    // Los comodines de LIKE que escriba el usuario se escapan.
    const patron = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
    condiciones.push(sql`${leads.datos}::text ilike ${patron}`)
  }

  const filas = await db
    .select(COLUMNAS)
    .from(leads)
    .innerJoin(pages, eq(pages.id, leads.pageId))
    .where(and(...condiciones))
    .orderBy(desc(leads.ts))
    .limit(1000)

  return (filas as Fila[]).map(aContacto)
}

/** El contacto, solo si es de esta organización. */
export async function obtenerContacto(orgId: string, id: string): Promise<Contacto | null> {
  const [fila] = await db
    .select(COLUMNAS)
    .from(leads)
    .innerJoin(pages, eq(pages.id, leads.pageId))
    .where(and(eq(leads.id, id), eq(pages.orgId, orgId)))
    .limit(1)
  return fila ? aContacto(fila as Fila) : null
}

export async function notasDe(leadId: string): Promise<Nota[]> {
  const filas = await db
    .select({
      id: leadNotas.id,
      tipo: leadNotas.tipo,
      texto: leadNotas.texto,
      ts: leadNotas.ts,
      autor: users.nombre,
      autorEmail: users.email,
    })
    .from(leadNotas)
    .leftJoin(users, eq(users.id, leadNotas.userId))
    .where(eq(leadNotas.leadId, leadId))
    .orderBy(desc(leadNotas.ts))
    .limit(200)

  return filas.map((n) => ({
    id: n.id,
    tipo: n.tipo,
    texto: n.texto,
    ts: n.ts,
    autor: n.autor || n.autorEmail || null,
  }))
}

/** Cuántos contactos hay en cada etapa. Para las pestañas y el menú. */
export async function contarPorEtapa(orgId: string): Promise<Record<Etapa, number>> {
  const filas = await db
    .select({ etapa: leads.etapa, total: count() })
    .from(leads)
    .innerJoin(pages, eq(pages.id, leads.pageId))
    .where(eq(pages.orgId, orgId))
    .groupBy(leads.etapa)

  const cuentas = Object.fromEntries(ETAPAS.map((e) => [e.clave, 0])) as Record<Etapa, number>
  for (const f of filas) cuentas[f.etapa] = Number(f.total)
  return cuentas
}

export type VentaPorCanal = {
  origen: string
  contactos: number
  clientes: number
  importeCentimos: number
}

/**
 * EUROS POR CANAL — el dato que vende el producto.
 *
 * Se cuenta por la fecha en la que entró el contacto, no por la de la venta:
 * "de lo que entró por Instagram este mes, cuánto acabó en cliente y cuánto
 * dinero". Así contactos, clientes y euros hablan del mismo grupo de gente y
 * la tasa de cierre tiene sentido.
 */
export async function ventasPorCanal(orgId: string, desde: Date | null): Promise<VentaPorCanal[]> {
  const condiciones = [eq(pages.orgId, orgId)]
  if (desde) condiciones.push(gte(leads.ts, desde))

  const esCliente = sql`${leads.etapa} = 'CLIENTE'`
  const origen = sql<string>`coalesce(nullif(${leads.origen}, ''), 'directo')`

  const filas = await db
    .select({
      origen,
      contactos: count(),
      clientes: sql<number>`count(*) filter (where ${esCliente})`,
      importe: sum(sql`case when ${esCliente} then coalesce(${leads.importeCentimos}, 0) else 0 end`),
    })
    .from(leads)
    .innerJoin(pages, eq(pages.id, leads.pageId))
    .where(and(...condiciones))
    .groupBy(origen)
    .orderBy(asc(origen))

  return filas
    .map((f) => ({
      origen: f.origen,
      contactos: Number(f.contactos),
      clientes: Number(f.clientes),
      importeCentimos: Number(f.importe ?? 0),
    }))
    .sort((a, b) => b.importeCentimos - a.importeCentimos || b.contactos - a.contactos)
}

/** La primera página de la organización: donde se cuelgan los contactos a mano. */
export async function paginaPrincipal(orgId: string): Promise<string | null> {
  const [fila] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.orgId, orgId))
    .orderBy(desc(pages.creadoEn))
    .limit(1)
  return fila?.id ?? null
}
