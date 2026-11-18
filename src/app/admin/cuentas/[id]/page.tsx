import Link from 'next/link'
import { notFound } from 'next/navigation'
import { detalleCuenta } from '@/lib/admin-datos'
import { esSuperadmin } from '@/lib/admin'
import { env } from '@/lib/env'
import { ORDEN_PLANES, PLANES, diasDePrueba, planDe, precioEnEuros } from '@/lib/planes'
import {
  borrarCuenta,
  cambiarEmail,
  cambiarPlan,
  cerrarSesionesDe,
  entrarComo,
  fijarPrueba,
  renombrarCuenta,
  restaurarPagina,
  suspenderPagina,
} from '../../acciones'
import { BOTON, BOTON_PELIGRO, CAMPO, Caja, ChipEstado, ChipPagina, FECHA, FECHA_HORA } from '../../piezas'

export const metadata = { title: 'Cuenta' }

const ERRORES: Record<string, string> = {
  confirmacion: 'Para borrar la cuenta hay que escribir exactamente el correo de uno de sus miembros.',
  propia: 'No puedes borrar tu propia cuenta desde aquí.',
  email: 'Ese correo no es válido.',
  'email-ocupado': 'Ese correo ya lo usa otra cuenta.',
}

export default async function CuentaAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams
  const d = await detalleCuenta(id)
  if (!d) notFound()
  const { org, estado, miembros, paginas, historial } = d
  const principal = miembros[0]?.email ?? org.nombre

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/cuentas" className="text-[13.5px] font-semibold text-[var(--color-tinta-60)] no-underline">
          ← Cuentas
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="truncate text-[24px] font-bold tracking-[-0.02em]">{principal}</h1>
          <ChipEstado estado={estado} />
        </div>
        <p className="mt-1 text-[13.5px] text-[var(--color-tinta-40)]">
          {org.nombre} · alta el {FECHA.format(org.creadoEn)} · id {org.id}
        </p>
      </div>

      {error && ERRORES[error] && (
        <p className="rounded-[12px] border-2 border-[var(--color-alerta)] bg-[#FDF3F2] px-4 py-3 text-[14.5px]">
          {ERRORES[error]}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Caja titulo="Plan y prueba">
          <dl className="grid grid-cols-2 gap-3 text-[14px]">
            <Dato nombre="Plan contratado" valor={planDe(org.plan).nombre} />
            <Dato
              nombre="Prueba"
              valor={
                org.pruebaHasta
                  ? diasDePrueba(org.pruebaHasta) > 0
                    ? `${diasDePrueba(org.pruebaHasta)} días (hasta el ${FECHA.format(org.pruebaHasta)})`
                    : `Acabó el ${FECHA.format(org.pruebaHasta)}`
                  : 'Sin fecha'
              }
            />
            <Dato nombre="Suscripción Stripe" valor={org.stripeSubscriptionId ? 'Activa' : 'No'} />
            <Dato
              nombre="Se renueva"
              valor={org.planHasta && org.stripeSubscriptionId ? FECHA.format(org.planHasta) : '—'}
            />
          </dl>

          <form action={cambiarPlan.bind(null, org.id)} className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-borde-suave)] pt-4">
            <label htmlFor="plan" className="text-[13.5px] font-semibold">Cambiar plan</label>
            <select id="plan" name="plan" defaultValue={org.plan} className={CAMPO}>
              {ORDEN_PLANES.map((c) => (
                <option key={c} value={c}>
                  {c === 'GRATIS' ? 'Sin plan' : `${PLANES[c].nombre} (${precioEnEuros(PLANES[c].precioMensualCentimos)})`}
                </option>
              ))}
            </select>
            <button type="submit" className={BOTON}>Guardar</button>
          </form>
          <p className="mt-1.5 text-[12.5px] leading-[1.5] text-[var(--color-tinta-40)]">
            Un plan puesto aquí no cobra nada (cortesía).
            {org.stripeSubscriptionId &&
              ' Esta cuenta paga por Stripe: el próximo aviso de Stripe (renovación, baja) volverá a poner el plan que tenga allí.'}
          </p>

          <form action={fijarPrueba.bind(null, org.id)} className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-borde-suave)] pt-4">
            <label htmlFor="dias" className="text-[13.5px] font-semibold">Días de prueba desde hoy</label>
            <input id="dias" name="dias" type="number" min={0} max={365} defaultValue={15} className={`${CAMPO} w-[90px]`} />
            <button type="submit" className={BOTON}>Fijar</button>
          </form>
          <p className="mt-1.5 text-[12.5px] text-[var(--color-tinta-40)]">0 termina la prueba ahora.</p>
        </Caja>

        <Caja titulo="Personas">
          <ul className="flex flex-col gap-4">
            {miembros.map((m) => (
              <li key={m.userId} className="flex flex-col gap-2 border-b border-[var(--color-borde-suave)] pb-4 last:border-0 last:pb-0">
                <div>
                  <p className="font-semibold">{m.email}</p>
                  <p className="text-[12.5px] text-[var(--color-tinta-40)]">
                    {m.rol.toLowerCase()} · {m.verificado ? 'correo verificado' : 'sin verificar'} ·{' '}
                    {m.sesiones} {m.sesiones === 1 ? 'sesión abierta' : 'sesiones abiertas'}
                    {m.ultimoUso ? ` · último uso ${FECHA_HORA.format(new Date(m.ultimoUso))}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!esSuperadmin(m.email) && (
                    <form action={entrarComo.bind(null, m.userId)}>
                      <button type="submit" className={BOTON}>Entrar como</button>
                    </form>
                  )}
                  {m.sesiones > 0 && (
                    <form action={cerrarSesionesDe.bind(null, org.id, m.userId)}>
                      <button type="submit" className={BOTON}>Cerrar sus sesiones</button>
                    </form>
                  )}
                </div>
                <form action={cambiarEmail.bind(null, org.id, m.userId)} className="flex flex-wrap gap-2">
                  <input name="email" type="email" required defaultValue={m.email} className={`${CAMPO} min-w-0 flex-1`} aria-label="Nuevo correo" />
                  <button type="submit" className={BOTON}>Cambiar correo</button>
                </form>
              </li>
            ))}
          </ul>
          <form action={renombrarCuenta.bind(null, org.id)} className="mt-4 flex flex-wrap gap-2 border-t border-[var(--color-borde-suave)] pt-4">
            <input name="nombre" defaultValue={org.nombre} className={`${CAMPO} min-w-0 flex-1`} aria-label="Nombre de la cuenta" />
            <button type="submit" className={BOTON}>Renombrar cuenta</button>
          </form>
        </Caja>
      </div>

      <Caja titulo="Páginas">
        {paginas.length === 0 ? (
          <p className="text-[14.5px] text-[var(--color-tinta-60)]">No tiene páginas.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {paginas.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 border-b border-[var(--color-borde-suave)] pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <a href={`${env.appUrl}/${p.slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--color-azul)]">
                    /{p.slug}
                  </a>
                  <ChipPagina estado={p.estado} />
                  {p.revisionPendiente && (
                    <span className="text-[12.5px] font-semibold text-[var(--color-alerta)]">Pendiente de revisión</span>
                  )}
                </div>
                <p className="text-[13px] text-[var(--color-tinta-60)]">
                  {p.titulo} · {p.visitas30} visitas en 30 días · {p.contactos} contactos
                  {p.denuncias > 0 ? ` · ${p.denuncias} denuncias abiertas` : ''}
                </p>
                {p.motivoSuspension && (
                  <p className="text-[13px] text-[var(--color-alerta)]">Motivo: {p.motivoSuspension}</p>
                )}
                {p.estado === 'SUSPENDIDA' ? (
                  <form action={restaurarPagina.bind(null, p.id)}>
                    <button type="submit" className={BOTON}>Reactivar y publicar</button>
                  </form>
                ) : (
                  <form action={suspenderPagina.bind(null, p.id)} className="flex flex-wrap gap-2">
                    <input name="motivo" placeholder="Motivo (lo verá el dueño en su panel)" className={`${CAMPO} min-w-0 flex-1`} />
                    <button type="submit" className={BOTON_PELIGRO}>Suspender</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Caja>

      <Caja titulo="Historial de superadmin">
        {historial.length === 0 ? (
          <p className="text-[14.5px] text-[var(--color-tinta-60)]">Nadie ha tocado esta cuenta desde aquí.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-[13.5px]">
            {historial.map((h) => (
              <li key={h.id}>
                <span className="text-[var(--color-tinta-40)]">{FECHA_HORA.format(h.ts)}</span> ·{' '}
                <strong>{h.accion.replaceAll('_', ' ')}</strong> · {h.adminEmail}
                {h.detalle ? <span className="text-[var(--color-tinta-40)]"> · {JSON.stringify(h.detalle)}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Caja>

      <section className="rounded-[14px] border-2 border-[var(--color-alerta)] bg-white p-5">
        <h2 className="text-[15px] font-bold text-[var(--color-alerta)]">Borrar la cuenta</h2>
        <p className="mt-1 text-[13.5px] leading-[1.5] text-[var(--color-tinta-60)]">
          Borra la cuenta, sus páginas, bloques, contactos y estadísticas, y a las personas que no
          estén en otra cuenta. No se puede deshacer.
          {org.stripeSubscriptionId && ' Ojo: tiene una suscripción en Stripe; cancélala allí antes, o seguirá cobrando.'}
        </p>
        <form action={borrarCuenta.bind(null, org.id)} className="mt-3 flex flex-wrap gap-2">
          <input name="confirmacion" placeholder={`Escribe ${miembros[0]?.email ?? 'el correo'}`} className={`${CAMPO} min-w-0 flex-1`} autoComplete="off" />
          <button type="submit" className={BOTON_PELIGRO}>Borrar para siempre</button>
        </form>
      </section>
    </div>
  )
}

function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <div>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-tinta-40)]">{nombre}</dt>
      <dd className="mt-0.5 font-semibold">{valor}</dd>
    </div>
  )
}
