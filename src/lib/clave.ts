import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

/**
 * Contraseñas. scrypt de la librería estándar de Node: sin dependencias, sin
 * binarios nativos y resistente a la fuerza bruta con GPU.
 *
 * Formato guardado: scrypt$N$r$p$sal$huella (base64url). Se guardan los
 * parámetros para poder subirlos en el futuro sin invalidar las existentes.
 */

const scrypt = promisify(scryptCb) as (
  clave: string | Buffer,
  sal: Buffer,
  largo: number,
  opciones: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>

const N = 16384
const R = 8
const P = 1
const LARGO = 64
const MAXMEM = 64 * 1024 * 1024

export const MIN_CLAVE = 8
export const MAX_CLAVE = 200

export function validarClave(clave: string): string | null {
  if (clave.length < MIN_CLAVE) return `La contraseña tiene que tener al menos ${MIN_CLAVE} caracteres.`
  if (clave.length > MAX_CLAVE) return 'Esa contraseña es demasiado larga.'
  return null
}

export async function huellaDeClave(clave: string): Promise<string> {
  const sal = randomBytes(16)
  const huella = await scrypt(clave.normalize('NFKC'), sal, LARGO, { N, r: R, p: P, maxmem: MAXMEM })
  return ['scrypt', N, R, P, sal.toString('base64url'), huella.toString('base64url')].join('$')
}

export async function claveCorrecta(clave: string, guardada: string | null | undefined): Promise<boolean> {
  if (!guardada) return false
  const [alg, n, r, p, sal, huella] = guardada.split('$')
  if (alg !== 'scrypt' || !sal || !huella) return false
  const esperada = Buffer.from(huella, 'base64url')
  const calculada = await scrypt(clave.normalize('NFKC'), Buffer.from(sal, 'base64url'), esperada.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAXMEM,
  })
  return calculada.length === esperada.length && timingSafeEqual(calculada, esperada)
}

/** Para comparar algo aunque el usuario no exista: mismo tiempo de respuesta. */
export const HUELLA_FALSA =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$' + 'A'.repeat(86)
