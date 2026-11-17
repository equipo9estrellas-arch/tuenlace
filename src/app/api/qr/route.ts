import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { and, eq } from 'drizzle-orm'
import { db, pages } from '@/db'
import { env } from '@/lib/env'
import { normalizarSlug } from '@/lib/slug'
import { obtenerSesion } from '@/lib/session'
import { limitesDe } from '@/lib/planes'
import { colorValido, textoSobre } from '@/bloques/tema'

export const runtime = 'nodejs'

const TINTA = '#14120F'
const MAX_LOGO = 1_500_000

/**
 * Generación del QR.
 *
 * El QR es lo que saca la página fuera de Instagram — el escaparate, la carta,
 * la tarjeta, la furgoneta — y multiplica la exposición de la marca. Es el
 * bucle de crecimiento más infravalorado del producto, y lo es precisamente
 * porque el negocio físico no suele estar en el punto de mira de esta categoría.
 *
 * El básico es de todos. Con color y logo (plan con `qrPersonalizado`) se
 * devuelve un SVG con el logo incrustado en base64: así el panel lo puede
 * pasar a PNG en el navegador sin que un logo de otro dominio "ensucie" el
 * canvas, y sin meter una librería de imágenes en el servidor.
 */
export async function GET(peticion: Request) {
  const { searchParams } = new URL(peticion.url)
  const slug = normalizarSlug(searchParams.get('slug') ?? '')
  if (!slug) return NextResponse.json({ error: 'Falta el slug' }, { status: 400 })

  const url = `${env.appUrl}/${slug}?utm_source=qr&utm_medium=offline`
  const colorPedido = (searchParams.get('color') ?? '').trim()
  const conLogo = searchParams.get('logo') === '1'

  try {
    if (!colorPedido && !conLogo) {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 720,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: TINTA, light: '#FFFFFF' },
      })
      return NextResponse.json({ dataUrl, url }, { headers: { 'Cache-Control': 'private, max-age=3600' } })
    }

    // Personalizado: solo para su dueño y con el plan que lo incluye.
    const sesion = await obtenerSesion()
    if (!sesion || !limitesDe(sesion.plan).qrPersonalizado) {
      return NextResponse.json({ error: 'El QR con color y logo es del plan Esencial.' }, { status: 403 })
    }
    const [pagina] = await db
      .select({ avatarUrl: pages.avatarUrl })
      .from(pages)
      .where(and(eq(pages.slug, slug), eq(pages.orgId, sesion.orgId)))
      .limit(1)
    if (!pagina) return NextResponse.json({ error: 'Esa página no es tuya.' }, { status: 404 })

    // Un color claro sobre blanco no lo lee ningún móvil: si no da contraste
    // suficiente para texto blanco encima, se usa el negro.
    const oscuro = colorValido(colorPedido) && textoSobre(colorPedido) === '#ffffff' ? colorPedido : TINTA

    let svg = await QRCode.toString(url, {
      type: 'svg',
      margin: 2,
      // Con logo hace falta la corrección alta: el logo tapa parte del código.
      errorCorrectionLevel: conLogo ? 'H' : 'M',
      color: { dark: oscuro, light: '#FFFFFF' },
    })

    const logo = conLogo && pagina.avatarUrl ? await logoEnBase64(pagina.avatarUrl) : null
    if (logo) {
      const lado = Number(svg.match(/viewBox="0 0 (\d+) \d+"/)?.[1] ?? 0)
      if (lado > 0) {
        const tam = lado * 0.22
        const marco = tam + lado * 0.04
        const x = (lado - marco) / 2
        const insercion =
          `<rect x="${x}" y="${x}" width="${marco}" height="${marco}" rx="${marco * 0.2}" fill="#FFFFFF"/>` +
          `<image href="${logo}" x="${(lado - tam) / 2}" y="${(lado - tam) / 2}" width="${tam}" height="${tam}" preserveAspectRatio="xMidYMid slice" clip-path="inset(0 round ${tam * 0.18}px)"/>`
        svg = svg.replace('</svg>', `${insercion}</svg>`)
      }
    }

    return NextResponse.json(
      { svg, url, color: oscuro, conLogo: Boolean(logo) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    console.error('[api/qr] No se pudo generar:', error)
    return NextResponse.json({ error: 'No se pudo generar el QR' }, { status: 500 })
  }
}

/** El logo de la página como data: URI. null si no se puede leer o pesa demasiado. */
async function logoEnBase64(url: string): Promise<string | null> {
  try {
    if (!url.startsWith('https://')) return null
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const tipo = r.headers.get('content-type') ?? ''
    if (!r.ok || !/^image\/(png|jpe?g|webp|gif|svg\+xml)/.test(tipo)) return null
    const datos = Buffer.from(await r.arrayBuffer())
    if (datos.byteLength > MAX_LOGO) return null
    return `data:${tipo.split(';')[0]};base64,${datos.toString('base64')}`
  } catch {
    return null
  }
}
