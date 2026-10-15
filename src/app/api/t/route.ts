import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { blockClicks, blocks, conversions, db } from '@/db'
import { sessionHash } from '@/lib/ids-y-hash'
import { diaLocal } from '@/lib/crypto'
import { esBot, detectarOrigen } from '@/lib/analitica'
import { tipoConversionDe } from '@/bloques/tipos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Registro de clics y conversiones.
 *
 * Recibe sendBeacon desde la página pública. Devuelve 204 siempre que puede:
 * este endpoint nunca debe hacer ruido en la consola del visitante.
 *
 * El event_id se genera AQUÍ, en el servidor, y es la clave de deduplicación
 * con el píxel de navegador (ventana de Meta: 48 horas).
 */
export async function POST(peticion: Request) {
  try {
    const cuerpo = (await peticion.json()) as {
      paginaId?: string
      bloqueId?: string
      origen?: string
    }

    if (!cuerpo.paginaId || !cuerpo.bloqueId) {
      return new NextResponse(null, { status: 204 })
    }

    // Verificamos que el bloque pertenece a esa página: sin esto, cualquiera
    // podría inflar las estadísticas de otro.
    const filas = await db
      .select({ id: blocks.id, pageId: blocks.pageId, tipo: blocks.tipo, config: blocks.config })
      .from(blocks)
      .where(eq(blocks.id, cuerpo.bloqueId))
      .limit(1)

    const bloque = filas[0]
    if (!bloque || bloque.pageId !== cuerpo.paginaId) {
      return new NextResponse(null, { status: 204 })
    }

    const cabeceras = peticion.headers
    const userAgent = cabeceras.get('user-agent') ?? ''
    if (esBot(userAgent)) return new NextResponse(null, { status: 204 })

    const ip =
      cabeceras.get('cf-connecting-ip') ??
      cabeceras.get('x-forwarded-for')?.split(',')[0].trim() ??
      '0.0.0.0'
    const hash = sessionHash(ip, userAgent)

    // El origen se deduce del Referer en el servidor, igual que en page_views.
    // Antes venía en el cuerpo que manda el navegador: era falsificable y, peor,
    // podía no coincidir con el origen de la visita del mismo visitante.
    const origen = detectarOrigen(cabeceras.get('referer'), null)

    await db.insert(blockClicks).values({
      pageId: bloque.pageId,
      blockId: bloque.id,
      origen,
      sessionHash: hash,
    })

    // Si el bloque es de conversión, además la registramos.
    const tipoConversion = tipoConversionDe(bloque.tipo, bloque.config as Record<string, unknown>)
    if (tipoConversion) {
      // event_id DETERMINISTA por bloque, sesión y día.
      //
      // Antes era un UUID nuevo en cada inserción, de modo que el UNIQUE de la
      // columna no deduplicaba nada: pulsar el botón de WhatsApp tres veces
      // —cosa normalísima: pulsa, vuelve, vuelve a pulsar— contaba tres
      // "Contactos" en el panel. La métrica que justifica el precio del
      // producto venía inflada de fábrica. Ahora el UNIQUE hace su trabajo y
      // además el id empareja con el píxel de navegador, que es para lo que se
      // diseñó.
      const eventId = createHash('sha256')
        .update(`${bloque.id}|${hash}|${diaLocal()}`)
        .digest('hex')
        .slice(0, 36)

      await db
        .insert(conversions)
        .values({
          pageId: bloque.pageId,
          tipo: tipoConversion,
          eventId,
          origen,
          metaEstado: 'pendiente',
        })
        .onConflictDoNothing({ target: conversions.eventId })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[api/t] Error registrando el clic:', error)
    return new NextResponse(null, { status: 204 })
  }
}
