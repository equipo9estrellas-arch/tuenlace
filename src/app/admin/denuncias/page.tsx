import Link from 'next/link'
import { listarDenuncias } from '@/lib/admin-datos'
import { env } from '@/lib/env'
import { resolverDenuncia } from '../acciones'
import { BOTON, BOTON_PELIGRO, CAMPO, ChipPagina, FECHA_HORA } from '../piezas'

export const metadata = { title: 'Denuncias' }

export default async function DenunciasAdmin({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>
}) {
  const { ver } = await searchParams
  const abiertas = ver !== 'resueltas'
  const denuncias = await listarDenuncias(abiertas)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[24px] font-bold tracking-[-0.02em]">Denuncias</h1>
        <nav className="flex gap-1">
          {[
            { href: '/admin/denuncias', nombre: 'Abiertas', activa: abiertas },
            { href: '/admin/denuncias?ver=resueltas', nombre: 'Resueltas', activa: !abiertas },
          ].map((x) => (
            <Link
              key={x.href}
              href={x.href}
              className={`rounded-full px-3 py-1.5 text-[13px] font-semibold no-underline ${
                x.activa ? 'bg-[var(--color-tinta)] text-white' : 'border border-[var(--color-borde)] bg-white text-[var(--color-tinta-60)]'
              }`}
            >
              {x.nombre}
            </Link>
          ))}
        </nav>
      </div>

      {abiertas && (
        <p className="text-[13.5px] text-[var(--color-tinta-60)]">
          Al resolver una, se resuelven todas las abiertas de la misma página. Desestimar una página
          suspendida la vuelve a publicar.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {denuncias.map((d) => (
          <li key={d.id} className="rounded-[14px] border border-[var(--color-borde)] bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <a href={`${env.appUrl}/${d.slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--color-azul)]">
                /{d.slug}
              </a>
              <ChipPagina estado={d.estadoPagina} />
              <Link href={`/admin/cuentas/${d.orgId}`} className="text-[13px] text-[var(--color-tinta-60)]">
                ver cuenta
              </Link>
              <span className="ml-auto text-[12.5px] text-[var(--color-tinta-40)]">{FECHA_HORA.format(d.creadoEn)}</span>
            </div>
            <p className="mt-2 text-[14.5px]">
              <strong>{d.motivo}</strong>
              {d.detalle ? ` · ${d.detalle}` : ''}
            </p>
            {!abiertas && (
              <p className="mt-1 text-[13px] text-[var(--color-tinta-60)]">
                {d.estado === 'DESESTIMADA' ? 'Desestimada' : 'Revisada y suspendida'}
                {d.revisadoEn ? ` el ${FECHA_HORA.format(d.revisadoEn)}` : ''}
                {d.nota ? ` · ${d.nota}` : ''}
              </p>
            )}
            {abiertas && (
              <form action={resolverDenuncia.bind(null, d.id)} className="mt-3 flex flex-wrap gap-2">
                <input name="nota" placeholder="Nota (opcional)" className={`${CAMPO} min-w-0 flex-1`} />
                <button type="submit" name="decision" value="desestimar" className={BOTON}>
                  Desestimar
                </button>
                <button type="submit" name="decision" value="suspender" className={BOTON_PELIGRO}>
                  Suspender página
                </button>
              </form>
            )}
          </li>
        ))}
        {denuncias.length === 0 && (
          <li className="rounded-[14px] border border-dashed border-[var(--color-borde)] bg-white px-4 py-10 text-center text-[14.5px] text-[var(--color-tinta-60)]">
            {abiertas ? 'No hay denuncias abiertas.' : 'Aún no hay denuncias resueltas.'}
          </li>
        )}
      </ul>
    </div>
  )
}
