/**
 * Páginas heredadas del hosting anterior.
 *
 * CONTEXTO (26-10-2026). Estas tres páginas son HTML estático que se subió a
 * mano al cPanel de Raiola cuando tuenlace.es todavía se servía desde allí.
 * Al mover el dominio a Railway, los ficheros se quedaron huérfanos: siguen
 * existiendo en /home/yqyxuwbe/tuenlace.es/<slug>/index.html pero ya no hay
 * nada que los sirva, así que las tres URLs devolvían 404.
 *
 * Importante para no volver a diagnosticarlo mal: estos slugs NUNCA han
 * estado en la base de datos. /api/slug los daba como `libre` mientras
 * 9estrellas y diegoprueba seguían `ocupado`. No fue una regresión de ningún
 * despliegue ni de la migración 0001; no hay un solo DELETE de pages en ella.
 *
 * Mientras estén en esta lista, el slug queda bloqueado en el registro (ver
 * RESERVADAS en slug.ts) para que nadie se lleve la URL de un cliente, y el
 * rewrite de next.config.ts lo sirve desde public/legado/<slug>.html.
 *
 * CÓMO SE QUITA: cuando el cliente tenga su página de verdad en TUENLACE con
 * ese mismo slug, se borra su entrada de aquí y su fichero de public/legado/.
 * Hasta entonces el rewrite tiene prioridad sobre la ruta [slug], así que
 * dejar la entrada puesta ESCONDERÍA la página real.
 */
export const PAGINAS_LEGADO = [
  'canarymototours',
  'dianamarcelino',
  'elhogardelcampista',
] as const

/**
 * Lo que cada página necesita cargar de fuera, por encima de la CSP general
 * del producto. Se declara por página y no en la CSP global: una sola de
 * estas excepciones aplicada a todo el dominio abriría la puerta a inyectar
 * scripts en el panel y en las páginas de los clientes.
 */
export const CSP_LEGADO: Record<string, string> = {
  // Logo servido desde su WordPress. Nada más.
  canarymototours: [
    "default-src 'self'",
    "script-src 'none'",
    "style-src 'unsafe-inline'",
    "img-src https: data:",
    "frame-src 'none'",
    "form-action 'none'",
  ].join('; '),

  elhogardelcampista: [
    "default-src 'self'",
    "script-src 'none'",
    "style-src 'unsafe-inline'",
    "img-src https: data:",
    "frame-src 'none'",
    "form-action 'none'",
  ].join('; '),

  // Esta sí necesita terceros: el formulario es un iframe de GoHighLevel
  // (leadconnectorhq) con su script de redimensionado en link.msgsndr.com, y
  // las tipografías vienen de Google Fonts.
  dianamarcelino: [
    "default-src 'self'",
    "script-src 'self' https://link.msgsndr.com",
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src https: data:",
    "frame-src https://api.leadconnectorhq.com",
    "connect-src https://api.leadconnectorhq.com",
    "form-action https://api.leadconnectorhq.com",
  ].join('; '),
}
