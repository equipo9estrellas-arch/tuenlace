import Link from 'next/link'
import { listarPaginas } from '@/lib/admin-datos'
import { env } from '@/lib/env'
import { restaurarPagina, suspenderPagina } from '../acciones'
import { BOTON, BOTON_PELIGRO, CAMPO, ChipPagina, FECHA } from '../piezas'

export const metadata = { title: 'Páginas' }

const FILTROS = [
  { clave: '', nombre: 'Todas' },
  { clave: 'PUBLICADA', nombre: 'Publicadas' },
  { clave: 'SUSPENDIDA', nombre: 'Suspendidas' },
  { clave: 'BORRADOR', nombre: 'Borradores' },
  { clave: 'revision', nombre: 'Por revisar' },
] as const

export default async function PaginasAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; f?: string }>
}) {
  const { q, f } = await searchParams
  const filtro = FILTROS.find((x) => x.clave === f)?.clave ?? ''
  const paginas = await listarPaginas({
    q: q?.trim() || undefined,
    estado: filtro && filtro !== 'revision' ? filtro : undefined,
    revision: filtro === 'revision',
  })

  const enlace = (clave: string) => {
    const p = new URLSearchParams()
    if (clave) p.set('f', clave)
    if (q) p.set('q', q)
    const s = p.toString()
    return `/admin/paginas${s ? `?${s}` : ''}`
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[24px] font-bold tracking-[-0.02em]">Páginas</h1>

      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap gap-1">
          {FILTROS.map((x) => (
            <Link
              key={x.clave}
              href={enlace(x.clave)}
              className={`rounded-full px-3 py-1.5 text-[13px] font-semibold no-underline ${
                filtro === x.clave
                  ? 'bg-[var(--color-tinta)] text-white'
                  : 'border border-[var(--color-borde)] bg-white text-[var(--color-tinta-60)]'
              }`}
            >
              {x.nombre}
            </Link>
          ))}
        </nav>
        <form className="flex w-full gap-2 sm:ml-auto sm:w-auto">
          {filtro && <input type="hidden" name="f" value={filtro} />}
          <input type="search" name="q" defaultValue={q ?? ''} placeholder="Dirección o título…" className={`${CAMPO} w-full sm:w-[260px]`} />
        </form>
      </div>

      <ul className="overflow-hidden rounded-[14px] border border-[var(--color-borde)] bg-white">
        {paginas.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 border-b border-[var(--color-borde-suave)] px-4 py-3 last:border-0">
            <div className="flex flex-wrap items-center gap-2">
              <a href={`${env.appUrl}/${p.slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--color-azul)]">
                /{p.slug}
              </a>
              <ChipPagina estado={p.estado} />
              {p.revisionPendiente && <span className="text-[12.5px] font-semibold text-[var(--color-alerta)]">Por revisar</span>}
              <span className="ml-auto text-[12.5px] text-[var(--color-tinta-40)]">{FECHA.format(p.creadoEn)}</span>
            </div>
            <p className="text-[13px] text-[var(--color-tinta-60)]">
              {p.titulo} ·{' '}
              <Link href={`/admin/cuentas/${p.orgId}`} className="text-[var(--color-tinta-60)]">
                cuenta {p.orgNombre}
              </Link>
              {p.motivoSuspension ? <span className="text-[var(--color-alerta)]"> · {p.motivoSuspension}</span> : null}
            </p>
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
        {paginas.length === 0 && (
          <li className="px-4 py-10 text-center text-[14.5px] text-[var(--color-tinta-60)]">Nada con ese filtro.</li>
        )}
      </ul>
    </div>
  )
}
