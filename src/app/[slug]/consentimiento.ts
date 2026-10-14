/**
 * Estado de consentimiento del visitante, compartido por el banner y el rastreador.
 *
 * Dos almacenes, a propósito:
 *   - localStorage: el principal.
 *   - cookie de primera parte: respaldo para el navegador embebido de Instagram
 *     en modo privado, donde localStorage lanza al leer y al escribir. Sin este
 *     respaldo el banner reaparece en cada visita y no hay forma de cerrarlo.
 *
 * Nada de esto sale del navegador salvo el registro explícito que manda el
 * banner a /api/consentimiento como prueba de cumplimiento.
 */

export const CLAVE_CONSENTIMIENTO = 'te_consent'

/** Seis meses: pasado ese plazo se vuelve a preguntar. */
export const VIGENCIA_MS = 182 * 24 * 60 * 60 * 1000

export type Decision = {
  /** Analítica propia con identificador de sesión. */
  analitica: boolean
  /** Píxeles y medición de anuncios de terceros. */
  marketing: boolean
  ts: number
}

function leerCookie(nombre: string): string | null {
  try {
    const partes = document.cookie.split(';')
    for (const parte of partes) {
      const [clave, ...resto] = parte.trim().split('=')
      if (clave === nombre) return decodeURIComponent(resto.join('='))
    }
  } catch {
    /* sin acceso a cookies */
  }
  return null
}

function esDecision(valor: unknown): valor is Decision {
  if (typeof valor !== 'object' || valor === null) return false
  const d = valor as Record<string, unknown>
  return (
    typeof d.analitica === 'boolean' &&
    typeof d.marketing === 'boolean' &&
    typeof d.ts === 'number'
  )
}

/** La decisión vigente, o null si no hay ninguna o ya caducó. */
export function leerDecision(): Decision | null {
  let crudo: string | null = null
  try {
    crudo = localStorage.getItem(CLAVE_CONSENTIMIENTO)
  } catch {
    /* almacenamiento bloqueado: probamos con la cookie */
  }
  if (!crudo) crudo = leerCookie(CLAVE_CONSENTIMIENTO)
  if (!crudo) return null

  try {
    const decision: unknown = JSON.parse(crudo)
    if (!esDecision(decision)) return null
    if (Date.now() - decision.ts > VIGENCIA_MS) return null
    return decision
  } catch {
    return null
  }
}

/** Guarda en los dos almacenes; que falle uno no impide el otro. */
export function guardarDecision(decision: Decision): void {
  const serializada = JSON.stringify(decision)
  try {
    localStorage.setItem(CLAVE_CONSENTIMIENTO, serializada)
  } catch {
    /* almacenamiento bloqueado */
  }
  try {
    const dias = Math.round(VIGENCIA_MS / 1000)
    document.cookie = `${CLAVE_CONSENTIMIENTO}=${encodeURIComponent(serializada)};path=/;max-age=${dias};SameSite=Lax`
  } catch {
    /* cookies bloqueadas */
  }
}

export function hayConsentimientoDeMarketing(): boolean {
  return leerDecision()?.marketing === true
}
