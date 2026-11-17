import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/session'
import { MAX_BYTES, MAX_BYTES_VIDEO, subirImagen } from '@/lib/r2'
import { limitesDe } from '@/lib/planes'
import { capacidades } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Subida de una imagen del cliente (logo, portada o imagen de un bloque).
 *
 * Exige sesión: sin ella esto sería un alojamiento de ficheros gratuito y
 * anónimo con nuestro dominio delante, que es exactamente como acaba uno en
 * las listas de phishing de Google.
 *
 * La validación de verdad vive en subirImagen(): tamaño, tipo real leído de
 * los bytes y clave con prefijo de organización.
 */
export async function POST(peticion: Request) {
  const sesion = await obtenerSesion()
  if (!sesion) {
    return NextResponse.json({ ok: false, error: 'Necesitas iniciar sesión.' }, { status: 401 })
  }

  if (!capacidades.almacenamiento) {
    return NextResponse.json(
      { ok: false, error: 'La subida de imágenes todavía no está activada. Pega la URL de la imagen.' },
      { status: 503 },
    )
  }

  // Vídeo de fondo: solo con el plan que lo incluye. Se pide con ?video=1.
  const esVideo = new URL(peticion.url).searchParams.get('video') === '1'
  if (esVideo && !limitesDe(sesion.plan).disenoAvanzado) {
    return NextResponse.json({ ok: false, error: 'El vídeo de fondo es del plan Esencial.' }, { status: 403 })
  }

  // Corte temprano: si la cabecera ya declara un fichero enorme, no leemos el
  // cuerpo entero en memoria solo para rechazarlo después.
  const declarado = Number(peticion.headers.get('content-length') ?? 0)
  if (esVideo && declarado > MAX_BYTES_VIDEO + 8192) {
    return NextResponse.json(
      { ok: false, error: 'El vídeo pesa más de 20 MB. Recórtalo o bájale la calidad.' },
      { status: 413 },
    )
  }
  if (!esVideo && declarado > MAX_BYTES + 8192) {
    return NextResponse.json(
      { ok: false, error: 'La imagen pesa más de 5 MB. Prueba con una más ligera.' },
      { status: 413 },
    )
  }

  let fichero: File | null = null
  try {
    const datos = await peticion.formData()
    const valor = datos.get('fichero')
    if (valor instanceof File) fichero = valor
  } catch {
    return NextResponse.json({ ok: false, error: 'No hemos podido leer el fichero.' }, { status: 400 })
  }

  if (!fichero) {
    return NextResponse.json({ ok: false, error: 'No has elegido ningún fichero.' }, { status: 400 })
  }

  const bytes = new Uint8Array(await fichero.arrayBuffer())
  const resultado = await subirImagen({
    orgId: sesion.orgId,
    nombre: fichero.name,
    bytes,
    tipoDeclarado: fichero.type,
    permitirVideo: esVideo,
  })

  if (!resultado.ok) {
    return NextResponse.json(resultado, { status: 400 })
  }

  return NextResponse.json(resultado)
}
