/**
 * Lo que necesitan los bloques de vídeo y de horario. Puro: lo usan el
 * servidor al guardar, la página pública y la vista previa del editor.
 */

import { DIAS_SEMANA, type ConfigHorario, type DiaSemana, type ProveedorVideo } from './tipos'

// ── Vídeo ────────────────────────────────────────────────────────────────────

export type VideoReconocido = { proveedor: ProveedorVideo; idVideo: string; vertical: boolean }

/**
 * De lo que pega el usuario (el enlace de compartir, el de la barra, el de
 * Shorts…) al proveedor y el identificador. null si no es un vídeo que
 * sepamos incrustar.
 */
export function reconocerVideo(entrada: string): VideoReconocido | null {
  let url: URL
  try {
    url = new URL(entrada.trim())
  } catch {
    return null
  }
  const host = url.hostname.replace(/^(www\.|m\.)/, '')
  const ID_YT = /^[\w-]{11}$/

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0]
    return ID_YT.test(id) ? { proveedor: 'youtube', idVideo: id, vertical: false } : null
  }
  if (host === 'youtube.com' || host === 'music.youtube.com') {
    const v = url.searchParams.get('v')
    if (v && ID_YT.test(v)) return { proveedor: 'youtube', idVideo: v, vertical: false }
    const [, tipo, id] = url.pathname.split('/')
    if ((tipo === 'shorts' || tipo === 'embed' || tipo === 'live') && id && ID_YT.test(id)) {
      return { proveedor: 'youtube', idVideo: id, vertical: tipo === 'shorts' }
    }
    return null
  }
  if (host === 'tiktok.com') {
    const m = url.pathname.match(/\/video\/(\d{8,25})/)
    return m ? { proveedor: 'tiktok', idVideo: m[1], vertical: true } : null
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = url.pathname.match(/\/(\d{5,12})(?:\/|$)/)
    return m ? { proveedor: 'vimeo', idVideo: m[1], vertical: false } : null
  }
  return null
}

/** La URL del reproductor. YouTube en su dominio sin cookies. */
export function urlReproductor(proveedor: ProveedorVideo, id: string): string {
  switch (proveedor) {
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`
    case 'tiktok':
      return `https://www.tiktok.com/embed/v2/${id}`
    case 'vimeo':
      return `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1`
  }
}

/** El enlace para ver el vídeo fuera, que es lo que funciona sin JavaScript. */
export function urlVerFuera(proveedor: ProveedorVideo, id: string): string {
  switch (proveedor) {
    case 'youtube':
      return `https://www.youtube.com/watch?v=${id}`
    case 'tiktok':
      return `https://www.tiktok.com/video/${id}`
    case 'vimeo':
      return `https://vimeo.com/${id}`
  }
}

// ── Horario ──────────────────────────────────────────────────────────────────

export const NOMBRES_DIA: Record<DiaSemana, string> = {
  lun: 'Lunes',
  mar: 'Martes',
  mie: 'Miércoles',
  jue: 'Jueves',
  vie: 'Viernes',
  sab: 'Sábado',
  dom: 'Domingo',
}

/** Minutos desde las 00:00. "9:30" → 570. */
type Tramo = [number, number]

/**
 * "9-14, 17:00-20:30" → [[540, 840], [1020, 1230]]. null si no se entiende.
 * Vacío o "cerrado" → [] (cerrado ese día). "24h" → todo el día.
 * Un tramo que pasa de medianoche ("20:00-02:00") se acepta: cierra al día
 * siguiente.
 */
