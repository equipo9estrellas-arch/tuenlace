import { CSP_CPANEL, origenCpanel, prepararHtml, urlEnCpanel } from '@/lib/cpanel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Sirve en tuenlace.es/<slug> la página que Diego subió al cPanel.
 *
 * No se llama directamente: el middleware reescribe aquí /<slug> cuando la
 * página existe en el cPanel. Ver src/lib/cpanel.ts.
 */
export async function GET(_peticion: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const url = urlEnCpanel(slug)
  const origen = origenCpanel()
  if (!url || !origen) return noEncontrada()

  let html: string
  try {
    const respuesta = await fetch(url, {
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    })
    const tipo = (respuesta.headers.get('content-type') ?? '').toLowerCase()
    if (!respuesta.ok || !tipo.includes('text/html')) return noEncontrada()
    html = await respuesta.text()
  } catch (error) {
    console.error('[cpanel] no se ha podido leer', url, error)
    return new Response('La página no está disponible ahora mismo. Prueba en un momento.', {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }

  return new Response(prepararHtml(html, slug), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Un minuto en Cloudflare y en el navegador: lo que se sube al cPanel
      // se ve, como mucho, un minuto después.
      'Cache-Control': 'public, max-age=60',
      // Cuando se entra por tuenlace.es/<slug> la pone también el middleware;
      // esta cubre a quien abra /api/cpanel/<slug> directamente.
      'Content-Security-Policy': CSP_CPANEL(origen),
    },
  })
}

function noEncontrada(): Response {
  return new Response('Ese enlace no existe.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
