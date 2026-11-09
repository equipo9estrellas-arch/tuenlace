import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { db, organizations } from '@/db'
import { exigirSesion } from '@/lib/session'
import { capacidades } from '@/lib/env'
import {
  ORDEN_PLANES,
  PLANES,
  limitesDe,
  planDe,
  precioEnEuros,
  type Plan,
} from '@/lib/planes'
import { IconoAviso, IconoBien, IconoPendiente } from '@/iconos'
import { BotonPlan, BotonPortal } from './Botones'

export const metadata: Metadata = { title: 'Tu plan', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const FECHA = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

export default async function PaginaPlan({
  searchParams,
}: {
  searchParams: Promise<{ pago?: string }>
}) {
  const sesion = await exigirSesion()
  const { pago } = await searchParams

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, sesion.orgId))
    .limit(1)

  const actual = planDe(sesion.plan)
  const limites = limitesDe(sesion.plan)
  const tieneSuscripcion = Boolean(org?.stripeCustomerId)

  const subidas = ORDEN_PLANES.slice(ORDEN_PLANES.indexOf(actual.clave) + 1)
    .map((clave) => PLANES[clave])
    .filter((p) => p.disponible)

  return (
    <div className="mx-auto max-w-[760px]">
      <h1 className="text-[24px] font-bold tracking-[-0.02em]">Tu plan</h1>

      {/* El aviso de vuelta de la pasarela. Dice "estamos confirmando", no
          "ya está": quien activa el plan es el webhook, y puede tardar unos
          segundos en llegar. Prometer aquí lo que aún no ha pasado es como se
          generan los tickets de "he pagado y no me funciona". */}
      {pago === 'hecho' && actual.precioMensualCentimos === 0 && (
        <Aviso tono="espera">
          Estamos confirmando el pago con el banco. Suele tardar unos segundos; recarga esta página
          en un momento y verás tu plan nuevo.
        </Aviso>
      )}
      {pago === 'hecho' && actual.precioMensualCentimos > 0 && (
        <Aviso tono="bien">
          Pago confirmado. Ya tienes {actual.nombre}: lo nuevo está activo en tu página ahora mismo.
        </Aviso>
      )}
      {pago === 'cancelado' && (
        <Aviso tono="espera">No se ha cobrado nada. Sigues en {actual.nombre}.</Aviso>
      )}

      <section className="mt-5 rounded-[14px] border-2 border-[var(--color-acento)] bg-white p-5">
        <p className="text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
          Ahora mismo
        </p>
        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-[26px] font-bold tracking-[-0.02em]">{actual.nombre}</p>
          <p className="text-[16px] font-semibold">
            {actual.precioMensualCentimos === 0
              ? 'Gratis'
              : `${precioEnEuros(actual.precioMensualCentimos)} al mes`}
          </p>
        </div>

        {org?.planHasta && actual.precioMensualCentimos > 0 && (
          <p className="mt-1.5 text-[14px] text-[var(--color-tinta-60)]">
            Se renueva el {FECHA.format(org.planHasta)}.
          </p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--color-borde-suave)] pt-4 sm:grid-cols-4">
          <Dato nombre="Bloques" valor={limites.bloques >= 200 ? 'Sin límite' : String(limites.bloques)} />
          <Dato
            nombre="Estadísticas"
            valor={
              limites.diasDeDatos >= 365
                ? `${Math.round(limites.diasDeDatos / 30)} meses`
                : `${limites.diasDeDatos} días`
            }
          />
          <Dato nombre="Sin marca" valor={limites.quitarMarca ? 'Sí' : 'No'} />
          <Dato nombre="En Google" valor={limites.indexar ? 'Sí' : 'No'} />
        </dl>

        {tieneSuscripcion && (
          <div className="mt-4 border-t border-[var(--color-borde-suave)] pt-4">
            <BotonPortal />
            <p className="mt-1.5 text-[13px] text-[var(--color-tinta-40)]">
              Facturas, cambiar la tarjeta y darte de baja. Lo gestiona Stripe.
            </p>
          </div>
        )}
      </section>

      {!capacidades.pagos && (
        <Aviso tono="aviso">
          La pasarela de pago todavía no está configurada en este servidor, así que los botones de
          abajo no funcionan.
        </Aviso>
      )}

      {/* Solo las SUBIDAS. Enseñarle el plan gratuito a quien ya paga no sirve
          para nada: bajar de plan se hace en el portal de Stripe, no aquí. */}
      {subidas.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {subidas.map((p) => (
            <Tarjeta key={p.clave} plan={p} />
          ))}
        </div>
      )}

      <p className="mt-6 text-[13.5px] leading-[1.6] text-[var(--color-tinta-60)]">
        Los precios llevan el IVA incluido y se facturan desde España. Puedes darte de baja cuando
        quieras: al hacerlo mantienes el plan hasta el final del periodo que ya has pagado, y
        después tu página sigue publicada en el plan gratuito. No se borra nada.
      </p>
    </div>
  )
}

function Tarjeta({ plan }: { plan: Plan }) {
  return (
    <section className="flex flex-col rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
      <h2 className="text-[17px] font-bold">{plan.nombre}</h2>
      <p className="mt-1.5">
        <span className="text-[26px] font-bold tracking-[-0.02em]">
          {plan.precioMensualCentimos === 0 ? '0 €' : precioEnEuros(plan.precioMensualCentimos)}
        </span>
        <span className="ml-1 text-[14px] text-[var(--color-tinta-40)]">
          {plan.precioMensualCentimos === 0 ? 'para siempre' : 'al mes'}
        </span>
      </p>
      <p className="mt-1 text-[13.5px] text-[var(--color-tinta-40)]">{plan.paraQuien}</p>

      <ul className="mt-4 flex flex-1 flex-col gap-2 text-[14.5px]">
        {plan.incluye.map((linea) => (
          <li key={linea} className="flex gap-2">
            <span className="mt-[2px] shrink-0 text-[var(--color-exito)]">
              <IconoBien tam={15} />
            </span>
            <span className="text-[var(--color-tinta-80)]">{linea}</span>
          </li>
        ))}
      </ul>

      <BotonPlan plan={plan.clave} nombre={plan.nombre} />
    </section>
  )
}

function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <div>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-tinta-40)]">
        {nombre}
      </dt>
      <dd className="mt-0.5 text-[16px] font-bold">{valor}</dd>
    </div>
  )
}

function Aviso({ tono, children }: { tono: 'bien' | 'aviso' | 'espera'; children: React.ReactNode }) {
  const estilo =
    tono === 'bien'
      ? 'border-[var(--color-exito)] bg-[#F1FAF4]'
      : tono === 'aviso'
        ? 'border-[var(--color-alerta)] bg-[#FDF3F2]'
        : 'border-[var(--color-borde)] bg-[var(--color-borde-suave)]/40'

  return (
    <div className={`mt-5 flex gap-3 rounded-[14px] border-2 p-4 ${estilo}`}>
      <span className="mt-[1px] shrink-0">
        {tono === 'bien' ? (
          <IconoBien tam={18} />
        ) : tono === 'aviso' ? (
          <IconoAviso tam={18} />
        ) : (
          <IconoPendiente tam={18} />
        )}
      </span>
      <p className="text-[14.5px] leading-[1.55]">{children}</p>
    </div>
  )
}
