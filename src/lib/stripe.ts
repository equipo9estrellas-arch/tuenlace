import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from './env'
import type { ClavePlan } from './planes'

/**
 * Stripe, sin SDK.
 *
 * Usamos tres endpoints: crear una sesión de pago, crear una sesión del portal
 * de cliente y verificar la firma del webhook. Son tres POST con el cuerpo en
 * `application/x-www-form-urlencoded` y una comprobación HMAC. El SDK oficial
 * pesa más de un mega y arrastra sus propias dependencias para eso; es el mismo
 * criterio que se siguió con R2, y por la misma razón: menos superficie que
 * auditar en el bundle del servidor.
 *
 * Lo único delicado es la firma del webhook, y tiene su test con el ejemplo de
 * la documentación de Stripe en la sección 10 de prueba-e2e.
 */

const API = 'https://api.stripe.com/v1'

/** Los identificadores de precio de Stripe, por plan. Solo mensual. */
function precioDe(plan: ClavePlan): string {
  const porPlan: Partial<Record<ClavePlan, string>> = {
    ESENCIAL: process.env.STRIPE_PRICE_ESENCIAL_MENSUAL ?? '',
    NEGOCIO: process.env.STRIPE_PRICE_NEGOCIO_MENSUAL ?? '',
    AGENCIA: process.env.STRIPE_PRICE_AGENCIA_MENSUAL ?? '',
  }
  return porPlan[plan] ?? ''
}

export function hayPrecioPara(plan: ClavePlan): boolean {
  return precioDe(plan) !== ''
}

/**
 * Convierte un objeto anidado al formato que espera Stripe:
 * `{ a: { b: 1 } }` → `a[b]=1`. Stripe no acepta JSON en estos endpoints.
 */
function aFormulario(datos: Record<string, unknown>, prefijo = ''): string {
  const partes: string[] = []
  for (const [clave, valor] of Object.entries(datos)) {
    if (valor === undefined || valor === null || valor === '') continue
    const nombre = prefijo ? `${prefijo}[${clave}]` : clave
    if (typeof valor === 'object') {
      partes.push(aFormulario(valor as Record<string, unknown>, nombre))
    } else {
      partes.push(`${encodeURIComponent(nombre)}=${encodeURIComponent(String(valor))}`)
    }
  }
  return partes.filter(Boolean).join('&')
}

type Respuesta<T> = { ok: true; datos: T } | { ok: false; error: string }

