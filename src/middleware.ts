import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { CSP_CPANEL, existeEnCpanel, origenCpanel } from '@/lib/cpanel'
import { CSP } from '@/lib/csp'
import { PAGINAS_LEGADO } from '@/lib/legado'
import { RESERVADAS } from '@/lib/slug'

/**
 * LIMITACIÓN DE PETICIONES
 *
 * Antes no había ninguna en todo el proyecto. Con el paginaId y el bloqueId
 * impresos en el HTML de cada página pública, un bucle de curl bastaba para:
 *   - multiplicar por mil las métricas del panel de un cliente (/api/t),
 *   - hacer spam de leads y de correo al dueño (/api/lead),
 *   - suspender cualquier página (/api/denunciar),
 *   - enumerar qué slugs están cogidos (/api/slug),
 *   - mandar correos a direcciones ajenas desde tuenlace.es (/crear).
 *
 * El contador vive en memoria del proceso. Es deliberado: con una sola
 * instancia en Railway es exacto, no añade dependencias y no mete un viaje a
 * la base de datos en el camino que precisamente queremos proteger. Si algún
 * día hay varias instancias, esto pasa a ser un suelo (cada una limita lo
 * suyo) y el techo real lo pone Cloudflare Rate Limiting, que ya está delante.
 */

type Cubo = { contador: number; reinicioEn: number }

const CUBOS = new Map<string, Cubo>()

/** Techo de entradas: una IP por clave y ruta. Evita que el mapa crezca sin fin. */
const MAX_ENTRADAS = 50_000

type Regla = { ventanaMs: number; maximo: number }

const REGLAS: Array<{ prefijo: string; regla: Regla }> = [
  // Clics: 60/min deja pasar al visitante más nervioso y corta el bucle.
  { prefijo: '/api/t', regla: { ventanaMs: 60_000, maximo: 60 } },
  // Formularios: nadie rellena 10 en una hora desde la misma IP.
  { prefijo: '/api/lead', regla: { ventanaMs: 3_600_000, maximo: 10 } },
  // Denuncias: el índice único ya impide la segunda por página; esto corta el
  // barrido contra muchas páginas distintas.
  { prefijo: '/api/denunciar', regla: { ventanaMs: 3_600_000, maximo: 5 } },
  { prefijo: '/api/consentimiento', regla: { ventanaMs: 3_600_000, maximo: 30 } },
  // Comprobación de slug: es teclear en un campo, pero una consulta por pulsación.
  { prefijo: '/api/slug', regla: { ventanaMs: 60_000, maximo: 40 } },
  // QR: genera una imagen de 720 px, cuesta CPU.
  { prefijo: '/api/qr', regla: { ventanaMs: 60_000, maximo: 20 } },
  // Subida de imágenes: exige sesión, pero no tenía cuota de ningún tipo.
  { prefijo: '/api/subir', regla: { ventanaMs: 3_600_000, maximo: 40 } },
  // Webhook de Stripe: generoso porque Stripe reintenta, pero acotado para
  // que nadie pruebe firmas a ciegas contra el endpoint que sube los planes.
  { prefijo: '/api/stripe', regla: { ventanaMs: 60_000, maximo: 120 } },
  // Alta: cada POST aquí manda un correo con Resend.
  { prefijo: '/crear', regla: { ventanaMs: 3_600_000, maximo: 10 } },
  // Enlace mágico: limita también el goteo de tokens válidos simultáneos.
  { prefijo: '/entrar', regla: { ventanaMs: 3_600_000, maximo: 15 } },
]

function reglaDe(ruta: string): { prefijo: string; regla: Regla } | null {
  return REGLAS.find((r) => ruta === r.prefijo || ruta.startsWith(`${r.prefijo}/`)) ?? null
}

function ipDe(peticion: NextRequest): string {
  return (
    peticion.headers.get('cf-connecting-ip') ??
    peticion.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    peticion.headers.get('x-real-ip') ??
    '0.0.0.0'
  )
}

function limpiarSiHaceFalta(ahora: number): void {
  if (CUBOS.size < MAX_ENTRADAS) return
  for (const [clave, cubo] of CUBOS) {
    if (cubo.reinicioEn <= ahora) CUBOS.delete(clave)
  }
  // Si aún así sigue lleno, vaciamos: perder contadores es mucho menos grave
  // que quedarse sin memoria.
  if (CUBOS.size >= MAX_ENTRADAS) CUBOS.clear()
}

