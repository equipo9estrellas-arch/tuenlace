import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { blocks, conversions, db, leads, pages } from '@/db'
import type { ConfigFormulario } from '@/bloques/tipos'
import { createEventId } from '@/lib/ids-y-hash'
import { enviarAvisoLead } from '@/lib/mail'
import { detectarOrigen } from '@/lib/analitica'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LONGITUD = 500

/**
 * Recepción de formularios de la página pública.
 *
 * Es un POST de formulario HTML normal, no fetch: así funciona aunque el
 * JavaScript falle. Responde con una redirección 303 a la misma página con
 * ?enviado=1, que es el comportamiento correcto tras un POST.
 */
export async function POST(peticion: Request) {
  const formulario = await peticion.formData()
  const bloqueId = String(formulario.get('bloqueId') ?? '')
  const paginaId = String(formulario.get('paginaId') ?? '')

  // Trampa para bots: un humano nunca rellena este campo.
  if (String(formulario.get('empresa_web') ?? '') !== '') {
    return NextResponse.redirect(new URL('/', peticion.url), 303)
  }

  if (!bloqueId || !paginaId) {
    return NextResponse.redirect(new URL('/', peticion.url), 303)
  }

  const filasBloque = await db
    .select({ id: blocks.id, pageId: blocks.pageId, config: blocks.config, tipo: blocks.tipo })
    .from(blocks)
    .where(eq(blocks.id, bloqueId))
    .limit(1)

  const bloque = filasBloque[0]
  if (!bloque || bloque.pageId !== paginaId || bloque.tipo !== 'FORMULARIO') {
    return NextResponse.redirect(new URL('/', peticion.url), 303)
  }

  const filasPagina = await db
    .select({ slug: pages.slug })
    .from(pages)
    .where(eq(pages.id, paginaId))
    .limit(1)
  const pagina = filasPagina[0]
  if (!pagina) return NextResponse.redirect(new URL('/', peticion.url), 303)

  const config = bloque.config as unknown as ConfigFormulario

  // Solo guardamos los campos que el formulario declara. Nada más.
  const datos: Record<string, string> = {}
  for (const campo of config.campos) {
    const valor = formulario.get(campo)
    if (typeof valor === 'string' && valor.trim()) {
      datos[campo] = valor.trim().slice(0, MAX_LONGITUD)
    }
  }

  if (Object.keys(datos).length === 0) {
    return NextResponse.redirect(new URL(`/${pagina.slug}`, peticion.url), 303)
  }

  const origen = detectarOrigen(peticion.headers.get('referer'), null)

  try {
    await db.insert(leads).values({ pageId: paginaId, datos, origen })

    await db.insert(conversions).values({
      pageId: paginaId,
      tipo: 'LEAD',
      eventId: createEventId(),
      origen,
      metaEstado: 'pendiente',
    })

    if (config.emailAvisos) {
      // No bloqueamos la respuesta esperando al correo.
      void enviarAvisoLead(config.emailAvisos, pagina.slug, datos)
    }
  } catch (error) {
    console.error('[api/lead] No se pudo guardar el contacto:', error)
  }

  return NextResponse.redirect(new URL(`/${pagina.slug}?enviado=1`, peticion.url), 303)
}
