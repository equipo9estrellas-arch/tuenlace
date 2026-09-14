import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { env } from '@/lib/env'
import { normalizarSlug } from '@/lib/slug'

export const runtime = 'nodejs'

/**
 * Generación del QR.
 *
 * El QR es lo que saca la página fuera de Instagram — el escaparate, la carta,
 * la tarjeta, la furgoneta — y multiplica la exposición de la marca. Es el
 * bucle de crecimiento más infravalorado del producto, y Linktree no lo piensa
 * porque no diseña para negocios físicos.
 */
export async function GET(peticion: Request) {
  const { searchParams } = new URL(peticion.url)
  const slug = normalizarSlug(searchParams.get('slug') ?? '')
  if (!slug) return NextResponse.json({ error: 'Falta el slug' }, { status: 400 })

  const url = `${env.appUrl}/${slug}?utm_source=qr&utm_medium=offline`

  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#14120F', light: '#FFFFFF' },
    })
    return NextResponse.json(
      { dataUrl, url },
      { headers: { 'Cache-Control': 'private, max-age=3600' } },
    )
  } catch (error) {
    console.error('[api/qr] No se pudo generar:', error)
    return NextResponse.json({ error: 'No se pudo generar el QR' }, { status: 500 })
  }
}
