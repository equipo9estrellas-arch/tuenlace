import { CONTACTO } from './legal'
import { capacidades, env } from './env'

type Correo = {
  para: string
  asunto: string
  html: string
  texto: string
  /** A quién van las respuestas. Por defecto, a la agencia. */
  responderA?: string
  adjuntos?: { nombre: string; contenido: string; tipo: string }[]
}

/**
 * Envío por Resend. Sin RESEND_API_KEY el correo se imprime por consola,
 * que es exactamente lo que hace falta en desarrollo: copias el enlace
 * y entras, sin montar nada.
 */
export async function enviarCorreo(correo: Correo): Promise<{ ok: boolean; error?: string }> {
  if (!capacidades.email) {
    console.info(
      `\n─── CORREO (modo desarrollo, sin RESEND_API_KEY) ───\n` +
        `Para:   ${correo.para}\n` +
        `Asunto: ${correo.asunto}\n\n${correo.texto}\n` +
        `────────────────────────────────────────────────────\n`,
    )
    return { ok: true }
  }

  try {
    const respuesta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.mailFrom,
        // Las respuestas llegan a la agencia, salvo en los correos que manda
        // un negocio a SU cliente (una cita), que le llegan al negocio.
        reply_to: correo.responderA ?? CONTACTO.email,
        to: [correo.para],
        subject: correo.asunto,
        html: correo.html,
        text: correo.texto,
        ...(correo.adjuntos?.length
          ? {
              attachments: correo.adjuntos.map((a) => ({
                filename: a.nombre,
                content: Buffer.from(a.contenido, 'utf8').toString('base64'),
                content_type: a.tipo,
              })),
            }
          : {}),
      }),
    })

    if (!respuesta.ok) {
      const detalle = await respuesta.text()
      console.error('[mail] Resend devolvió error:', respuesta.status, detalle)
      return { ok: false, error: `Resend ${respuesta.status}` }
    }
    return { ok: true }
  } catch (error) {
    console.error('[mail] Fallo de red al enviar:', error)
    return { ok: false, error: 'Error de red' }
  }
}

