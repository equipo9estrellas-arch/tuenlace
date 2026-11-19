import { CONTACTO } from './legal'
import { capacidades, env } from './env'

type Correo = {
  para: string
  asunto: string
  html: string
  texto: string
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
        // Las respuestas a cualquier correo de TUENLACE llegan a la agencia.
        reply_to: CONTACTO.email,
        to: [correo.para],
        subject: correo.asunto,
        html: correo.html,
        text: correo.texto,
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

function plantilla(titulo: string, cuerpo: string, cta?: { texto: string; url: string }): string {
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
  <p style="max-width:480px;margin:16px auto 0;font-size:12px;color:#8A8378;text-align:center;">tuenlace.es</p>
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
