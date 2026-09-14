import { randomBytes, randomUUID } from 'node:crypto'

const ALFABETO = '0123456789abcdefghijklmnopqrstuvwxyz'

/**
 * Identificador corto, ordenable por tiempo y seguro para URLs.
 * Prefijo temporal en base36 (8 chars) + 16 chars aleatorios = 24.
 *
 * Ordenable por tiempo importa: los índices de Postgres sobre claves
 * aleatorias puras se fragmentan mucho más.
 */
export function createId(): string {
  const tiempo = Date.now().toString(36).padStart(8, '0')
  const bytes = randomBytes(16)
  let aleatorio = ''
  for (let i = 0; i < 16; i++) {
    aleatorio += ALFABETO[bytes[i] % ALFABETO.length]
  }
  return tiempo + aleatorio
}

/** UUID v4 para el event_id de Meta CAPI. */
export function createEventId(): string {
  return randomUUID()
}

/** Token opaco para enlaces mágicos. Se envía por email; se guarda su hash. */
export function createToken(): string {
  return randomBytes(32).toString('base64url')
}
