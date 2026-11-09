import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, organizations } from '@/db'
import { env } from '@/lib/env'
import { cambioDePlan, firmaValida, type EventoStripe } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * El webhook de Stripe: lo único que sube y baja el plan de una organización.
 *
 * Ninguna otra parte del código toca `organizations.plan`. Que el cliente
 * vuelva de la pasarela con `?pago=hecho` NO activa nada: esa redirección la
 * puede escribir cualquiera en la barra de direcciones. El plan lo cambia este
 * endpoint, y solo si la firma cuadra.
 */
export async function POST(peticion: Request) {
  if (!env.stripeWebhookSecret) {
    console.error('[stripe] llega un webhook y no hay STRIPE_WEBHOOK_SECRET')
    return NextResponse.json({ ok: false }, { status: 503 })
  }

  // El cuerpo CRUDO, sin parsear. Si se parsea y se vuelve a serializar, la
  // firma deja de cuadrar por un espacio.
  const crudo = await peticion.text()
  const cabecera = peticion.headers.get('stripe-signature')

  if (!firmaValida(crudo, cabecera, env.stripeWebhookSecret)) {
    // 400 a propósito: un 401 haría que Stripe lo reintentara durante días.
    console.error('[stripe] firma inválida o caducada')
    return NextResponse.json({ ok: false, error: 'firma' }, { status: 400 })
  }

  let evento: EventoStripe
  try {
    evento = JSON.parse(crudo) as EventoStripe
  } catch {
    return NextResponse.json({ ok: false, error: 'json' }, { status: 400 })
  }

  const cambio = cambioDePlan(evento)
  if (!cambio) {
    // Stripe manda decenas de tipos de evento. Los que no nos tocan se
    // confirman igual: devolver error haría que los reintentara sin fin.
    return NextResponse.json({ ok: true, ignorado: evento.type })
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, cambio.orgId))
    .limit(1)

  if (!org) {
    console.error('[stripe] evento para una organización que no existe', cambio.orgId)
    return NextResponse.json({ ok: true, ignorado: 'org desconocida' })
  }

  // Stripe no garantiza el orden de entrega. Una baja de una suscripción
  // ANTIGUA puede llegar después del alta de la nueva; aplicarla dejaría sin
  // plan a alguien que acaba de pagar. Si la baja no es de la suscripción que
  // tenemos guardada, no es la nuestra.
  if (
    cambio.plan === 'GRATIS' &&
    evento.type === 'customer.subscription.deleted' &&
    org.stripeSubscriptionId &&
    String(evento.data.object.id ?? '') !== org.stripeSubscriptionId
  ) {
    return NextResponse.json({ ok: true, ignorado: 'baja de una suscripción anterior' })
  }

  await db
    .update(organizations)
    .set({
      plan: cambio.plan,
      stripeCustomerId: cambio.customerId ?? org.stripeCustomerId,
      stripeSubscriptionId: cambio.subscriptionId,
      planHasta: cambio.hasta,
      planAnual: false,
      actualizadoEn: new Date(),
    })
    .where(eq(organizations.id, org.id))

  console.log('[stripe]', evento.type, '→', cambio.orgId, cambio.plan)
  return NextResponse.json({ ok: true })
}
