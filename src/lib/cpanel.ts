/**
 * PÁGINAS SUBIDAS A MANO AL CPANEL
 *
 * Diego sube páginas HTML al cPanel de Raiola, en
 * /home/yqyxuwbe/tuenlace.es/<slug>/index.html, como hacía cuando el dominio
 * se servía desde allí. Desde que tuenlace.es lo sirve Railway, cada una de
 * esas subidas daba 404 hasta que alguien tocaba el código (El Bocatín,
 * las tres de octubre, venecan-demo...).
 *
 * Esto lo arregla de una vez: esa misma carpeta se publica también en un
 * subdominio (LEGADO_ORIGEN, p. ej. https://paginas.tuenlace.es) y, cuando
 * alguien pide tuenlace.es/<slug>, el middleware pregunta allí si existe.
 * Si existe, se sirve tal cual en tuenlace.es/<slug>. Subir al cPanel vuelve
 * a ser lo único que hay que hacer.
 *
 * Este módulo no importa nada de servidor: lo usa el middleware.
 */

const PATRON_SLUG = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/

/** Sin la variable configurada todo esto está apagado y nada cambia. */
export function origenCpanel(): string | null {
  const origen = (process.env.LEGADO_ORIGEN ?? '').trim().replace(/\/+$/, '')
  return origen.startsWith('https://') || origen.startsWith('http://') ? origen : null
}

/** La URL de la página en el cPanel. Con barra final: es una carpeta. */
export function urlEnCpanel(slug: string): string | null {
  const origen = origenCpanel()
  if (!origen || !PATRON_SLUG.test(slug)) return null
  return `${origen}/${slug}/`
}

/**
 * Lo que se ha preguntado hace poco. Sin esto, cada visita a la página de un
 * cliente costaría una petición a Raiola para descubrir que ahí no hay nada.
 *
 *  · Un sí dura 1 minuto: si se borra del cPanel, deja de verse enseguida.
 *  · Un no dura 1 minuto también: lo que se sube aparece como mucho un minuto
 *    después, sin redesplegar nada.
 *
 * Vive en memoria del proceso, como el limitador del middleware: con una sola
 * instancia en Railway es exacto.
 */
const CACHE = new Map<string, { existe: boolean; caduca: number }>()
const TTL_MS = 60_000
const MAX_ENTRADAS = 5_000

export async function existeEnCpanel(slug: string): Promise<boolean> {
  const url = urlEnCpanel(slug)
  if (!url) return false

  const ahora = Date.now()
  const guardado = CACHE.get(slug)
  if (guardado && guardado.caduca > ahora) return guardado.existe

  let existe = false
  try {
    const respuesta = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      cache: 'no-store',
      // Si Raiola tarda, la página del cliente no puede quedarse esperando.
      signal: AbortSignal.timeout(2_500),
    })
    existe =
      respuesta.status === 200 &&
      (respuesta.headers.get('content-type') ?? '').toLowerCase().includes('text/html')
  } catch {
    // Raiola caído o lento: se responde como si no estuviera. Las páginas de
    // la base de datos no dependen de esto y siguen funcionando.
    existe = false
  }

  if (CACHE.size >= MAX_ENTRADAS) CACHE.clear()
  CACHE.set(slug, { existe, caduca: ahora + TTL_MS })
  return existe
}

/**
 * Prepara el HTML para servirlo desde tuenlace.es/<slug>:
 *
 *  · `<base>` apuntando a la carpeta del cPanel, para que las imágenes, hojas
 *    de estilo y scripts con ruta relativa (img/foto.jpg) se carguen de allí.
 *  · Los enlaces a anclas de la propia página (#contacto) se reescriben a
 *    /<slug>#contacto. Con el <base> puesto, un "#contacto" a secas apuntaría
 *    al subdominio y sacaría al visitante de tuenlace.es.
 *
 * Si la página ya trae su propio <base>, se respeta y no se toca nada.
 */
export function prepararHtml(html: string, slug: string): string {
  const url = urlEnCpanel(slug)
  if (!url || /<base[\s>]/i.test(html)) return html

  const conAnclas = html.replace(/(\shref\s*=\s*["'])#/gi, `$1/${slug}#`)
  const base = `<base href="${url}">`

  if (/<head[^>]*>/i.test(conAnclas)) {
    return conAnclas.replace(/<head[^>]*>/i, (cabeza) => `${cabeza}\n${base}`)
  }
  return `${base}\n${conAnclas}`
}

/**
 * La CSP de estas páginas. Las hace Diego a mano y llevan de todo: píxel de
 * Meta, formularios de GoHighLevel, fuentes, vídeos. La CSP del producto las
 * rompería, así que llevan una abierta. Lo que sí se mantiene: nadie puede
 * meterlas en un iframe ajeno, ni cargar plugins, ni cambiarles el <base> a
 * otro sitio que no sea su carpeta del cPanel.
 */
export function CSP_CPANEL(origen: string): string {
  return [
    "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `base-uri ${origen}/`,
  ].join('; ')
}
