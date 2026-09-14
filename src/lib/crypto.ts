import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto'
import { env } from './env'

/** Clave de 32 bytes derivada del secreto de la aplicación. */
function clave(): Buffer {
  return scryptSync(env.authSecret, 'tuenlace-cifrado-v1', 32)
}

/**
 * Cifra credenciales de integraciones (tokens de Meta, GA4, Cal.com...).
 * AES-256-GCM: confidencialidad + autenticidad.
 * Formato: iv.tag.contenido, todo en base64url.
 */
export function cifrar(texto: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', clave(), iv)
  const cifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${cifrado.toString('base64url')}`
}

export function descifrar(payload: string): string {
  const [ivB64, tagB64, datosB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !datosB64) throw new Error('Payload cifrado con formato inválido')
  const decipher = createDecipheriv('aes-256-gcm', clave(), Buffer.from(ivB64, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(datosB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

export function sha256(valor: string): string {
  return createHash('sha256').update(valor).digest('hex')
}

/**
 * Normaliza y hashea un dato personal según exige Meta CAPI.
 * Email: minúsculas, sin espacios.
 * Teléfono: solo dígitos, CON prefijo de país (España: 34…).
 * Un teléfono mal normalizado no empareja con nada.
 */
export function hashParaMeta(tipo: 'em' | 'ph', valor: string): string {
  let normalizado = valor.trim().toLowerCase()
  if (tipo === 'ph') {
    normalizado = normalizado.replace(/\D/g, '')
    // Número español sin prefijo: se lo añadimos.
    if (normalizado.length === 9 && /^[6789]/.test(normalizado)) {
      normalizado = `34${normalizado}`
    }
  }
  return createHash('sha256').update(normalizado).digest('hex')
}

/**
 * Identificador de sesión anónimo para analítica, SIN cookie.
 * Se deriva de IP + user-agent + día + sal del servidor, de forma que
 * rota cada día y no permite seguir a nadie entre jornadas.
 */
export function sessionHash(ip: string, userAgent: string, fecha = new Date()): string {
  const dia = fecha.toISOString().slice(0, 10)
  return createHash('sha256')
    .update(`${ip}|${userAgent}|${dia}|${env.authSecret}`)
    .digest('hex')
    .slice(0, 32)
}

/** Hash de IP con sal, para el registro de consentimiento y denuncias. */
export function ipHash(ip: string): string {
  return createHash('sha256').update(`${ip}|${env.authSecret}`).digest('hex').slice(0, 32)
}
