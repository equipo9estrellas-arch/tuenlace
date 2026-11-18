import type { Metadata } from 'next'
import Link from 'next/link'
import { exigirSesion } from '@/lib/session'
import { contarPorEtapa, listarContactos, nombreVisible } from '@/lib/crm'
import { paginaActiva } from '@/lib/paginas'
import { ETAPAS, etapaValida, formatoEuros, nombreOrigen } from '@/lib/crm-etapas'
import { limitesDe } from '@/lib/planes'
import { IconoBuscar, IconoDescarga, IconoMas } from '@/iconos'
import { AvisoPipeline, ChipEtapa, cuando } from './piezas'

export const metadata: Metadata = { title: 'Contactos', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaContactos({
  searchParams,
}: {
  searchParams: Promise<{ etapa?: string; q?: string }>
}) {
  const sesion = await exigirSesion()
  const { etapa: etapaPedida, q } = await searchParams
  const etapa = etapaValida(etapaPedida) ? etapaPedida : undefined
  const conPipeline = limitesDe(sesion.plan).pipeline

  const { activa } = await paginaActiva(sesion.orgId)
  const [contactos, porEtapa] = await Promise.all([
    listarContactos(sesion.orgId, { etapa, q, pageId: activa?.id }),
    contarPorEtapa(sesion.orgId, activa?.id),
  ])
  const total = Object.values(porEtapa).reduce((a, b) => a + b, 0)

  const enlace = (e?: string) => {
    const p = new URLSearchParams()
    if (e) p.set('etapa', e)
    if (q) p.set('q', q)
    const s = p.toString()
    return `/panel/contactos${s ? `?${s}` : ''}`
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.02em]">Contactos</h1>
          <p className="mt-1 text-[14.5px] text-[var(--color-tinta-60)]">
            Quien te ha escrito desde tu página, y los que añades tú.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
        {limitesDe(sesion.plan).exportar && total > 0 && (
          <a
            href="/panel/contactos/exportar"
            className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-borde)] bg-white px-4 py-2.5 text-[14.5px] font-semibold text-[var(--color-tinta)] no-underline"
          >
            <IconoDescarga tam={16} />
            Exportar a Excel
          </a>
        )}
        {conPipeline && (
          <Link
            href="/panel/contactos/nuevo"
            className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-acento)] px-4 py-2.5 text-[14.5px] font-semibold text-white no-underline"
          >
            <IconoMas tam={16} />
            Añadir contacto
          </Link>
        )}
        </div>
      </header>

      {!conPipeline && total > 0 && (
        <AvisoPipeline
          plan={sesion.plan}
          texto="Aquí ves quién te ha escrito. Con Esencial los mueves por etapas hasta que compran, apuntas cuánto te han pagado y sabes qué canal te da dinero."
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap gap-1" aria-label="Filtrar por etapa">
          <Pestana href={enlace()} activa={!etapa} nombre="Todos" total={total} />
          {ETAPAS.map((e) => (
            <Pestana
              key={e.clave}
              href={enlace(e.clave)}
              activa={etapa === e.clave}
              nombre={e.nombre}
              total={porEtapa[e.clave]}
            />
          ))}
        </nav>

        <form className="flex w-full items-center sm:ml-auto sm:w-auto sm:min-w-[260px] gap-2 rounded-[10px] border border-[var(--color-borde)] bg-white px-3 py-2">
          {etapa && <input type="hidden" name="etapa" value={etapa} />}
          <span className="text-[var(--color-tinta-40)]">
            <IconoBuscar tam={16} />
          </span>
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Buscar nombre, teléfono, correo…"
            className="w-full bg-transparent text-[14.5px] outline-none"
          />
        </form>
      </div>

      {contactos.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[var(--color-borde)] bg-white px-6 py-12 text-center">
          <p className="text-[16px] font-semibold">
            {total === 0 ? 'Todavía no tienes contactos' : 'Nada con ese filtro'}
          </p>
          <p className="mx-auto mt-1.5 max-w-[440px] text-[14.5px] leading-[1.5] text-[var(--color-tinta-60)]">
            {total === 0
              ? 'Aparecen aquí en cuanto alguien rellena el formulario de tu página. Si aún no tienes uno, añádelo desde Mi página.'
              : 'Prueba con otra etapa o con otra búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-[var(--color-borde)] bg-white">
          <table className="w-full text-left text-[14.5px]">
            <thead className="hidden border-b border-[var(--color-borde)] bg-[var(--color-papel)] text-[12px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)] md:table-header-group">
              <tr>
                <th className="px-4 py-2.5">Contacto</th>
                <th className="px-4 py-2.5">Canal</th>
                <th className="px-4 py-2.5">Etapa</th>
                <th className="px-4 py-2.5 text-right">Importe</th>
                <th className="px-4 py-2.5 text-right">Llegó</th>
              </tr>
            </thead>
            <tbody>
              {contactos.map((c) => (
                <tr
                  key={c.id}
                  className="relative flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-[var(--color-borde-suave)] px-4 py-3 last:border-0 hover:bg-[var(--color-papel)] md:table-row md:p-0"
                >
                  <td className="min-w-0 flex-1 md:px-4 md:py-3">
                    <Link
                      href={`/panel/contactos/${c.id}`}
                      className="font-semibold text-[var(--color-tinta)] no-underline after:absolute after:inset-0"
                    >
                      {nombreVisible(c)}
                    </Link>
                    <p className="truncate text-[13px] text-[var(--color-tinta-40)]">
                      {[c.telefono, c.email].filter(Boolean).join(' · ') || (c.mensaje ? c.mensaje : '—')}
                    </p>
                    {/* En el móvil, canal y fecha van aquí: cinco columnas no caben. */}
                    <p className="mt-0.5 text-[12.5px] text-[var(--color-tinta-40)] md:hidden">
                      {nombreOrigen(c.origen)} · {cuando(c.ts)}
                    </p>
                  </td>
                  <td className="hidden text-[13.5px] text-[var(--color-tinta-60)] md:table-cell md:px-4 md:py-3">
                    {nombreOrigen(c.origen)}
                    {c.manual && <span className="text-[var(--color-tinta-40)]"> · a mano</span>}
                  </td>
                  <td className="flex flex-col items-end gap-1 md:table-cell md:px-4 md:py-3">
                    <ChipEtapa etapa={c.etapa} />
                    {c.importeCentimos ? (
                      <span className="text-[13.5px] font-semibold tabular-nums md:hidden">
                        {formatoEuros(c.importeCentimos)}
                      </span>
                    ) : null}
                  </td>
                  <td className="hidden text-[14px] font-semibold tabular-nums md:table-cell md:px-4 md:py-3 md:text-right">
                    {c.importeCentimos ? formatoEuros(c.importeCentimos) : ''}
                  </td>
                  <td className="hidden text-[13px] text-[var(--color-tinta-40)] md:table-cell md:px-4 md:py-3 md:text-right">
                    {cuando(c.ts)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Pestana({ href, activa, nombre, total }: { href: string; activa: boolean; nombre: string; total: number }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-[13px] font-semibold no-underline ${
        activa
          ? 'bg-[var(--color-tinta)] text-white'
          : 'border border-[var(--color-borde)] bg-white text-[var(--color-tinta-60)] hover:text-[var(--color-tinta)]'
      }`}
    >
      {nombre} <span className={activa ? 'opacity-70' : 'text-[var(--color-tinta-40)]'}>{total}</span>
    </Link>
  )
}