/**
 * Todo lo que venga de un visitante pasa por aquí antes de entrar en el HTML
 * del correo. Sin esto, cualquiera escribe un enlace en el campo "mensaje" del
 * formulario público y el dueño de la página recibe phishing firmado con SPF y
 * DKIM desde tuenlace.es.
 */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function plantilla(titulo: string, cuerpo: string, cta?: { texto: string; url: string }, pie = 'tuenlace.es'): string {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#FAF8F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#14120F;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:14px;padding:32px;border:1px solid #E9E4DC;">
    <div style="margin-bottom:24px;"><img src="${env.appUrl}/marca/tuenlace.png" width="136" height="27" alt="tuenlace.es" style="display:block;border:0;height:27px;width:136px;"></div>
    <h1 style="font-size:21px;line-height:1.3;margin:0 0 14px;font-weight:650;">${titulo}</h1>
    <div style="font-size:15px;line-height:1.6;color:#3A342C;">${cuerpo}</div>
    ${
      cta
        ? `<div style="margin:26px 0 6px;"><a href="${cta.url}" style="display:inline-block;background:#FF5D2E;color:#fff;text-decoration:none;padding:13px 24px;border-radius:9px;font-weight:600;font-size:15px;">${cta.texto}</a></div>
    <p style="font-size:12px;color:#8A8378;margin-top:18px;line-height:1.5;">Si el botón no funciona, copia esta dirección en tu navegador:<br><span style="color:#5A544C;word-break:break-all;">${cta.url}</span></p>`
        : ''
    }
  </div>
  <p style="max-width:480px;margin:16px auto 0;font-size:12px;color:#8A8378;text-align:center;">${pie}</p>
</body></html>`
}

export async function enviarEnlaceAcceso(para: string, url: string, esNuevo: boolean) {
  const titulo = esNuevo ? 'Vamos a publicar tu enlace' : 'Entra en tu cuenta'
  const cuerpo = esNuevo
    ? 'Pulsa el botón para confirmar tu correo y publicar tu página. El enlace caduca en 30 minutos.'
    : 'Pulsa el botón para entrar. El enlace caduca en 30 minutos y solo se puede usar una vez.'

  return enviarCorreo({
    para,
    asunto: esNuevo ? 'Termina de crear tu enlace' : 'Tu acceso a TUENLACE',
    html: plantilla(titulo, `<p style="margin:0">${cuerpo}</p>`, { texto: esNuevo ? 'Publicar mi enlace' : 'Entrar', url }),
    texto: `${titulo}\n\n${cuerpo}\n\n${url}\n\nSi no has sido tú, ignora este correo.`,
  })
}

export async function enviarEnlaceClave(para: string, url: string, primeraVez: boolean) {
  const titulo = primeraVez ? 'Crea tu contraseña' : 'Cambia tu contraseña'
  const cuerpo = primeraVez
    ? 'Ahora en TUENLACE se entra con correo y contraseña. Pulsa el botón para crear la tuya. El enlace caduca en 30 minutos.'
    : 'Has pedido cambiar tu contraseña. Pulsa el botón para elegir una nueva. El enlace caduca en 30 minutos.'
  return enviarCorreo({
    para,
    asunto: `${titulo} · TUENLACE`,
    html: plantilla(titulo, `<p style="margin:0">${cuerpo}</p>`, { texto: titulo, url }),
    texto: `${titulo}\n\n${cuerpo}\n\n${url}\n\nSi no lo has pedido tú, ignora este correo: tu contraseña no cambia.`,
  })
}

/**
 * Tras pagar con un payment link. Si la cuenta es nueva lleva el enlace para
 * crear la contraseña; si ya tenía, solo confirma el plan y lleva al panel.
 */
export async function enviarBienvenidaPago(
  para: string,
  plan: string,
  enlaceClave: string | null,
  diasValidez: number,
) {
  const titulo = `Tu plan ${plan} ya está activo`
  const cuerpo = enlaceClave
    ? `Gracias por tu pago. Hemos creado tu cuenta de TUENLACE con este correo. Pulsa el botón para crear tu contraseña y montar tu página. El enlace vale ${diasValidez} días; si caduca, pide otro en «¿Has olvidado tu contraseña?».`
    : 'Gracias por tu pago. Ya tienes el plan activo en tu cuenta de TUENLACE. Entra con tu correo y tu contraseña de siempre.'
  const boton = enlaceClave
    ? { texto: 'Crear mi contraseña', url: enlaceClave }
    : { texto: 'Entrar en mi panel', url: `${env.appUrl}/entrar` }
  return enviarCorreo({
    para,
    asunto: `${titulo} · TUENLACE`,
    html: plantilla(titulo, `<p style="margin:0">${cuerpo}</p>`, boton),
    texto: `${titulo}\n\n${cuerpo}\n\n${boton.url}\n\nLas facturas te llegan aparte, de Stripe.`,
  })
}

export async function enviarAvisoLead(
  para: string,
  slug: string,
  datos: Record<string, string>,
  /** Para que el botón del correo lleve a su ficha en el CRM. */
  leadId?: string,
) {
  const filas = Object.entries(datos)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:7px 12px 7px 0;color:#8A8378;font-size:13px;text-transform:capitalize;">${escaparHtml(k)}</td><td style="padding:7px 0;font-size:14px;">${escaparHtml(v)}</td></tr>`,
    )
    .join('')

  return enviarCorreo({
    para,
    asunto: `Nuevo contacto desde tuenlace.es/${slug}`.slice(0, 180),
    html: plantilla(
      'Tienes un contacto nuevo',
      `<table style="width:100%;border-collapse:collapse;margin-top:8px;">${filas}</table>`,
      {
        texto: leadId ? 'Ver el contacto en tu panel' : 'Ver todos los contactos',
        url: `${env.appUrl}/panel/contactos${leadId ? `/${leadId}` : ''}`,
      },
    ),
    texto:
      `Nuevo contacto desde tuenlace.es/${slug}\n\n` +
      Object.entries(datos)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n'),
  })
}

