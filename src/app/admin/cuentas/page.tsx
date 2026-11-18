import Link from 'next/link'
import { NOMBRE_ESTADO, listarCuentas, type EstadoCuenta } from '@/lib/admin-datos'
import { diasDePrueba, planDe } from '@/lib/planes'
import { CAMPO, ChipEstado, FECHA } from '../piezas'

export const metadata = { title: 'Cuentas' }

const ESTADOS = Object.keys(NOMBRE_ESTADO) as EstadoCuenta[]

export default async function CuentasAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; borrada?: string }>
}) {
  const { q, estado: pedido, borrada } = await searchParams
  const estado = ESTADOS.includes(pedido as EstadoCuenta) ? (pedido as EstadoCuenta) : undefined
  const cuentas = await listarCuentas({ q: q?.trim() || undefined, estado })

  const enlace = (e?: EstadoCuenta) => {
    const p = new URLSearchParams()
    if (e) p.set('estado', e)
    if (q) p.set('q', q)
    const s = p.toString()
    return `/admin/cuentas${s ? `?${s}` : ''}`
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[24px] font-bold tracking-[-0.02em]">Cuentas</h1>

      {borrada && (
        <p className="rounded-[12px] border border-[var(--color-borde)] bg-white px-4 py-3 text-[14.5px]">
          Cuenta borrada. Queda en el registro.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap gap-1">
          <Filtro href={enlace()} activa={!estado} nombre="Todas" />
          {ESTADOS.map((e) => (
            <Filtro key={e} href={enlace(e)} activa={estado === e} nombre={NOMBRE_ESTADO[e]} />
          ))}
        </nav>
        <form className="flex w-full gap-2 sm:ml-auto sm:w-auto">
          {estado && <input type="hidden" name="estado" value={estado} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Correo, nombre o página…"
            className={`${CAMPO} w-full sm:w-[280px]`}
          />
        </form>
      </div>

      <p className="text-[13px] text-[var(--color-tinta-40)]">
        {cuentas.length === 200 ? 'Las 200 más recientes' : `${cuentas.length} cuentas`}
      </p>

      <div className="overflow-x-auto rounded-[14px] border border-[var(--color-borde)] bg-white">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead className="border-b border-[var(--color-borde)] bg-[var(--color-papel)] text-[12px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
            <tr>
              <th className="px-4 py-2.5">Cuenta</th>
              <th className="px-4 py-2.5">Páginas</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5">Plan / prueba</th>
              <th className="px-4 py-2.5 text-right">Alta</th>
            </tr>
          </thead>
          <tbody>
            {cuentas.map((o) => (
              <tr key={o.id} className="relative border-b border-[var(--color-borde-suave)] last:border-0 hover:bg-[var(--color-papel)]">
                <td className="px-4 py-3">
                  <Link href={`/admin/cuentas/${o.id}`} className="font-semibold text-[var(--color-tinta)] no-underline after:absolute after:inset-0">
                    {o.correos[0] ?? '—'}
                  </Link>
                  <p className="text-[12.5px] text-[var(--color-tinta-40)]">{o.nombre}</p>
                </td>
                <td className="px-4 py-3 text-[13px] text-[var(--color-tinta-60)]">
                  {o.paginas.map((p) => (
                    <span key={p.slug} className={p.estado === 'SUSPENDIDA' ? 'text-[var(--color-alerta)]' : ''}>
                      /{p.slug}{' '}
                    </span>
                  ))}
                </td>
                <td className="px-4 py-3">
                  <ChipEstado estado={o.estado} />
                </td>
                <td className="px-4 py-3 text-[13px] text-[var(--color-tinta-60)]">
                  {o.estado === 'PRUEBA'
                    ? `${diasDePrueba(o.pruebaHasta)} días`
                    : o.estado === 'CADUCADA'
                      ? o.pruebaHasta
                        ? `Acabó el ${FECHA.format(o.pruebaHasta)}`
                        : '—'
                      : planDe(o.plan).nombre}
                </td>
                <td className="px-4 py-3 text-right text-[13px] text-[var(--color-tinta-40)]">{FECHA.format(o.creadoEn)}</td>
              </tr>
            ))}
            {cuentas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[14.5px] text-[var(--color-tinta-60)]">
                  Nada con ese filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Filtro({ href, activa, nombre }: { href: string; activa: boolean; nombre: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-[13px] font-semibold no-underline ${
        activa
          ? 'bg-[var(--color-tinta)] text-white'
          : 'border border-[var(--color-borde)] bg-white text-[var(--color-tinta-60)] hover:text-[var(--color-tinta)]'
      }`}
    >
      {nombre}
    </Link>
  )
}
