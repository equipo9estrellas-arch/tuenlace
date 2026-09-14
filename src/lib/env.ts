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

function requerido(clave: string, valor: string | undefined): string {
  if (!valor || valor.trim() === '') {
    // En build de Next no hay variables de entorno de producción: no reventamos.
    if (process.env.NEXT_PHASE === 'phase-production-build') return ''
    throw new Error(
      `Falta la variable de entorno ${clave}. Copia .env.example a .env y rellénala.`,
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
    return requerido('AUTH_SECRET', process.env.AUTH_SECRET)
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
} as const
