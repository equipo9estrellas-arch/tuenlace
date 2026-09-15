import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/session'
import { MAX_BYTES, subirImagen } from '@/lib/r2'
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

  // Corte temprano: si la cabecera ya declara un fichero enorme, no leemos el
  // cuerpo entero en memoria solo para rechazarlo después.
  const declarado = Number(peticion.headers.get('content-length') ?? 0)
  if (declarado > MAX_BYTES + 8192) {
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
  })

  if (!resultado.ok) {
    return NextResponse.json(resultado, { status: 400 })
  }

  return NextResponse.json(resultado)
}
