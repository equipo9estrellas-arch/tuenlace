import 'server-only'
import { createHash, createHmac } from 'node:crypto'
import { env } from './env'

/**
 * Subida de imágenes a Cloudflare R2.
 *
 * Por qué a mano y no con @aws-sdk/client-s3: el SDK pesa varios megas y trae
 * decenas de dependencias para hacer exactamente una petición PUT firmada. La
 * firma SigV4 es un algoritmo cerrado y determinista; está abajo en 60 líneas
 * y hay un test contra el vector oficial de AWS en prueba-e2e.ts. Menos
 * superficie que auditar y un bundle de servidor mucho más pequeño.
 *
 * R2 no cobra tráfico de salida, así que servir las imágenes desde el dominio
 * público del bucket no tiene coste variable. Esa es la razón de elegirlo
 * frente a S3 para un producto donde cada página es imagen + botones.
 */

// ── Firma AWS SigV4 ──────────────────────────────────────────────────────────

const REGION = 'auto' // R2 siempre usa 'auto'
const SERVICIO = 's3'

function sha256(dato: string | Buffer): string {
  return createHash('sha256').update(dato).digest('hex')
}

function hmac(clave: string | Buffer, dato: string): Buffer {
  return createHmac('sha256', clave).update(dato, 'utf8').digest()
}

/** Codificación de la URI tal y como la exige SigV4: '/' se conserva. */
function codificarRuta(ruta: string): string {
  return ruta
    .split('/')
    .map((seg) => encodeURIComponent(seg).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`))
    .join('/')
}

export type PeticionFirmada = {
  url: string
  metodo: string
  cabeceras: Record<string, string>
}

/**
 * Firma una petición a un endpoint compatible con S3.
 *
 * Exportada para poder probarla contra el vector oficial de AWS sin tocar red.
 */
export function firmarPeticion(opciones: {
  metodo: string
  host: string
  ruta: string
  cuerpoHash: string
  /** Cabeceras a firmar además de host y x-amz-date. En minúsculas. */
  cabecerasExtra?: Record<string, string>
  accessKeyId: string
  secretAccessKey: string
  region?: string
  servicio?: string
  /** Solo para los tests: fija el instante de la firma. */
  fecha?: Date
}): PeticionFirmada {
  const region = opciones.region ?? REGION
  const servicio = opciones.servicio ?? SERVICIO
  const ahora = opciones.fecha ?? new Date()

  const marca = ahora.toISOString().replace(/[:-]|\.\d{3}/g, '') // 20260915T101010Z
  const dia = marca.slice(0, 8)

  const cabeceras: Record<string, string> = {
    host: opciones.host,
    'x-amz-date': marca,
    ...Object.fromEntries(
      Object.entries(opciones.cabecerasExtra ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
    ),
  }

  const nombresOrdenados = Object.keys(cabeceras).sort()
  const cabecerasCanonicas = nombresOrdenados
    .map((n) => `${n}:${cabeceras[n].trim().replace(/\s+/g, ' ')}\n`)
    .join('')
  const firmadas = nombresOrdenados.join(';')

  const peticionCanonica = [
    opciones.metodo,
    codificarRuta(opciones.ruta),
    '', // sin query
    cabecerasCanonicas,
    firmadas,
    opciones.cuerpoHash,
  ].join('\n')

  const alcance = `${dia}/${region}/${servicio}/aws4_request`
  const porFirmar = ['AWS4-HMAC-SHA256', marca, alcance, sha256(peticionCanonica)].join('\n')

  const kFecha = hmac(`AWS4${opciones.secretAccessKey}`, dia)
  const kRegion = hmac(kFecha, region)
  const kServicio = hmac(kRegion, servicio)
  const kFirma = hmac(kServicio, 'aws4_request')
  const firma = createHmac('sha256', kFirma).update(porFirmar, 'utf8').digest('hex')

  return {
    url: `https://${opciones.host}${codificarRuta(opciones.ruta)}`,
    metodo: opciones.metodo,
    cabeceras: {
      ...cabeceras,
      Authorization: `AWS4-HMAC-SHA256 Credential=${opciones.accessKeyId}/${alcance}, SignedHeaders=${firmadas}, Signature=${firma}`,
    },
  }
}

// ── Reglas de subida ─────────────────────────────────────────────────────────

