import Link from 'next/link'
import { metricas, listarCuentas } from '@/lib/admin-datos'
import { precioEnEuros } from '@/lib/planes'
import { ChipEstado, Cifra, FECHA } from './piezas'

export const metadata = { title: 'Resumen' }

const NUM = new Intl.NumberFormat('es-ES')

export default async function ResumenAdmin() {
  const [m, recientes] = await Promise.all([metricas(), listarCuentas({})])
  const c = m.cuentas

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[24px] font-bold tracking-[-0.02em]">Resumen</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cifra
          nombre="Suscripciones al mes"
          valor={precioEnEuros(m.mrrCentimos)}
          nota="Suscripciones activas en Stripe, IVA incluido"
        />
        <Cifra nombre="De pago" valor={NUM.format(c.pago)} />
        <Cifra
          nombre="En prueba"
          valor={NUM.format(c.prueba)}
          nota={c.pruebaAcaba3 > 0 ? `${c.pruebaAcaba3} terminan en 3 días` : undefined}
        />
        <Cifra nombre="Sin plan" valor={NUM.format(c.caducadas)} nota="Prueba terminada, página oculta" />
        <Cifra nombre="Cuentas" valor={NUM.format(c.total)} nota={`${c.altas30} altas en 30 días`} />
        <Cifra nombre="Cortesía" valor={NUM.format(c.cortesia)} nota="Plan puesto a mano, no cobra" />
        <Cifra
          nombre="Páginas publicadas"
          valor={NUM.format(m.paginas.publicadas)}
          nota={`${m.paginas.suspendidas} suspendidas · ${m.paginas.borradores} borradores`}
        />
        <Cifra nombre="Denuncias abiertas" valor={NUM.format(m.denunciasAbiertas)} />
        <Cifra nombre="Visitas · 30 días" valor={NUM.format(m.visitas30)} />
        <Cifra nombre="Clics · 30 días" valor={NUM.format(m.clics30)} />
        <Cifra nombre="Contactos · 30 días" valor={NUM.format(m.contactos30)} />
      </div>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-bold">Últimas altas</h2>
          <Link href="/admin/cuentas" className="text-[14px] font-semibold text-[var(--color-azul)]">
            Ver todas
          </Link>
        </div>
        <ul className="mt-3 overflow-hidden rounded-[14px] border border-[var(--color-borde)] bg-white">
          {recientes.slice(0, 8).map((o) => (
            <li key={o.id} className="border-b border-[var(--color-borde-suave)] last:border-0">
              <Link
                href={`/admin/cuentas/${o.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-[14.5px] text-[var(--color-tinta)] no-underline hover:bg-[var(--color-papel)]"
              >
                <span className="min-w-0 flex-1 truncate font-semibold">{o.correos[0] ?? o.nombre}</span>
                <span className="text-[13px] text-[var(--color-tinta-40)]">
                  {o.paginas.map((p) => `/${p.slug}`).join(' · ') || 'sin página'}
                </span>
                <ChipEstado estado={o.estado} />
                <span className="w-[100px] text-right text-[13px] text-[var(--color-tinta-40)]">
                  {FECHA.format(o.creadoEn)}
                </span>
              </Link>
            </li>
          ))}
          {recientes.length === 0 && (
            <li className="px-4 py-8 text-center text-[14.5px] text-[var(--color-tinta-60)]">Aún no hay cuentas.</li>
          )}
        </ul>
      </section>
    </div>
  )
}
