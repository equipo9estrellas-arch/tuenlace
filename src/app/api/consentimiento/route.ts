import { NextResponse } from 'next/server'
import { consentLog, db } from '@/db'
import { ipHash, sessionHash } from '@/lib/ids-y-hash'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Registro de la decisión de consentimiento.
 *
 * Guardar esto es lo que convierte el banner en prueba de cumplimiento en
 * lugar de en decoración. La IP no se almacena: solo su hash con sal.
 */
export async function POST(peticion: Request) {
  try {
    const cuerpo = (await peticion.json()) as {
      paginaId?: string
      analitica?: boolean
      marketing?: boolean
    }
    if (!cuerpo.paginaId) return new NextResponse(null, { status: 204 })

    const ip =
      peticion.headers.get('cf-connecting-ip') ??
      peticion.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      '0.0.0.0'
    const userAgent = peticion.headers.get('user-agent') ?? ''

    await db.insert(consentLog).values({
      pageId: cuerpo.paginaId,
      sessionHash: sessionHash(ip, userAgent),
      decisiones: {
        analitica: cuerpo.analitica === true,
        marketing: cuerpo.marketing === true,
      },
      ipHash: ipHash(ip),
      userAgent: userAgent.slice(0, 500),
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[api/consentimiento] Error:', error)
    return new NextResponse(null, { status: 204 })
  }
}
