'use server'

import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db, organizations, users } from '@/db'
import { exigirSesion } from '@/lib/session'
import { env } from '@/lib/env'
import { crearSesionDeCompra, crearSesionDePortal, hayPrecioPara } from '@/lib/stripe'
import { PLANES, type ClavePlan } from '@/lib/planes'

/**
 * Llevar al cliente a pagar.
 *
 * Esto NO sube el plan. Lo único que lo sube es el webhook, cuando Stripe
 * confirma el cobro con una firma válida.
 */
export async function irAPagar(plan: string): Promise<{ error: string } | never> {
  const sesion = await exigirSesion()

  const definicion = PLANES[plan as ClavePlan]
  if (!definicion || !definicion.disponible || definicion.precioMensualCentimos === 0) {
    return { error: 'Ese plan no está a la venta.' }
  }
  if (!hayPrecioPara(definicion.clave)) {
    return { error: 'Ese plan todavía no tiene precio configurado en la pasarela.' }
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, sesion.orgId))
    .limit(1)
  if (!org) return { error: 'No encontramos tu cuenta.' }

  const [usuario] = await db.select().from(users).where(eq(users.id, sesion.userId)).limit(1)

  const sesionPago = await crearSesionDeCompra({
    orgId: org.id,
    plan: definicion.clave,
    email: usuario?.email ?? '',
    customerId: org.stripeCustomerId,
    baseUrl: env.appUrl,
  })

  if (!sesionPago.ok) return { error: sesionPago.error }
  redirect(sesionPago.datos.url)
}

/** El portal de Stripe: facturas, cambiar tarjeta y darse de baja. */
export async function irAlPortal(): Promise<{ error: string } | never> {
  const sesion = await exigirSesion()

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, sesion.orgId))
    .limit(1)

  if (!org?.stripeCustomerId) {
    return { error: 'Todavía no tienes ninguna suscripción que gestionar.' }
  }

  const portal = await crearSesionDePortal({
    customerId: org.stripeCustomerId,
    baseUrl: env.appUrl,
  })

  if (!portal.ok) return { error: portal.error }
  redirect(portal.datos.url)
}
