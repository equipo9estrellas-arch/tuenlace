import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { blockClicks, blocks, conversions, db } from '@/db'
import { createEventId, sessionHash } from '@/lib/ids-y-hash'
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
    const ip =
      cabeceras.get('cf-connecting-ip') ??
      cabeceras.get('x-forwarded-for')?.split(',')[0].trim() ??
      '0.0.0.0'
    const hash = sessionHash(ip, cabeceras.get('user-agent') ?? '')
    const origen = cuerpo.origen?.slice(0, 32) ?? null

    await db.insert(blockClicks).values({
      pageId: bloque.pageId,
      blockId: bloque.id,
      origen,
      sessionHash: hash,
    })

    // Si el bloque es de conversión, además la registramos.
    const tipoConversion = tipoConversionDe(bloque.tipo, bloque.config as Record<string, unknown>)
    if (tipoConversion) {
      await db.insert(conversions).values({
        pageId: bloque.pageId,
        tipo: tipoConversion,
        eventId: createEventId(),
        origen,
        metaEstado: 'pendiente',
      })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[api/t] Error registrando el clic:', error)
    return new NextResponse(null, { status: 204 })
  }
}
