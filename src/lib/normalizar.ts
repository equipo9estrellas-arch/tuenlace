/**
 * Normalización de los datos que escribe el usuario.
 *
 * Una sola definición, compartida por el generador del onboarding y el editor
 * del panel. Si cada uno tuviera la suya, acabarían divergiendo: el onboarding
 * aceptaría un teléfono que el editor rechaza, o al revés. Ya nos pasó con
 * "qué campos son obligatorios" y costó una página con un solo botón.
 *
 * Todas devuelven null cuando el valor no sirve. Nunca lanzan.
 */

/** Completa el protocolo si falta y valida. `booksy.com/x` → `https://booksy.com/x` */
export function urlValida(valor: string | undefined | null): string | null {
  if (!valor) return null
  const limpio = valor.trim()
  if (!limpio) return null
  const conProtocolo = /^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`
  try {
    const u = new URL(conProtocolo)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (!u.hostname.includes('.')) return null
    return u.toString()
  } catch {
    return null
  }
}

/**
 * Teléfono a solo dígitos con prefijo de país.
 *
 * El caso real: la gente escribe su móvil español de nueve cifras sin el 34,
 * y `wa.me` sin prefijo no funciona. Se lo ponemos nosotros en vez de pedirle
 * que lo entienda.
 */
export function soloDigitos(valor: string | undefined | null): string | null {
  if (!valor) return null
  const d = valor.replace(/\D/g, '')
  if (d.length < 9) return null
  if (d.length === 9 && /^[6789]/.test(d)) return `34${d}`
  return d
}

/** Usuario de red social: quita la arroba, la URL completa y la barra final. */
export function limpiarUsuario(valor: string | undefined | null): string | null {
  if (!valor) return null
  const u = valor
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/\/$/, '')
    .replace(/^@/, '')
  return u || null
}

/** Correo con una validación deliberadamente laxa: el rebote es la prueba real. */
export function emailValido(valor: string | undefined | null): string | null {
  if (!valor) return null
  const e = valor.trim().toLowerCase()
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(e) ? e : null
}

/** Recorta y colapsa espacios. Devuelve null si queda vacío. */
export function texto(valor: string | undefined | null, maximo = 300): string | null {
  if (!valor) return null
  const t = valor.replace(/\s+/g, ' ').trim().slice(0, maximo)
  return t || null
}

/** Igual que `texto` pero conservando los saltos de línea. */
export function textoLargo(valor: string | undefined | null, maximo = 1000): string | null {
  if (!valor) return null
  const t = valor.replace(/[ \t]+/g, ' ').trim().slice(0, maximo)
  return t || null
}
