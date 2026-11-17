/**
 * Política de seguridad de contenidos del producto.
 *
 * `unsafe-inline` en style es inevitable: el tema de cada página se inyecta
 * como variables CSS en el atributo style del <main>. En script hace falta por
 * el JSON-LD; el día que se quite ese bloque, se quita de aquí.
 *
 * img-src admite https: entero a propósito: el editor permite pegar la URL de
 * una imagen alojada en cualquier sitio, que es justo lo que hace un cliente
 * que ya tiene su logo en su web.
 *
 * DÓNDE SE APLICA. Las rutas de un solo segmento (/<slug>, /panel, /crear...)
 * la reciben del middleware; el resto, de next.config. Es así porque una
 * página subida al cPanel (ver cpanel.ts) necesita otra CSP, y next.config
 * pisa cualquier cabecera que intente ponerle el middleware o la ruta.
 */
/** Los reproductores del bloque de vídeo. Solo estos tres, nada más. */
const REPRODUCTORES = 'https://www.youtube-nocookie.com https://www.tiktok.com https://player.vimeo.com'

export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  `frame-src ${REPRODUCTORES}`,
  "form-action 'self' https://api.leadconnectorhq.com",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ')

/**
 * La de las páginas públicas de los clientes (/<slug>): la del producto más
 * el píxel de Meta y Google Analytics, que el plan Esencial puede activar.
 * Va aparte para que el panel, donde está la sesión, no cargue nunca scripts
 * de terceros. Y aun en la página pública, el script solo se pide después
 * del consentimiento (ver [slug]/Seguimiento.tsx).
 */
export const CSP_PUBLICA = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://www.facebook.com https://connect.facebook.net https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  `frame-src ${REPRODUCTORES}`,
  "form-action 'self' https://api.leadconnectorhq.com",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ')