/**
 * Formatos aceptados.
 *
 * SVG queda fuera a propósito: un SVG es un documento que puede llevar
 * JavaScript, y servirlo desde nuestro dominio sería un XSS almacenado. No hay
 * forma segura de aceptarlo sin sanearlo, y no compensa.
 */
export const TIPOS_IMAGEN: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
}

export const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

/**
 * Comprueba que los bytes son de verdad la imagen que dice el tipo MIME.
 *
 * El `type` que manda el navegador lo pone el navegador: un .php renombrado a
 * .jpg llega con `image/jpeg`. Miramos los primeros bytes del fichero.
 */
export function formatoReal(bytes: Uint8Array): string | null {
  const b = bytes
  if (b.length < 12) return null

  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif'

  const marca = String.fromCharCode(b[0], b[1], b[2], b[3])
  const tipo = String.fromCharCode(b[8], b[9], b[10], b[11])
  if (marca === 'RIFF' && tipo === 'WEBP') return 'image/webp'

  // AVIF y HEIF comparten contenedor ISOBMFF: 'ftyp' en los bytes 4..8
  const ftyp = String.fromCharCode(b[4], b[5], b[6], b[7])
  if (ftyp === 'ftyp' && (tipo === 'avif' || tipo === 'avis')) return 'image/avif'

  return null
}

export type ResultadoSubida =
  | { ok: true; url: string }
  | { ok: false; error: string }

/**
 * Sube un fichero al bucket y devuelve su URL pública.
 *
 * La clave lleva el id de la organización por delante para que, el día que
 * haya que borrar todo lo de un cliente, sea un prefijo y no una búsqueda.
 */
export async function subirImagen(opciones: {
  orgId: string
  nombre: string
  bytes: Uint8Array
  tipoDeclarado: string
}): Promise<ResultadoSubida> {
  if (!env.r2AccountId || !env.r2Bucket || !env.r2PublicUrl) {
    return { ok: false, error: 'La subida de imágenes todavía no está configurada.' }
  }
  if (opciones.bytes.length === 0) {
    return { ok: false, error: 'El fichero está vacío.' }
  }
  if (opciones.bytes.length > MAX_BYTES) {
    return { ok: false, error: 'La imagen pesa más de 5 MB. Prueba con una más ligera.' }
  }

  const real = formatoReal(opciones.bytes)
  if (!real || !TIPOS_IMAGEN[real]) {
    return { ok: false, error: 'Ese fichero no es una imagen válida (JPG, PNG, WebP, AVIF o GIF).' }
  }
  if (opciones.tipoDeclarado && opciones.tipoDeclarado !== real) {
    return { ok: false, error: 'El fichero no coincide con su extensión.' }
  }

  const extension = TIPOS_IMAGEN[real]
  const aleatorio = createHash('sha256')
    .update(`${Date.now()}-${opciones.nombre}-${Math.random()}`)
    .digest('hex')
    .slice(0, 16)
  const clave = `${opciones.orgId}/${aleatorio}.${extension}`

  const cuerpo = Buffer.from(opciones.bytes)
  const firmada = firmarPeticion({
    metodo: 'PUT',
    host: `${env.r2Bucket}.${env.r2AccountId}.r2.cloudflarestorage.com`,
    ruta: `/${clave}`,
    cuerpoHash: sha256(cuerpo),
    cabecerasExtra: {
      // S3 exige que el hash del cuerpo vaya firmado, no solo en la firma.
      'x-amz-content-sha256': sha256(cuerpo),
      'content-type': real,
      'content-length': String(cuerpo.length),
      // Un año de caché: la clave lleva un hash, así que una imagen distinta
      // tiene siempre una URL distinta. Nunca hay que invalidar nada.
      'cache-control': 'public, max-age=31536000, immutable',
    },
    accessKeyId: env.r2AccessKeyId,
    secretAccessKey: env.r2SecretAccessKey,
  })

  try {
    const respuesta = await fetch(firmada.url, {
      method: 'PUT',
      headers: firmada.cabeceras,
      body: cuerpo,
    })

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '')
      console.error('[r2] la subida falló', respuesta.status, detalle.slice(0, 400))
      return { ok: false, error: 'No hemos podido guardar la imagen. Inténtalo otra vez.' }
    }
  } catch (error) {
    console.error('[r2] error de red', error)
    return { ok: false, error: 'No hemos podido guardar la imagen. Inténtalo otra vez.' }
  }

  return { ok: true, url: `${env.r2PublicUrl}/${clave}` }
}