async function llamar<T>(
  ruta: string,
  cuerpo: Record<string, unknown>,
  /** Misma clave = misma operación. Evita cobrar dos veces si el usuario repite el clic. */
  claveIdempotencia?: string,
): Promise<Respuesta<T>> {
  if (!env.stripeSecretKey) {
    return { ok: false, error: 'Los pagos todavía no están configurados.' }
  }

  try {
    const respuesta = await fetch(`${API}${ruta}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        // Fijar la versión evita que un cambio en la API de Stripe altere las
        // respuestas sin avisar. Se sube a mano, leyendo sus notas de versión.
        'Stripe-Version': '2024-06-20',
        ...(claveIdempotencia ? { 'Idempotency-Key': claveIdempotencia } : {}),
      },
      body: aFormulario(cuerpo),
    })

    const datos = (await respuesta.json()) as T & { error?: { message?: string; code?: string } }
    if (!respuesta.ok) {
      console.error('[stripe]', ruta, respuesta.status, datos.error?.code, datos.error?.message)
      return { ok: false, error: datos.error?.message ?? `Stripe ha devuelto un ${respuesta.status}.` }
    }
    return { ok: true, datos }
  } catch (error) {
    console.error('[stripe] error de red', ruta, error)
    return { ok: false, error: 'No hemos podido contactar con la pasarela de pago.' }
  }
}

// ── Compra ───────────────────────────────────────────────────────────────────

export async function crearSesionDeCompra(opciones: {
  orgId: string
  plan: ClavePlan
  email: string
  /** Si la organización ya compró antes, se reutiliza su cliente de Stripe. */
  customerId: string | null
  baseUrl: string
}): Promise<Respuesta<{ url: string }>> {
  const price = precioDe(opciones.plan)
  if (!price) return { ok: false, error: 'Ese plan todavía no está a la venta.' }

  return llamar<{ url: string }>('/checkout/sessions', {
    mode: 'subscription',
    line_items: { 0: { price, quantity: 1 } },
    success_url: `${opciones.baseUrl}/panel/plan?pago=hecho`,
    cancel_url: `${opciones.baseUrl}/panel/plan?pago=cancelado`,
    locale: 'es',
    // Sin cliente previo se manda el correo para que Stripe no lo pida otra
    // vez; con cliente previo mandar los dos es un error de la API.
    ...(opciones.customerId
      ? { customer: opciones.customerId }
      : { customer_email: opciones.email }),
    // El webhook llega sin contexto de nuestra base de datos. El orgId viaja en
    // los metadatos de la suscripción (no solo de la sesión) porque las
    // renovaciones y las bajas llegan como eventos de la suscripción, que ya no
    // llevan la sesión de compra.
    subscription_data: { metadata: { orgId: opciones.orgId, plan: opciones.plan } },
    metadata: { orgId: opciones.orgId, plan: opciones.plan },
    allow_promotion_codes: 'true',
    // Obligatorio para facturar en España con IVA.
    automatic_tax: { enabled: 'true' },
    tax_id_collection: { enabled: 'true' },
    billing_address_collection: 'required',
  })
}

/** El portal de Stripe: facturas, cambiar la tarjeta y darse de baja. */
export async function crearSesionDePortal(opciones: {
  customerId: string
  baseUrl: string
}): Promise<Respuesta<{ url: string }>> {
  return llamar<{ url: string }>('/billing_portal/sessions', {
    customer: opciones.customerId,
    return_url: `${opciones.baseUrl}/panel/plan`,
    locale: 'es',
  })
}

// ── Webhook ──────────────────────────────────────────────────────────────────

/**
 * ¿Viene de verdad de Stripe?
 *
 * La cabecera es `t=<marca>,v1=<firma>`. Se firma `<marca>.<cuerpo en crudo>`
 * con el secreto del endpoint. Dos detalles que no son opcionales:
 *
 *  · El cuerpo tiene que ser el CRUDO, byte a byte. Si se parsea el JSON y se
 *    vuelve a serializar, cambia un espacio y la firma deja de cuadrar.
 *  · Se comprueba la antigüedad. Sin eso, quien capture un webhook válido puede
 *    reenviarlo mañana y volver a activar un plan ya cancelado.
 */
export function firmaValida(
  cuerpoCrudo: string,
  cabecera: string | null,
  secreto: string,
  toleranciaSegundos = 300,
  ahora = Date.now(),
): boolean {
  if (!cabecera || !secreto) return false

  const partes = new Map(
    cabecera.split(',').map((p) => {
      const i = p.indexOf('=')
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()] as [string, string]
    }),
  )

  const marca = Number(partes.get('t'))
  const recibida = partes.get('v1')
  if (!Number.isFinite(marca) || !recibida) return false

  const edad = Math.abs(ahora / 1000 - marca)
  if (edad > toleranciaSegundos) return false

  const esperada = createHmac('sha256', secreto).update(`${marca}.${cuerpoCrudo}`, 'utf8').digest('hex')

  // Comparación en tiempo constante: una comparación normal filtra, por lo que
  // tarda, cuántos caracteres del principio ha acertado quien lo intenta.
  const a = Buffer.from(esperada, 'utf8')
  const b = Buffer.from(recibida, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Cuándo se renueva.
 *
 * A partir de la versión 2025-03-31 de la API, Stripe movió
 * `current_period_end` de la suscripción a cada una de sus líneas. El webhook
 * se da de alta con la versión que tenga el panel en ese momento, que no tiene
 * por qué ser la misma con la que se escribió este código, así que se mira en
 * los dos sitios en vez de fijar una versión y olvidarse.
 *
 * Si no aparece en ninguno, se devuelve null: la fecha de renovación es un
 * adorno del panel, y perderla nunca debe impedir que se active un plan pagado.
 */
function finDelPeriodo(obj: Record<string, unknown>): Date | null {
  const directo = Number(obj.current_period_end)
  if (Number.isFinite(directo) && directo > 0) return new Date(directo * 1000)

  const items = (obj.items as { data?: Array<Record<string, unknown>> } | undefined)?.data
  if (Array.isArray(items)) {
    for (const item of items) {
      const fin = Number(item.current_period_end)
      if (Number.isFinite(fin) && fin > 0) return new Date(fin * 1000)
    }
  }
  return null
}

/** Los campos que nos interesan de un evento de Stripe. */
export type EventoStripe = {
  id: string
  type: string
  data: { object: Record<string, unknown> }
}

/**
 * De un evento al cambio de plan que implica.
 *
 * Devuelve null cuando el evento no nos afecta: Stripe manda decenas de tipos
 * y procesar uno que no toca es la forma más fácil de dejar a alguien sin su
 * plan por accidente.
 */
export function cambioDePlan(evento: EventoStripe):
  | { orgId: string; plan: ClavePlan | 'GRATIS'; customerId: string | null; subscriptionId: string | null; hasta: Date | null }
  | null {
  const obj = evento.data.object
  const metadatos = (obj.metadata ?? {}) as Record<string, string>
  const orgId = metadatos.orgId

  switch (evento.type) {
    // Alta y cada renovación pagada.
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      if (!orgId) return null
      const estado = String(obj.status ?? '')
      // `past_due` NO baja el plan: Stripe reintenta el cobro varios días y
      // cortarle el servicio a alguien cuya tarjeta caducó el martes es la
      // mejor forma de que se vaya.
      const activa = estado === 'active' || estado === 'trialing' || estado === 'past_due'
      return {
        orgId,
        plan: activa ? ((metadatos.plan as ClavePlan) ?? 'ESENCIAL') : 'GRATIS',
        customerId: obj.customer ? String(obj.customer) : null,
        subscriptionId: String(obj.id ?? '') || null,
        hasta: finDelPeriodo(obj),
      }
    }

    // Baja definitiva, o impago tras todos los reintentos.
    case 'customer.subscription.deleted': {
      if (!orgId) return null
      return {
        orgId,
        plan: 'GRATIS',
        customerId: obj.customer ? String(obj.customer) : null,
        subscriptionId: null,
        hasta: null,
      }
    }

    default:
      return null
  }
}
