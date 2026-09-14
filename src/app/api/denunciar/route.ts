import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db, pages, reports } from '@/db'
import { ipHash } from '@/lib/ids-y-hash'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Denuncia de una página.
 *
 * El botón está en el pie de TODA página pública. No es cortesía: es lo que
 * Google y Meta esperan ver en una plataforma que aloja contenido de terceros,
 * y es la primera línea de detección de phishing.
 *
 * Recordatorio del riesgo (blueprint bloque 3, 8.9): una sola página de
 * phishing puede meter tuenlace.es en Safe Browsing y tumbar TODAS las páginas
 * a la vez, incluidos los enlaces compartidos por WhatsApp.
 */

const MOTIVOS = [
  'Suplanta a una empresa o a una persona',
  'Es una estafa o pide datos bancarios',
  'Contiene virus o enlaces peligrosos',
  'Contenido ilegal o inapropiado',
  'Otro motivo',
]

export async function GET(peticion: Request) {
  const { searchParams } = new URL(peticion.url)
  const pageId = searchParams.get('p') ?? ''

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Denunciar una página · TUENLACE</title><meta name="robots" content="noindex,nofollow">
<style>
  body{margin:0;padding:28px 20px;background:#FAF8F5;color:#14120F;font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  .caja{max-width:440px;margin:0 auto;background:#fff;border:1px solid #E9E4DC;border-radius:14px;padding:26px}
  h1{font-size:21px;margin:0 0 8px;letter-spacing:-.02em}
  p{color:#5A544C;font-size:15px;margin:0 0 18px}
  label{display:block;font-size:14px;font-weight:600;margin:16px 0 6px}
  select,textarea{width:100%;box-sizing:border-box;padding:11px;border:1.5px solid #E9E4DC;border-radius:9px;font:inherit;font-size:15px;background:#FAF8F5}
  button{margin-top:18px;width:100%;height:50px;border:0;border-radius:10px;background:#FF5D2E;color:#fff;font-size:16px;font-weight:600;cursor:pointer}
  a{color:#0B5FFF;font-size:14px}
</style></head>
<body><div class="caja">
  <h1>Denunciar esta página</h1>
  <p>Revisamos todas las denuncias. Si hay riesgo claro, suspendemos la página de inmediato.</p>
  <form method="post" action="/api/denunciar">
    <input type="hidden" name="pageId" value="${pageId.replace(/"/g, '')}">
    <label for="motivo">¿Qué ocurre?</label>
    <select id="motivo" name="motivo" required>
      ${MOTIVOS.map((m) => `<option value="${m}">${m}</option>`).join('')}
    </select>
    <label for="detalle">Cuéntanoslo (opcional)</label>
    <textarea id="detalle" name="detalle" rows="4" maxlength="1000"></textarea>
    <button type="submit">Enviar denuncia</button>
  </form>
  <p style="margin-top:18px"><a href="${env.appUrl}">Volver a TUENLACE</a></p>
</div></body></html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  })
}

export async function POST(peticion: Request) {
  const formulario = await peticion.formData()
  const pageId = String(formulario.get('pageId') ?? '')
  const motivo = String(formulario.get('motivo') ?? '').slice(0, 200)
  const detalle = String(formulario.get('detalle') ?? '').slice(0, 1000)

  if (!pageId || !motivo) {
    return NextResponse.redirect(`${env.appUrl}/`, 303)
  }

  const existe = await db.select({ id: pages.id }).from(pages).where(eq(pages.id, pageId)).limit(1)
  if (existe.length === 0) {
    return NextResponse.redirect(`${env.appUrl}/`, 303)
  }

  const ip =
    peticion.headers.get('cf-connecting-ip') ??
    peticion.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    '0.0.0.0'

  await db.insert(reports).values({
    pageId,
    motivo,
    detalle: detalle || null,
    ipHash: ipHash(ip),
  })

  // Marcamos la página para revisión manual. Los motivos de suplantación y
  // estafa son los que más justifican mirarla el mismo día.
  await db
    .update(pages)
    .set({ revisionPendiente: true })
    .where(eq(pages.id, pageId))

  // Si acumula varias denuncias, se suspende sola y ya la revisamos después:
  // es preferible tirar una página legítima unas horas que dejar viva una
  // de phishing que arrastre al dominio entero.
  const [conteo] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(reports)
    .where(eq(reports.pageId, pageId))

  if ((conteo?.total ?? 0) >= 3) {
    await db
      .update(pages)
      .set({ estado: 'SUSPENDIDA', motivoSuspension: 'Varias denuncias pendientes de revisión' })
      .where(eq(pages.id, pageId))
  }

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Gracias</title>
<meta name="robots" content="noindex,nofollow"></head>
<body style="margin:0;padding:40px 20px;background:#FAF8F5;font:16px/1.5 -apple-system,sans-serif;color:#14120F;text-align:center">
<p style="font-size:32px;margin:0 0 12px">✓</p>
<h1 style="font-size:20px;margin:0 0 10px">Gracias por avisarnos</h1>
<p style="color:#5A544C;font-size:15px;max-width:360px;margin:0 auto">La revisamos lo antes posible.</p>
</body></html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  })
}
