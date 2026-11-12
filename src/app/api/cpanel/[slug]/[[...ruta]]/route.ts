import { CSP_CPANEL, origenCpanel, urlEnCpanel } from '@/lib/cpanel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Sirve en tuenlace.es/<slug>/... la carpeta que Diego subió al cPanel: el
 * index, sus otras páginas, imágenes, CSS, JS y fuentes, tal cual.
 *
 * No se llama directamente: el middleware reescribe aquí /<slug>/... cuando
 * la carpeta existe en el cPanel. Ver src/lib/cpanel.ts.
 */
type Contexto = { params: Promise<{ slug: string; ruta?: string[] }> }

/** Cabeceras del cPanel que tiene sentido reenviar. El resto se descarta. */
const REENVIAR = ['content-type', 'cache-control', 'last-modified', 'etag', 'content-language']

async function servir(peticion: Request, { params }: Contexto, conCuerpo: boolean): Promise<Response> {
  const { slug, ruta = [] } = await params
  const pedida = new URL(peticion.url)
  const conBarra = pedida.pathname.endsWith('/')
  const url = urlEnCpanel(slug, ruta.join('/') + (conBarra && ruta.length ? '/' : ''))
  const origen = origenCpanel()
  if (!url || !origen) return noEncontrada()

  let respuesta: Response
  try {
    respuesta = await fetch(url + pedida.search, {
      method: conCuerpo ? 'GET' : 'HEAD',
      redirect: 'manual',
      cache: 'no-store',
      headers: {
        accept: peticion.headers.get('accept') ?? '*/*',
        ...(peticion.headers.get('if-none-match')
          ? { 'if-none-match': peticion.headers.get('if-none-match')! }
          : {}),
        ...(peticion.headers.get('if-modified-since')
          ? { 'if-modified-since': peticion.headers.get('if-modified-since')! }
          : {}),
      },
      signal: AbortSignal.timeout(15_000),
    })
  } catch (error) {
    console.error('[cpanel] no se ha podido leer', url, error)
    return new Response('La página no está disponible ahora mismo. Prueba en un momento.', {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }

  // Apache redirige una carpeta sin barra (sub → sub/) a SU dominio. Se
  // traduce para que el visitante siga en tuenlace.es.
  if (respuesta.status >= 300 && respuesta.status < 400 && respuesta.status !== 304) {
    const destino = respuesta.headers.get('location') ?? ''
    const local = destino.startsWith(origen) ? destino.slice(origen.length) || '/' : destino
    return new Response(null, {
      status: respuesta.status,
      headers: { Location: local, 'Cache-Control': 'no-store' },
    })
  }

  if (respuesta.status === 404 || respuesta.status === 403) return noEncontrada()

  const cabeceras = new Headers()
  for (const nombre of REENVIAR) {
    const valor = respuesta.headers.get(nombre)
    if (valor) cabeceras.set(nombre, valor)
  }
  // Sin cache-control del cPanel: un minuto para el HTML (lo que se sube se
  // ve enseguida) y una hora para lo demás.
  if (!cabeceras.has('cache-control')) {
    const esHtml = (cabeceras.get('content-type') ?? '').includes('text/html')
    cabeceras.set('Cache-Control', `public, max-age=${esHtml ? 60 : 3600}`)
  }
  cabeceras.set('Content-Security-Policy', CSP_CPANEL())

  return new Response(conCuerpo ? respuesta.body : null, {
    status: respuesta.status,
    headers: cabeceras,
  })
}

export function GET(peticion: Request, contexto: Contexto) {
  return servir(peticion, contexto, true)
}

export function HEAD(peticion: Request, contexto: Contexto) {
  return servir(peticion, contexto, false)
}

function noEncontrada(): Response {
  return new Response('Ese enlace no existe.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
