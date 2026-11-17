import { exigirSesion } from '@/lib/session'
import { limitesDe } from '@/lib/planes'
import { listarContactos } from '@/lib/crm'
import { etapaDe, nombreOrigen } from '@/lib/crm-etapas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FECHA = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Atlantic/Canary',
})

/**
 * Una celda de CSV a prueba de Excel:
 *  · entre comillas, con las comillas de dentro dobladas;
 *  · y si empieza por = + - @ se le antepone un apóstrofo. Sin eso, un
 *    "nombre" como =HYPERLINK(...) escrito en el formulario de la página se
 *    ejecuta como fórmula al abrir el fichero (inyección de CSV).
 */
function celda(valor: string | number | null | undefined): string {
  let t = valor === null || valor === undefined ? '' : String(valor)
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`
  return `"${t.replace(/"/g, '""')}"`
}

export async function GET() {
  const sesion = await exigirSesion().catch(() => null)
  if (!sesion) return new Response('Inicia sesión.', { status: 401 })
  if (!limitesDe(sesion.plan).exportar) {
    return new Response('Exportar contactos es del plan Esencial.', { status: 403 })
  }

  const contactos = await listarContactos(sesion.orgId)
  const cabecera = ['Nombre', 'Teléfono', 'Correo', 'Mensaje', 'Canal', 'Etapa', 'Importe (€)', 'Llegó', 'Cerrado']
  const filas = contactos.map((c) =>
    [
      c.nombre,
      c.telefono,
      c.email,
      c.mensaje,
      nombreOrigen(c.origen) + (c.manual ? ' (a mano)' : ''),
      etapaDe(c.etapa).nombre,
      c.importeCentimos ? (c.importeCentimos / 100).toFixed(2).replace('.', ',') : '',
      FECHA.format(c.ts),
      c.cerradoEn ? FECHA.format(c.cerradoEn) : '',
    ]
      .map(celda)
      .join(';'),
  )

  // BOM y punto y coma: así lo abre bien el Excel en español, con tildes y
  // cada dato en su columna, sin pasar por "Datos > Desde texto".
  const csv = '﻿' + [cabecera.map(celda).join(';'), ...filas].join('\r\n')
  const hoy = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contactos-${hoy}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
