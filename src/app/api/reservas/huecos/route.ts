import { NextResponse } from 'next/server'
import { contextoReserva, huecosLibres } from '@/lib/reservas'
import { esFecha } from '@/bloques/reservas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET ?b=<bloque>&p=<página>&f=2026-11-27 → las horas libres de ese día. */
export async function GET(peticion: Request) {
  const url = new URL(peticion.url)
  const fecha = url.searchParams.get('f') ?? ''
  if (!esFecha(fecha)) return NextResponse.json({ huecos: [] }, { status: 400 })
  const ctx = await contextoReserva(url.searchParams.get('b') ?? '', url.searchParams.get('p') ?? '')
  if (!ctx) return NextResponse.json({ huecos: [] }, { status: 404 })
  const huecos = await huecosLibres(ctx, fecha)
  return NextResponse.json({ huecos }, { headers: { 'Cache-Control': 'no-store' } })
}
