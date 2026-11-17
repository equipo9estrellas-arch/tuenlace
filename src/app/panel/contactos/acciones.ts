'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db, leadNotas, leads } from '@/db'
import { exigirSesion, type Sesion } from '@/lib/session'
import { limitesDe, siguientePlan } from '@/lib/planes'
import { obtenerContacto, paginaPrincipal } from '@/lib/crm'
import {
  ETAPAS_CERRADAS,
  ORIGENES_MANUALES,
  etapaDe,
  etapaValida,
  eurosACentimos,
  formatoEuros,
} from '@/lib/crm-etapas'

export type Resultado = { ok: true } | { ok: false; error: string }

const MAX_NOTA = 2000
const MAX_CAMPO = 200

/**
 * Las acciones que GESTIONAN contactos son del pipeline, que es de pago. El
 * plan se comprueba aquí, en el servidor: que el botón no se vea en el panel
 * no impide llamar a la acción a mano.
 */
async function conPipeline(): Promise<{ sesion: Sesion } | { error: string }> {
  const sesion = await exigirSesion()
  if (!limitesDe(sesion.plan).pipeline) {
    return { error: `El pipeline es del plan ${siguientePlan(sesion.plan)?.nombre ?? 'de pago'}.` }
  }
  return { sesion }
}

function refrescar(id?: string) {
  revalidatePath('/panel/contactos')
  revalidatePath('/panel/pipeline')
  revalidatePath('/panel')
  if (id) revalidatePath(`/panel/contactos/${id}`)
}

export async function moverEtapa(id: string, etapa: string): Promise<Resultado> {
  const r = await conPipeline()
  if ('error' in r) return { ok: false, error: r.error }
  if (!etapaValida(etapa)) return { ok: false, error: 'Esa etapa no existe.' }

  const contacto = await obtenerContacto(r.sesion.orgId, id)
  if (!contacto) return { ok: false, error: 'Ese contacto no existe.' }
  if (contacto.etapa === etapa) return { ok: true }

  const ahora = new Date()
  await db.transaction(async (tx) => {
    await tx
      .update(leads)
      .set({
        etapa,
        actualizadoEn: ahora,
        // La fecha de cierre es la de la venta (o la de darlo por perdido).
        // Si vuelve a una etapa abierta, deja de estar cerrado.
        cerradoEn: ETAPAS_CERRADAS.includes(etapa) ? ahora : null,
      })
      .where(eq(leads.id, id))
    await tx.insert(leadNotas).values({
      leadId: id,
      userId: r.sesion.userId,
      tipo: 'ETAPA',
      texto: `${etapaDe(contacto.etapa).nombre} → ${etapaDe(etapa).nombre}`,
    })
  })

  refrescar(id)
  return { ok: true }
}

export async function guardarImporte(id: string, formulario: FormData): Promise<Resultado> {
  const r = await conPipeline()
  if ('error' in r) return { ok: false, error: r.error }

  const contacto = await obtenerContacto(r.sesion.orgId, id)
  if (!contacto) return { ok: false, error: 'Ese contacto no existe.' }

  const texto = String(formulario.get('importe') ?? '').trim()
  const centimos = texto === '' ? null : eurosACentimos(texto)
  if (texto !== '' && centimos === null) {
    return { ok: false, error: 'Escribe solo la cantidad, por ejemplo 350 o 1.200,50.' }
  }
  if (centimos === contacto.importeCentimos) return { ok: true }

  await db.transaction(async (tx) => {
    await tx
      .update(leads)
      .set({ importeCentimos: centimos, actualizadoEn: new Date() })
      .where(eq(leads.id, id))
    await tx.insert(leadNotas).values({
      leadId: id,
      userId: r.sesion.userId,
      tipo: 'IMPORTE',
      texto: centimos === null ? 'Importe borrado' : `Importe: ${formatoEuros(centimos)}`,
    })
  })

  refrescar(id)
  return { ok: true }
}

export async function anadirNota(id: string, formulario: FormData): Promise<Resultado> {
  const r = await conPipeline()
  if ('error' in r) return { ok: false, error: r.error }

  const texto = String(formulario.get('texto') ?? '').trim().slice(0, MAX_NOTA)
  if (!texto) return { ok: false, error: 'La nota está vacía.' }

  const contacto = await obtenerContacto(r.sesion.orgId, id)
  if (!contacto) return { ok: false, error: 'Ese contacto no existe.' }

  await db.transaction(async (tx) => {
    await tx.insert(leadNotas).values({ leadId: id, userId: r.sesion.userId, tipo: 'NOTA', texto })
    await tx.update(leads).set({ actualizadoEn: new Date() }).where(eq(leads.id, id))
  })

  refrescar(id)
  return { ok: true }
}

/**
 * Añadir un contacto a mano: el que escribió por WhatsApp, el que llamó, el
 * que entró por la puerta. No cuenta como conversión de la página (no la
 * hizo la página) pero sí entra en el pipeline y en los euros por canal.
 */
export async function crearContacto(
  _previo: Resultado | null,
  formulario: FormData,
): Promise<Resultado> {
  const r = await conPipeline()
  if ('error' in r) return { ok: false, error: r.error }

  const campo = (nombre: string) => String(formulario.get(nombre) ?? '').trim().slice(0, MAX_CAMPO)
  const datos: Record<string, string> = {}
  for (const nombre of ['nombre', 'telefono', 'email'] as const) {
    const valor = campo(nombre)
    if (valor) datos[nombre] = valor
  }
  const mensaje = String(formulario.get('mensaje') ?? '').trim().slice(0, MAX_NOTA)
  if (mensaje) datos.mensaje = mensaje

  if (!datos.nombre && !datos.telefono && !datos.email) {
    return { ok: false, error: 'Pon al menos un nombre, un teléfono o un correo.' }
  }

  const origenPedido = campo('origen')
  const origen = (ORIGENES_MANUALES as readonly string[]).includes(origenPedido) ? origenPedido : 'otro'
  const etapaPedida = campo('etapa')
  const etapa = etapaValida(etapaPedida) ? etapaPedida : 'NUEVO'

  const pageId = await paginaPrincipal(r.sesion.orgId)
  if (!pageId) return { ok: false, error: 'Primero crea tu página.' }

  const [nuevo] = await db
    .insert(leads)
    .values({
      pageId,
      datos,
      origen,
      manual: true,
      etapa,
      cerradoEn: ETAPAS_CERRADAS.includes(etapa) ? new Date() : null,
    })
    .returning({ id: leads.id })

  refrescar()
  redirect(`/panel/contactos/${nuevo.id}`)
}

/**
 * Borrar un contacto. Esto NO es del pipeline: cualquier plan puede borrar
 * los datos de una persona que lo pida. Es un derecho suyo (RGPD), no una
 * función de pago.
 */
export async function borrarContacto(id: string): Promise<Resultado> {
  const sesion = await exigirSesion()
  const contacto = await obtenerContacto(sesion.orgId, id)
  if (!contacto) return { ok: false, error: 'Ese contacto no existe.' }

  await db.delete(leads).where(eq(leads.id, id))
  refrescar()
  redirect('/panel/contactos')
}