/**
 * Los dos correos de una cita: al cliente que reserva y al negocio. Los dos
 * llevan el botón de Google Calendar y el .ics adjunto (iPhone, Outlook).
 */
export async function enviarCitaAlCliente(d: {
  para: string
  negocio: string
  servicio: string
  cuando: string
  lugar?: string
  enlaceGoogle: string
  ics: string
  responderA?: string
}) {
  const titulo = 'Tu cita está reservada'
  const lineas = [
    `<strong>${escaparHtml(d.servicio)}</strong> con ${escaparHtml(d.negocio)}`,
    escaparHtml(d.cuando),
    ...(d.lugar ? [escaparHtml(d.lugar)] : []),
  ]
  const cuerpo = `<p style="margin:0 0 12px">${lineas.join('<br>')}</p><p style="margin:0">Añádela a tu calendario para que no se te pase. Si usas iPhone u Outlook, abre el archivo adjunto. Si no puedes venir, responde a este correo.</p>`
  return enviarCorreo({
    para: d.para,
    asunto: `Cita reservada: ${d.servicio} · ${d.cuando}`.slice(0, 180),
    html: plantilla(titulo, cuerpo, { texto: 'Añadir a Google Calendar', url: d.enlaceGoogle }, `Reserva hecha a través de la página de ${escaparHtml(d.negocio)} en tuenlace.es`),
    texto: `${titulo}\n\n${d.servicio} con ${d.negocio}\n${d.cuando}${d.lugar ? `\n${d.lugar}` : ''}\n\nAñadir a Google Calendar: ${d.enlaceGoogle}\n\nSi no puedes venir, responde a este correo.`,
    responderA: d.responderA,
    adjuntos: [{ nombre: 'cita.ics', contenido: d.ics, tipo: 'text/calendar' }],
  })
}

export async function enviarCitaAlNegocio(d: {
  para: string
  slug: string
  servicio: string
  cuando: string
  cliente: { nombre: string; telefono?: string | null; email?: string | null; nota?: string | null }
  origen: string
  enlaceGoogle: string
  ics: string
  leadId?: string
}) {
  const titulo = 'Te han reservado una cita'
  const fila = (k: string, v?: string | null) =>
    v ? `<tr><td style="padding:6px 12px 6px 0;color:#8A8378;font-size:13px;">${k}</td><td style="padding:6px 0;font-size:14px;">${escaparHtml(v)}</td></tr>` : ''
  const cuerpo =
    `<p style="margin:0 0 10px"><strong>${escaparHtml(d.servicio)}</strong><br>${escaparHtml(d.cuando)}</p>` +
    `<table style="width:100%;border-collapse:collapse;">${fila('Nombre', d.cliente.nombre)}${fila('Teléfono', d.cliente.telefono)}${fila('Correo', d.cliente.email)}${fila('Nota', d.cliente.nota)}${fila('Llegó desde', d.origen)}</table>` +
    `<p style="margin:16px 0 0;font-size:13px;color:#5A544C;">Ya está en tu pipeline, en «Cita». <a href="${env.appUrl}/panel/contactos${d.leadId ? `/${d.leadId}` : ''}" style="color:#0B5FFF;">Ver el contacto</a></p>`
  return enviarCorreo({
    para: d.para,
    asunto: `Nueva cita: ${d.cliente.nombre} · ${d.cuando}`.slice(0, 180),
    html: plantilla(titulo, cuerpo, { texto: 'Añadir a mi Google Calendar', url: d.enlaceGoogle }),
    texto: `${titulo}\n\n${d.servicio}\n${d.cuando}\n\n${d.cliente.nombre}${d.cliente.telefono ? ` · ${d.cliente.telefono}` : ''}${d.cliente.email ? ` · ${d.cliente.email}` : ''}\nLlegó desde: ${d.origen}\n\nAñadir a Google Calendar: ${d.enlaceGoogle}\n\nVer en tu panel: ${env.appUrl}/panel/contactos`,
    responderA: d.cliente.email ?? undefined,
    adjuntos: [{ nombre: 'cita.ics', contenido: d.ics, tipo: 'text/calendar' }],
  })
}