/** true si la petición se pasa del límite. */
function superaLimite(clave: string, regla: Regla): { superado: boolean; restan: number; esperaS: number } {
  const ahora = Date.now()
  limpiarSiHaceFalta(ahora)

  const cubo = CUBOS.get(clave)
  if (!cubo || cubo.reinicioEn <= ahora) {
    CUBOS.set(clave, { contador: 1, reinicioEn: ahora + regla.ventanaMs })
    return { superado: false, restan: regla.maximo - 1, esperaS: 0 }
  }

  cubo.contador += 1
  const esperaS = Math.max(1, Math.ceil((cubo.reinicioEn - ahora) / 1000))
  return {
    superado: cubo.contador > regla.maximo,
    restan: Math.max(0, regla.maximo - cubo.contador),
    esperaS,
  }
}

/**
 * ¿Es /<slug> una página subida a mano al cPanel? Ver src/lib/cpanel.ts.
 *
 * Se mira antes que la base de datos porque el middleware no tiene acceso a
 * ella. No pisa a nadie: slugDisponible() da por ocupado lo que ya existe en
 * el cPanel, así que nadie puede registrar un slug que esté allí.
 */
const UN_SEGMENTO = /^\/([a-z0-9][a-z0-9-]{1,28}[a-z0-9])$/
const LEGADO = new Set<string>(PAGINAS_LEGADO)

async function paginaDelCpanel(peticion: NextRequest): Promise<NextResponse | null> {
  if (!origenCpanel()) return null
  if (peticion.method !== 'GET' && peticion.method !== 'HEAD') return null

  const slug = UN_SEGMENTO.exec(peticion.nextUrl.pathname)?.[1]
  if (!slug || RESERVADAS.has(slug) || LEGADO.has(slug)) return null
  if (!(await existeEnCpanel(slug))) return null

  const destino = peticion.nextUrl.clone()
  destino.pathname = `/api/cpanel/${slug}`
  const respuesta = NextResponse.rewrite(destino)
  // Va aquí y no en la ruta: la CSP general de next.config pisa la que pone
  // un route handler, pero no la que pone el middleware.
  respuesta.headers.set('Content-Security-Policy', CSP_CPANEL(origenCpanel()!))
  return respuesta
}

export async function middleware(peticion: NextRequest) {
  const delCpanel = await paginaDelCpanel(peticion)
  if (delCpanel) return delCpanel

  const respuesta = limitar(peticion)

  // Las rutas de un solo segmento reciben aquí la CSP del producto (ver
  // src/lib/csp.ts). Las páginas heredadas no: llevan la suya en next.config.
  const segmento = /^\/([^/]+)$/.exec(peticion.nextUrl.pathname)?.[1]
  if (segmento && !LEGADO.has(segmento)) {
    respuesta.headers.set('Content-Security-Policy', CSP)
  }
  return respuesta
}

function limitar(peticion: NextRequest): NextResponse {
  // Solo se limita lo que escribe o cuesta. Las páginas públicas se sirven sin
  // tocar este contador.
  const metodo = peticion.method
  const ruta = peticion.nextUrl.pathname

  const encontrada = reglaDe(ruta)
  if (!encontrada) return NextResponse.next()

  // En /crear y /entrar solo limitamos los envíos, no la carga del formulario.
  const esLectura = metodo === 'GET' || metodo === 'HEAD'
  if (esLectura && (encontrada.prefijo === '/crear' || encontrada.prefijo === '/entrar')) {
    return NextResponse.next()
  }

  const { superado, restan, esperaS } = superaLimite(
    `${encontrada.prefijo}|${ipDe(peticion)}`,
    encontrada.regla,
  )

  if (!superado) {
    const respuesta = NextResponse.next()
    respuesta.headers.set('X-RateLimit-Remaining', String(restan))
    return respuesta
  }

  // 204 en los endpoints de telemetría: son sendBeacon, nadie lee la respuesta
  // y un 429 solo serviría para que el atacante afine el bucle.
  if (ruta.startsWith('/api/t') || ruta.startsWith('/api/consentimiento')) {
    return new NextResponse(null, { status: 204 })
  }

  return new NextResponse('Demasiadas peticiones. Inténtalo de nuevo en un momento.', {
    status: 429,
    headers: {
      'Retry-After': String(esperaS),
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

export const config = {
  // '/:slug' es un solo segmento: las páginas públicas, por si alguna está
  // en el cPanel. Las demás siguen su camino sin coste salvo una consulta
  // cacheada por minuto.
  matcher: ['/api/:ruta*', '/crear/:ruta*', '/crear', '/entrar/:ruta*', '/entrar', '/:slug'],
}
