import type { Metadata } from 'next'
import Link from 'next/link'
import { and, gte, inArray, sql } from 'drizzle-orm'
import { db, leads, pageViews } from '@/db'
import { exigirSesion } from '@/lib/session'
import { paginaActiva } from '@/lib/paginas'
import { PLANES, limitesDe, precioEnEuros } from '@/lib/planes'
import { env } from '@/lib/env'
import { borrarPagina, elegirPagina } from './acciones'

export const metadata: Metadata = { title: 'Tus páginas', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const MENSAJES: Record<string, string> = {
  ultima: 'Es tu única página: no se puede borrar.',
  confirmacion: 'Para borrarla, escribe exactamente su dirección.',
  limite: 'Ya tienes todas las páginas que permite tu plan.',
}

export default async function PaginaPaginas({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; p?: string; borrada?: string }>
}) {
  const sesion = await exigirSesion()
  const { error, borrada } = await searchParams
  const { activa, todas } = await paginaActiva(sesion.orgId)
  const limite = limitesDe(sesion.plan).paginas
  const ids = todas.map((p) => p.id)
  const hace30 = new Date(Date.now() - 30 * 86_400_000)

  const [visitas, contactos] = ids.length
    ? await Promise.all([
        db
          .select({ pageId: pageViews.pageId, n: sql<number>`count(*)::int` })
          .from(pageViews)
          .where(and(inArray(pageViews.pageId, ids), gte(pageViews.ts, hace30)))
          .groupBy(pageViews.pageId),
        db
          .select({ pageId: leads.pageId, n: sql<number>`count(*)::int` })
          .from(leads)
          .where(inArray(leads.pageId, ids))
          .groupBy(leads.pageId),
      ])
    : [[], []]
  const de = (lista: { pageId: string; n: number }[], id: string) => lista.find((f) => f.pageId === id)?.n ?? 0

  const quedan = limite - todas.length
  const agencia = PLANES.AGENCIA

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.02em]">Tus páginas</h1>
          <p className="mt-1 text-[14.5px] text-[var(--color-tinta-60)]">
            {todas.length} de {limite} {limite === 1 ? 'página' : 'páginas'} de tu plan. Cada una con sus
            contactos y sus estadísticas.
          </p>
        </div>
        {quedan > 0 && (
          <Link
            href="/panel/paginas/nueva"
            className="rounded-[10px] bg-[var(--color-acento)] px-4 py-2.5 text-[14.5px] font-semibold text-white no-underline"
          >
            + Nueva página
          </Link>
        )}
      </header>

      {error && MENSAJES[error] && (
        <p className="rounded-[12px] border-2 border-[var(--color-alerta)] bg-[#FDF3F2] px-4 py-3 text-[14.5px]">
          {MENSAJES[error]}
        </p>
      )}
      {borrada && (
        <p className="rounded-[12px] border border-[var(--color-borde)] bg-white px-4 py-3 text-[14.5px]">
          Página borrada.
        </p>
      )}

      {quedan <= 0 && limite < agencia.limites.paginas && (
        <div className="rounded-[14px] border-2 border-[var(--color-acento)] bg-white p-5">
          <p className="text-[15.5px] font-semibold">¿Llevas la página de varios negocios?</p>
          <p className="mt-1 text-[14.5px] text-[var(--color-tinta-60)]">
            Con el plan {agencia.nombre} tienes hasta {agencia.limites.paginas} páginas, una por cliente,
            desde este mismo panel, por {precioEnEuros(agencia.precioMensualCentimos)} + IGIC al mes.
          </p>
          <Link
            href="/panel/plan"
            className="mt-3 inline-block rounded-[10px] bg-[var(--color-acento)] px-4 py-2.5 text-[14.5px] font-semibold text-white no-underline"
          >
            Ver el plan {agencia.nombre}
          </Link>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {todas.map((p, i) => {
          const fuera = i >= limite
          return (
            <li key={p.id} className="rounded-[14px] border border-[var(--color-borde)] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[16px] font-bold">{p.titulo}</span>
                    {p.id === activa?.id && (
                      <span className="rounded-full bg-[var(--color-tinta)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                        Abierta
                      </span>
                    )}
                    {fuera ? (
                      <span className="rounded-full bg-[#FDF3F2] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-alerta)]">
                        No se ve: no cabe en tu plan
                      </span>
                    ) : p.estado === 'SUSPENDIDA' ? (
                      <span className="rounded-full bg-[#FDF3F2] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-alerta)]">
                        Suspendida
                      </span>
                    ) : null}
                  </p>
                  <a
                    href={`${env.appUrl}/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] text-[var(--color-azul)]"
                  >
                    tuenlace.es/{p.slug}
                  </a>
                  <p className="mt-1 text-[13px] text-[var(--color-tinta-40)]">
                    {de(visitas, p.id)} visitas en 30 días · {de(contactos, p.id)} contactos
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={elegirPagina.bind(null, p.id, '/panel')}>
                    <button
                      type="submit"
                      className="rounded-[10px] border border-[var(--color-borde)] px-3.5 py-2 text-[13.5px] font-semibold"
                    >
                      Ver su panel
                    </button>
                  </form>
                  <form action={elegirPagina.bind(null, p.id, '/panel/editor')}>
                    <button
                      type="submit"
                      className="rounded-[10px] bg-[var(--color-tinta)] px-3.5 py-2 text-[13.5px] font-semibold text-white"
                    >
                      Editar
                    </button>
                  </form>
                </div>
              </div>
              {todas.length > 1 && (
                <details className="mt-3 border-t border-[var(--color-borde-suave)] pt-3">
                  <summary className="cursor-pointer text-[13px] font-semibold text-[var(--color-alerta)]">
                    Borrar esta página
                  </summary>
                  <form action={borrarPagina.bind(null, p.id)} className="mt-2 flex flex-wrap gap-2">
                    <input
                      name="confirmacion"
                      autoComplete="off"
                      placeholder={`Escribe ${p.slug} para confirmar`}
                      className="min-w-0 flex-1 rounded-[10px] border border-[var(--color-borde)] px-3 py-2 text-[14px]"
                    />
                    <button
                      type="submit"
                      className="rounded-[10px] bg-[var(--color-alerta)] px-3.5 py-2 text-[13.5px] font-semibold text-white"
                    >
                      Borrar para siempre
                    </button>
                  </form>
                  <p className="mt-1.5 text-[12.5px] text-[var(--color-tinta-40)]">
                    Se borran sus bloques, contactos y estadísticas. No se puede deshacer.
                  </p>
                </details>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
