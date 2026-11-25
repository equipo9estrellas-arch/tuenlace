import { NextResponse } from 'next/server'
import { contextoReserva, reservar } from '@/lib/reservas'
import { esBot } from '@/lib/analitica'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST JSON { bloqueId, paginaId, inicio, nombre, telefono?, email?, nota?, origen?, web? }
 * `web` es la trampa para bots: un humano nunca la rellena.
 */
export async function POST(peticion: Request) {
  let cuerpo: Record<string, unknown>
  try {
    cuerpo = (await peticion.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'Petición no válida.' }, { status: 400 })
  }
  const texto = (k: string) => (typeof cuerpo[k] === 'string' ? (cuerpo[k] as string) : '')
  const userAgent = peticion.headers.get('user-agent')

  if (texto('web') !== '' || esBot(userAgent ?? '')) {
    return NextResponse.json({ ok: false, error: 'No se ha podido reservar.' }, { status: 400 })
  }

  const ctx = await contextoReserva(texto('bloqueId'), texto('paginaId'))
  if (!ctx) return NextResponse.json({ ok: false, error: 'Estas reservas no están disponibles.' }, { status: 404 })

  try {
    const r = await reservar(
      ctx,
      {
        inicio: texto('inicio'),
        nombre: texto('nombre'),
        telefono: texto('telefono'),
        email: texto('email'),
        nota: texto('nota'),
        origenPagina: texto('origen'),
      },
      { referer: peticion.headers.get('referer'), userAgent },
    )
    if (!r.ok) return NextResponse.json(r, { status: r.codigo === 'datos' ? 400 : 409 })
    return NextResponse.json({ ok: true, cuando: r.cuando, enlaceGoogle: r.enlaceGoogle, ics: r.ics })
  } catch (error) {
    console.error('[api/reservas] no se ha podido guardar la cita', error)
    return NextResponse.json({ ok: false, error: 'No se ha podido reservar. Inténtalo otra vez.' }, { status: 500 })
  }
}