export function leerTramos(texto: string): Tramo[] | null {
  const limpio = texto.trim().toLowerCase()
  if (limpio === '' || limpio === 'cerrado') return []
  if (limpio === '24h' || limpio === '24 h' || limpio === 'todo el día') return [[0, 1440]]

  const tramos: Tramo[] = []
  for (const parte of limpio.split(/[,;y]+/)) {
    const m = parte.trim().match(/^(\d{1,2})(?:[:.h](\d{2}))?\s*(?:-|–|a)\s*(\d{1,2})(?:[:.h](\d{2}))?$/)
    if (!m) return null
    const ini = Number(m[1]) * 60 + Number(m[2] ?? 0)
    let fin = Number(m[3]) * 60 + Number(m[4] ?? 0)
    if (Number(m[1]) > 24 || Number(m[3]) > 24 || Number(m[2] ?? 0) > 59 || Number(m[4] ?? 0) > 59) return null
    if (fin <= ini) fin += 1440
    tramos.push([ini, fin])
  }
  return tramos.length ? tramos : null
}

function hhmm(minutos: number): string {
  const m = ((minutos % 1440) + 1440) % 1440
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

/** "9:00 – 14:00 · 17:00 – 20:00" para enseñar. */
export function tramosLegibles(texto: string | undefined): string {
  const t = leerTramos(texto ?? '')
  if (!t || t.length === 0) return 'Cerrado'
  if (t.length === 1 && t[0][0] === 0 && t[0][1] === 1440) return 'Abierto 24 horas'
  return t.map(([a, b]) => `${hhmm(a)} – ${hhmm(b)}`).join(' · ')
}

export type EstadoHorario = { abierto: boolean; texto: string; hoy: DiaSemana }

/**
 * ¿Abierto ahora? Calculado en la hora del negocio (península o Canarias),
 * no en la del servidor ni en la del visitante.
 */
export function estadoAhora(config: ConfigHorario, ahora = new Date()): EstadoHorario {
  const zona = config.canarias ? 'Atlantic/Canary' : 'Europe/Madrid'
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: zona,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(ahora)
  const valor = (t: string) => partes.find((p) => p.type === t)?.value ?? ''
  const indice = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(valor('weekday'))
  const hoy = DIAS_SEMANA[indice < 0 ? 0 : indice]
  const minuto = Number(valor('hour')) * 60 + Number(valor('minute'))

  const tramosDe = (d: DiaSemana) => leerTramos(config.dias?.[d] ?? '') ?? []
  const ayer = DIAS_SEMANA[(DIAS_SEMANA.indexOf(hoy) + 6) % 7]

  // Lo de hoy, y lo de ayer que pasa de medianoche (un bar que cierra a las 2).
  const ahoraDentro =
    tramosDe(hoy).find(([a, b]) => minuto >= a && minuto < b) ??
    tramosDe(ayer)
      .filter(([, b]) => b > 1440)
      .map(([a, b]) => [a - 1440, b - 1440] as Tramo)
      .find(([a, b]) => minuto >= a && minuto < b)

  if (ahoraDentro) {
    if (ahoraDentro[0] <= 0 && ahoraDentro[1] >= 1440) return { abierto: true, texto: 'Abierto 24 horas', hoy }
    return { abierto: true, texto: `Abierto ahora · cierra a las ${hhmm(ahoraDentro[1])}`, hoy }
  }

  // Cerrado: cuándo abre. Primero más tarde hoy, luego los próximos días.
  const luegoHoy = tramosDe(hoy).find(([a]) => a > minuto)
  if (luegoHoy) return { abierto: false, texto: `Cerrado · abre a las ${hhmm(luegoHoy[0])}`, hoy }
  for (let i = 1; i <= 7; i++) {
    const dia = DIAS_SEMANA[(DIAS_SEMANA.indexOf(hoy) + i) % 7]
    const primero = tramosDe(dia)[0]
    if (primero) {
      const cuando = i === 1 ? 'mañana' : `el ${NOMBRES_DIA[dia].toLowerCase()}`
      return { abierto: false, texto: `Cerrado · abre ${cuando} a las ${hhmm(primero[0])}`, hoy }
    }
  }
  return { abierto: false, texto: 'Cerrado', hoy }
}
