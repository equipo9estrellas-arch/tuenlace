import 'server-only'
import { eq } from 'drizzle-orm'
import { db, organizations, users } from '@/db'
import { asegurarOrganizacion, crearEnlaceDeClave } from './auth'
import { enviarBienvenidaPago } from './mail'
import { PLANES } from './planes'
import { leerSuscripcion, planDePrecio, vincularSuscripcion, type PagoPorEnlace } from './stripe'

/** Lo que vale el enlace para crear la contraseña tras pagar. */
export const DIAS_ENLACE_BIENVENIDA = 7

export type ResultadoPagoPorEnlace =
  | { ok: true; orgId: string; plan: string; cuentaNueva: boolean; repetido: boolean }
  /** reintentar: true → error pasajero (Stripe caído); el webhook pide a Stripe que lo reenvíe. */
  | { ok: false; motivo: string; reintentar: boolean }

/**
 * Alguien ha pagado con un payment link, sin pasar por su panel.
 *
 *  1. Se lee la suscripción en Stripe para saber QUÉ ha pagado. El plan sale
 *     del precio, nunca de algo que venga en el evento: así un link de otro
 *     producto de 9 Estrellas no puede activar nada aquí.
 *  2. Se busca la cuenta por el correo con el que pagó. Si no existe, se crea
 *     (usuario + organización) sin página: la monta él al entrar.
 *  3. Se activa el plan y se le pone el orgId a la suscripción, para que las
 *     renovaciones y la baja lleguen ya por el camino normal.
 *  4. Correo: a una cuenta nueva, enlace para crear la contraseña (7 días); a
 *     una que ya existía, aviso de que el plan está activo.
 *
 * Es idempotente: Stripe reenvía los webhooks, y un segundo aviso del mismo
 * pago no crea otra cuenta ni manda otro correo.
 */
export async function activarPagoPorEnlace(pago: PagoPorEnlace): Promise<ResultadoPagoPorEnlace> {
  const yaVinculada = await db
    .select({ id: organizations.id, plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.stripeSubscriptionId, pago.subscriptionId))
    .limit(1)
  if (yaVinculada[0]) {
    return { ok: true, orgId: yaVinculada[0].id, plan: yaVinculada[0].plan, cuentaNueva: false, repetido: true }
  }

  const suscripcion = await leerSuscripcion(pago.subscriptionId)
  if (!suscripcion.ok) return { ok: false, motivo: suscripcion.error, reintentar: true }

  const plan = planDePrecio(suscripcion.datos.priceId)
  if (!plan) {
    return { ok: false, motivo: `precio que no es de TUENLACE: ${suscripcion.datos.priceId}`, reintentar: false }
  }
  const activa = ['active', 'trialing', 'past_due'].includes(suscripcion.datos.estado)
  if (!activa) return { ok: false, motivo: `suscripción en estado ${suscripcion.datos.estado}`, reintentar: false }

  // Cuenta: la que tenga ese correo, o una nueva. onConflictDoNothing por si
  // dos reenvíos del mismo evento llegan a la vez.
  let [usuario] = await db.select().from(users).where(eq(users.email, pago.email)).limit(1)
  const cuentaNueva = !usuario
  if (!usuario) {
    await db
      .insert(users)
      .values({ email: pago.email, nombre: pago.nombre })
      .onConflictDoNothing({ target: users.email })
    ;[usuario] = await db.select().from(users).where(eq(users.email, pago.email)).limit(1)
  }
  if (!usuario) return { ok: false, motivo: 'no se ha podido crear el usuario', reintentar: true }

  const orgId = await asegurarOrganizacion(usuario.id, pago.nombre ?? undefined)
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1)
  if (org?.stripeSubscriptionId && org.stripeSubscriptionId !== pago.subscriptionId) {
    // Ya pagaba por otra suscripción y ha comprado otra por link. No se cancela
    // nada solo: lo revisa una persona (aparece en el registro del servidor).
    console.warn('[stripe] la cuenta', orgId, 'ya tenía la suscripción', org.stripeSubscriptionId, 'y paga otra:', pago.subscriptionId)
  }

  await db
    .update(organizations)
    .set({
      plan,
      stripeCustomerId: pago.customerId ?? suscripcion.datos.customerId ?? org?.stripeCustomerId ?? null,
      stripeSubscriptionId: pago.subscriptionId,
      planHasta: suscripcion.datos.hasta,
      planAnual: false,
      actualizadoEn: new Date(),
    })
    .where(eq(organizations.id, orgId))

  const vinculo = await vincularSuscripcion(pago.subscriptionId, orgId, plan)
  if (!vinculo.ok) {
    // El plan ya está activo; sin el vínculo, una baja futura no llegaría a la
    // cuenta. Se avisa en el registro para arreglarlo a mano en Stripe.
    console.error('[stripe] no se ha podido poner el orgId a la suscripción', pago.subscriptionId, vinculo.error)
  }

  const enlace = usuario.claveHash ? null : await crearEnlaceDeClave(usuario.id, DIAS_ENLACE_BIENVENIDA * 24 * 60)
  const envio = await enviarBienvenidaPago(pago.email, PLANES[plan].nombre, enlace, DIAS_ENLACE_BIENVENIDA)
  if (!envio.ok) console.error('[stripe] no se ha podido mandar la bienvenida a', pago.email)

  return { ok: true, orgId, plan, cuentaNueva, repetido: false }
}
