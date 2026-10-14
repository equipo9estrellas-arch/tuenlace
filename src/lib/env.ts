import { randomBytes } from 'node:crypto'

/**
 * Acceso centralizado a la configuración.
 *
 * Criterio: la aplicación debe ARRANCAR sin las claves opcionales y degradar
 * con elegancia — sin Resend los enlaces mágicos salen por consola, sin
 * Safe Browsing la comprobación se salta con aviso, sin IA el generador usa
 * solo reglas. Eso permite levantar el entorno en local en un minuto.
 *
 * Lo único verdaderamente obligatorio es DATABASE_URL y AUTH_SECRET.
 */

/**
 * Durante `next build` no hay variables de producción y los getters se evalúan
 * al recoger datos de las páginas. Eso obliga a tolerar la ausencia, pero
 * devolver cadena vacía era peligroso: si NEXT_PHASE acaba también en el
 * entorno de EJECUCIÓN —un ENV olvidado en el Dockerfile, una configuración
 * heredada de Railway—, AUTH_SECRET degradaba a '' y con el secreto vacío
 * cualquiera firma un JWT de sesión válido.
 *
 * Solución: en build se devuelve un valor ALEATORIO de proceso, no vacío. Lo
 * que dependa de él fallará de forma ruidosa si alguien intenta usarlo de
 * verdad, y nunca es un valor que un atacante pueda conocer.
 */
function enBuild(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build'
}

const SUSTITUTO_DE_BUILD = randomBytes(48).toString('base64url')

function requerido(clave: string, valor: string | undefined, minimo = 0): string {
  if (!valor || valor.trim() === '') {
    if (enBuild()) return SUSTITUTO_DE_BUILD
    throw new Error(
      `Falta la variable de entorno ${clave}. Copia .env.example a .env y rellénala.`,
    )
  }
  if (minimo > 0 && valor.length < minimo) {
    throw new Error(
      `${clave} es demasiado corta (${valor.length} caracteres, mínimo ${minimo}). ` +
        `Genera una con: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
    )
  }
  return valor
}

function sinBarraFinal(url: string): string {
  return url.replace(/\/+$/, '')
}

export const env = {
  get databaseUrl() {
    return requerido('DATABASE_URL', process.env.DATABASE_URL)
  },
  get authSecret() {
    return requerido('AUTH_SECRET', process.env.AUTH_SECRET, 32)
  },

  /**
   * Sal de los hashes de analítica (sesión e IP). Separada de AUTH_SECRET a
   * propósito: con un único secreto para firmar sesiones, cifrar credenciales y
   * salar hashes, rotarlo por una filtración cierra la sesión de todo el mundo
   * y, mientras no se rote, quien lo tenga puede revertir por fuerza bruta las
   * IPs de consent_log (el espacio IPv4 son 2^32 valores: minutos).
   * Si no está definida, se cae a AUTH_SECRET para no romper los datos ya
   * guardados.
   */
  get analiticaSalt() {
    const propia = process.env.ANALITICA_SALT
    if (propia && propia.trim() !== '') return propia
    return requerido('AUTH_SECRET', process.env.AUTH_SECRET, 32)
  },

  appUrl: sinBarraFinal(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),

  resendApiKey: process.env.RESEND_API_KEY ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'TUENLACE <hola@tuenlace.es>',

  safeBrowsingApiKey: process.env.SAFE_BROWSING_API_KEY ?? '',

  aiApiKey: process.env.AI_API_KEY ?? '',
  aiApiUrl: process.env.AI_API_URL ?? 'https://api.openai.com/v1/chat/completions',
  aiModel: process.env.AI_MODEL ?? 'gpt-4o-mini',

  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',

  // Cloudflare R2: almacenamiento de logos, portadas e imágenes.
  // Sin estas variables la aplicación arranca igual; el editor permite pegar
  // una URL de imagen pero no subir ficheros, y lo dice claramente.
  r2AccountId: process.env.R2_ACCOUNT_ID ?? '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  r2Bucket: process.env.R2_BUCKET ?? '',
  /**
   * Jurisdicción del bucket: '' (global), 'eu' o 'fedramp'.
   * Un bucket creado con jurisdicción vive en OTRO endpoint, y llamar al
   * genérico devuelve AccessDenied, que se confunde con un permiso mal puesto.
   */
  r2Jurisdiccion: (process.env.R2_JURISDICCION ?? '').trim().toLowerCase(),
  /** Dominio público del bucket. Ej: https://imagenes.tuenlace.es */
  r2PublicUrl: sinBarraFinal(process.env.R2_PUBLIC_URL ?? ''),

  esProduccion: process.env.NODE_ENV === 'production',
} as const

export const capacidades = {
  get email() {
    return env.resendApiKey !== ''
  },
  get safeBrowsing() {
    return env.safeBrowsingApiKey !== ''
  },
  get ia() {
    return env.aiApiKey !== ''
  },
  get pagos() {
    return env.stripeSecretKey !== ''
  },
  get almacenamiento() {
    return (
      env.r2AccountId !== '' &&
      env.r2AccessKeyId !== '' &&
      env.r2SecretAccessKey !== '' &&
      env.r2Bucket !== '' &&
      env.r2PublicUrl !== ''
    )
  },
} as const
