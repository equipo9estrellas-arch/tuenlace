/**
 * Cálculo de las reservas. Puro: sin base de datos ni servidor, para poder
 * usarlo en el navegador, en la API y en los tests.
 *
 * Todo lo que el dueño configura está en hora local (la de la península o la
 * de Canarias). Lo que se guarda y se compara es siempre un instante UTC.
 */

import { leerTramos } from './medios'
import { DIAS_SEMANA, type ConfigReserva, type DiaSemana } from './tipos'

export type Hueco = { inicio: string; fin: string; etiqueta: string }

export function zonaDe(config: Pick<ConfigReserva, 'canarias'>): string {
  return config.canarias ? 'Atlantic/Canary' : 'Europe/Madrid'
}

const numero = (v: unknown, defecto: number, min: number, max: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defecto
}

export function parametros(config: ConfigReserva) {
  return {
    duracion: numero(config.duracion, 30, 10, 480),
    antelacionMs: numero(config.antelacion, 2, 0, 24 * 14) * 3_600_000,
    diasVista: numero(config.diasVista, 30, 1, 90),
    zona: zonaDe(config),
  }
}

/** Minutos que la zona va por delante de UTC en ese instante. */
function desfase(zona: string, instante: number): number {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(instante))
  const v = (t: string) => Number(p.find((x) => x.type === t)?.value)
  const comoUtc = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour') % 24, v('minute'))
  return Math.round((comoUtc - instante) / 60_000)
}

/** «2026-11-27» a las 570 minutos (9:30) en esa zona → instante UTC. */
export function instanteLocal(fecha: string, minuto: number, zona: string): Date {
  const [y, m, d] = fecha.split('-').map(Number)
  const ingenuo = Date.UTC(y, m - 1, d, 0, minuto)
  // Dos pasadas: la segunda corrige los días de cambio de hora.
  let t = ingenuo - desfase(zona, ingenuo) * 60_000
  t = ingenuo - desfase(zona, t) * 60_000
  return new Date(t)
}

/** La fecha local («2026-11-27») de un instante en esa zona. */
export function fechaLocal(instante: Date, zona: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    instante,
  )
}

export function diaSemanaDe(fecha: string): DiaSemana {
  const [y, m, d] = fecha.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0 = domingo
  return DIAS_SEMANA[(dow + 6) % 7]
}

export function esFecha(valor: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(`${valor}T00:00:00Z`))
}

function sumarDias(fecha: string, n: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function hhmm(minuto: number): string {
  const h = Math.floor(minuto / 60) % 24
  return `${h}:${String(minuto % 60).padStart(2, '0')}`
}

/**
 * Los huecos libres de un día.
 *
 * `ocupadas` son las citas confirmadas que se solapan con ese día. Un hueco
 * sale si cabe entero en un tramo, empieza después de la antelación mínima,
 * está dentro de los días vista y no pisa ninguna cita.
 */
export function huecosDelDia(
  config: ConfigReserva,
  fecha: string,
  ocupadas: { inicio: Date; fin: Date }[],
  ahora = new Date(),
): Hueco[] {
  if (!esFecha(fecha)) return []
  const { duracion, antelacionMs, diasVista, zona } = parametros(config)
  const hoy = fechaLocal(ahora, zona)
  if (fecha < hoy || fecha > sumarDias(hoy, diasVista)) return []

  const tramos = leerTramos(config.dias?.[diaSemanaDe(fecha)] ?? '') ?? []
  const minimo = ahora.getTime() + antelacionMs
  const salida: Hueco[] = []

  for (const [ini, finTramo] of tramos) {
    const fin = Math.min(finTramo, 1440)
    for (let m = ini; m + duracion <= fin; m += duracion) {
      const inicio = instanteLocal(fecha, m, zona)
      const finHueco = new Date(inicio.getTime() + duracion * 60_000)
      if (inicio.getTime() < minimo) continue
      if (ocupadas.some((o) => o.inicio < finHueco && o.fin > inicio)) continue
      salida.push({ inicio: inicio.toISOString(), fin: finHueco.toISOString(), etiqueta: hhmm(m) })
    }
  }
  return salida
}

/** Los días que se enseñan en la tira del calendario: los que tienen horas. */
export function diasReservables(config: ConfigReserva, ahora = new Date()): string[] {
  const { diasVista, zona, antelacionMs } = parametros(config)
  const hoy = fechaLocal(ahora, zona)
  const salida: string[] = []
  for (let i = 0; i <= diasVista; i++) {
    const fecha = sumarDias(hoy, i)
    const tramos = leerTramos(config.dias?.[diaSemanaDe(fecha)] ?? '') ?? []
    if (tramos.length === 0) continue
    // Un día cuyo último tramo ya ha pasado (o no llega a la antelación) no sale.
    const ultimoFin = Math.max(...tramos.map(([, f]) => Math.min(f, 1440)))
    if (instanteLocal(fecha, ultimoFin, zona).getTime() <= ahora.getTime() + antelacionMs) continue
    salida.push(fecha)
  }
  return salida
}

// ── Fechas legibles ─────────────────────────────────────────────────────────

export function fechaLegible(inicio: Date, zona: string): string {
  const texto = new Intl.DateTimeFormat('es-ES', {
    timeZone: zona,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(inicio)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function diaCorto(fecha: string): { semana: string; dia: string; mes: string } {
  const d = new Date(`${fecha}T12:00:00Z`)
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', ...o }).format(d)
  return { semana: f({ weekday: 'short' }).replace('.', ''), dia: f({ day: 'numeric' }), mes: f({ month: 'short' }).replace('.', '') }
}

// ── Calendarios: Google y .ics (Apple, Outlook) ──────────────────────────────

const compacta = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export type EventoCita = {
  titulo: string
  inicio: Date
  fin: Date
  descripcion?: string
  lugar?: string
  uid: string
}

/** El botón «Añadir a Google Calendar»: abre Google con el evento ya relleno. */
export function enlaceGoogleCalendar(e: EventoCita): string {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.titulo,
    dates: `${compacta(e.inicio)}/${compacta(e.fin)}`,
  })
  if (e.descripcion) p.set('details', e.descripcion)
  if (e.lugar) p.set('location', e.lugar)
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

const escaparIcs = (t: string) => t.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`)

/** Archivo .ics: lo abren el calendario del iPhone, Outlook y también Google. */
export function archivoIcs(e: EventoCita): string {
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TUENLACE//Reservas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.uid}@tuenlace.es`,
    `DTSTAMP:${compacta(new Date())}`,
    `DTSTART:${compacta(e.inicio)}`,
    `DTEND:${compacta(e.fin)}`,
    `SUMMARY:${escaparIcs(e.titulo)}`,
    ...(e.descripcion ? [`DESCRIPTION:${escaparIcs(e.descripcion)}`] : []),
    ...(e.lugar ? [`LOCATION:${escaparIcs(e.lugar)}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lineas.join('\r\n') + '\r\n'
}
