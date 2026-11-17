/**
 * Lo del CRM que también necesitan los componentes de cliente (el tablero
 * arrastrable). Puro: nada de base de datos ni de servidor.
 */

export const ETAPAS = [
  { clave: 'NUEVO', nombre: 'Nuevo', ayuda: 'Acaba de llegar. Nadie le ha contestado.', color: '#0B5FFF' },
  { clave: 'CONTACTADO', nombre: 'Contactado', ayuda: 'Ya le has escrito o llamado.', color: '#8A5CF6' },
  { clave: 'CITA', nombre: 'Cita o presupuesto', ayuda: 'Tiene cita, visita o presupuesto enviado.', color: '#E8A10C' },
  { clave: 'CLIENTE', nombre: 'Cliente', ayuda: 'Ha comprado. Apunta cuánto.', color: '#0F9D58' },
  { clave: 'PERDIDO', nombre: 'Perdido', ayuda: 'No salió. Sirve para saber qué canal trae curiosos.', color: '#8A8378' },
] as const

export type Etapa = (typeof ETAPAS)[number]['clave']

export function etapaValida(valor: unknown): valor is Etapa {
  return ETAPAS.some((e) => e.clave === valor)
}

export function etapaDe(clave: Etapa) {
  return ETAPAS.find((e) => e.clave === clave) ?? ETAPAS[0]
}

/** Las etapas que cierran: al entrar en ellas se apunta la fecha de cierre. */
export const ETAPAS_CERRADAS: Etapa[] = ['CLIENTE', 'PERDIDO']

const NOMBRES_ORIGEN: Record<string, string> = {
  instagram: 'Instagram',
  ig: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  meta: 'Meta',
  ads: 'Anuncios',
  google: 'Google',
  qr: 'Código QR',
  tarjeta: 'Tarjeta',
  whatsapp: 'WhatsApp',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X',
  twitter: 'X',
  directo: 'Directo',
  llamada: 'Llamada',
  persona: 'En persona',
  otro: 'Otro',
}

export function nombreOrigen(origen: string | null | undefined): string {
  if (!origen) return 'Directo'
  return NOMBRES_ORIGEN[origen] ?? origen.charAt(0).toUpperCase() + origen.slice(1)
}

/** Por dónde puede haber llegado un contacto que se añade a mano. */
export const ORIGENES_MANUALES = ['whatsapp', 'instagram', 'llamada', 'persona', 'google', 'otro'] as const

/**
 * "1.200,50", "1200.5", "1200 €" → 120050. null si no es un importe.
 * Acepta la coma decimal española y el punto de miles, que es como lo
 * escribe cualquiera aquí.
 */
export function eurosACentimos(entrada: string): number | null {
  let limpio = entrada.replace(/[€\s]/g, '')
  if (!limpio) return null
  if (limpio.includes(',')) {
    limpio = limpio.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
    // "1.200" sin coma: punto de miles, no decimal.
    limpio = limpio.replace(/\./g, '')
  }
  const valor = Number(limpio)
  if (!Number.isFinite(valor) || valor < 0 || valor > 10_000_000) return null
  return Math.round(valor * 100)
}

/** 120050 → "1.200,50 €"; 120000 → "1.200 €". */
export function formatoEuros(centimos: number): string {
  const euros = centimos / 100
  return `${new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: Number.isInteger(euros) ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(euros)} €`
}
