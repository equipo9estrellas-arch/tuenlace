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

function plantilla(titulo: string, cuerpo: string, cta?: { texto: string; url: string }): string {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#FAF8F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#14120F;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:14px;padding:32px;border:1px solid #E9E4DC;">
    <div style="font-weight:700;font-size:15px;letter-spacing:-0.01em;margin-bottom:24px;">TUENLACE</div>
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
    ? 'Pulsa el botón y terminamos de crear tu página. El enlace caduca en 30 minutos.'
    : 'Pulsa el botón para entrar. El enlace caduca en 30 minutos y solo se puede usar una vez.'

  return enviarCorreo({
    para,
    asunto: esNuevo ? 'Termina de crear tu enlace' : 'Tu acceso a TUENLACE',
    html: plantilla(titulo, `<p style="margin:0">${cuerpo}</p>`, { texto: esNuevo ? 'Publicar mi enlace' : 'Entrar', url }),
    texto: `${titulo}\n\n${cuerpo}\n\n${url}\n\nSi no has sido tú, ignora este correo.`,
  })
}

export async function enviarAvisoLead(
  para: string,
  slug: string,
  datos: Record<string, string>,
) {
  const filas = Object.entries(datos)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:7px 12px 7px 0;color:#8A8378;font-size:13px;text-transform:capitalize;">${k}</td><td style="padding:7px 0;font-size:14px;">${v}</td></tr>`,
    )
    .join('')

  return enviarCorreo({
    para,
    asunto: `Nuevo contacto desde tuenlace.es/${slug}`,
    html: plantilla(
      'Tienes un contacto nuevo',
      `<table style="width:100%;border-collapse:collapse;margin-top:8px;">${filas}</table>`,
      { texto: 'Ver todos los contactos', url: `${env.appUrl}/panel` },
    ),
    texto:
      `Nuevo contacto desde tuenlace.es/${slug}\n\n` +
      Object.entries(datos)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n'),
  })
}
