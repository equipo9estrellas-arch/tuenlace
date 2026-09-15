import type { Metadata } from 'next'
import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { blocks, db, pages } from '@/db'
import { exigirSesion } from '@/lib/session'
import { resumenDePagina } from '@/lib/analitica'
import { calcularRecomendaciones } from '@/lib/recomendaciones'
import { env } from '@/lib/env'
import { LIMITE_BLOQUES_GRATIS } from '@/bloques/registro'
import { IconoAviso, IconoBien, IconoIdea, IconoPendiente, IconoPublicado } from '@/iconos'
import { Compartir } from './Compartir'

export const metadata: Metadata = { title: 'Tu panel', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const DIAS_POR_PLAN: Record<string, number> = {
  GRATIS: 7,
  ESENCIAL: 365,
  NEGOCIO: 3650,
  AGENCIA: 3650,
}

export default async function Panel({
  searchParams,
}: {
  searchParams: Promise<{ nueva?: string }>
}) {
  const sesion = await exigirSesion()
  const { nueva } = await searchParams

  const lista = await db
    .select()
    .from(pages)
    .where(eq(pages.orgId, sesion.orgId))
    .orderBy(desc(pages.creadoEn))

  if (lista.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-[24px] font-bold tracking-[-0.02em]">Todavía no tienes ningún enlace</h1>
        <Link
          href="/crear"
          className="mt-6 inline-block rounded-[12px] bg-[var(--color-acento)] px-6 py-3.5 text-[16px] font-semibold text-white no-underline"
        >
          Crear mi enlace
        </Link>
      </div>
    )
  }

  const principal = lista[0]
  const dias = DIAS_POR_PLAN[sesion.plan] ?? 7

  const [resumen, bloquesPagina] = await Promise.all([
    resumenDePagina(principal.id, dias),
    db.select().from(blocks).where(eq(blocks.pageId, principal.id)),
  ])

  const diasPublicada = principal.publicadaEn
    ? Math.floor((Date.now() - principal.publicadaEn.getTime()) / 86_400_000)
    : 0

  const recomendaciones = calcularRecomendaciones({
    resumen,
    diasPublicada,
    tieneWhatsapp: bloquesPagina.some((b) => b.tipo === 'WHATSAPP'),
    bloquesTotales: bloquesPagina.filter((b) => b.activo).length,
    plan: sesion.plan,
  })

  const url = `${env.appUrl}/${principal.slug}`

  return (
    <>
      {nueva && (
        <div className="mb-6 rounded-[14px] border-2 border-[var(--color-exito)] bg-[#F1FAF4] p-5">
          <p className="flex items-center gap-2 text-[17px] font-bold">
            <IconoPublicado tam={18} />
            Ya está publicada
          </p>
          <p className="mt-1.5 text-[15px] leading-[1.5] text-[var(--color-tinta-80)]">
            Tu página funciona y está en internet. Ahora ponla en tu bio de Instagram: ahí es donde
            de verdad empieza a servir para algo.
          </p>
        </div>
      )}

      {/* LA FRASE. Lo primero que se ve no es un gráfico, es una recomendación. */}
      {recomendaciones.length > 0 && (
        <section className="mb-6 rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
          <h2 className="text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
            {dias <= 7 ? 'Estos días' : 'Esta semana'}
          </h2>
          <div className="mt-3 flex flex-col gap-3.5">
            {recomendaciones.map((r) => (
              <div key={r.clave} className="flex gap-3">
                <span
                  className="mt-[1px] shrink-0"
                  style={{
                    color:
                      r.tono === 'bien'
                        ? 'var(--color-exito)'
                        : r.tono === 'aviso'
                          ? 'var(--color-alerta)'
                          : 'var(--color-tinta-40)',
                  }}
                >
                  {r.tono === 'bien' ? (
                    <IconoBien tam={17} />
                  ) : r.tono === 'aviso' ? (
                    <IconoAviso tam={17} />
                  ) : (
                    <IconoIdea tam={17} />
                  )}
                </span>
                <p className="flex-1 text-[15.5px] leading-[1.5]">{r.texto}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-5 sm:grid-cols-[1.1fr_1fr]">
        <section className="rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-[19px] font-bold tracking-[-0.01em]">
                {principal.titulo}
              </h1>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 block truncate text-[14px] text-[var(--color-azul)]"
              >
                tuenlace.es/{principal.slug}
              </a>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold uppercase ${
                principal.estado === 'PUBLICADA'
                  ? 'bg-[#EAF7EF] text-[var(--color-exito)]'
                  : 'bg-[var(--color-borde-suave)] text-[var(--color-tinta-60)]'
              }`}
            >
              {principal.estado === 'PUBLICADA' ? 'Publicada' : principal.estado}
            </span>
          </div>

          <Link
            href="/panel/editor"
            className="mt-4 block rounded-[10px] border-2 border-[var(--color-acento)] py-3 text-center text-[15.5px] font-semibold text-[var(--color-acento)] no-underline"
          >
            Editar mi página
          </Link>

          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--color-borde-suave)] pt-4">
            <Metrica etiqueta="Visitas" valor={resumen.visitas} />
            <Metrica etiqueta="Clics" valor={resumen.clics} />
            <Metrica etiqueta="Contactos" valor={resumen.conversiones} />
          </dl>

          {resumen.porOrigen.length > 0 && (
            <div className="mt-5 border-t border-[var(--color-borde-suave)] pt-4">
              <h3 className="text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
                De dónde vienen
              </h3>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {resumen.porOrigen.slice(0, 4).map((o) => (
                  <li key={o.origen} className="flex items-center justify-between text-[14.5px]">
                    <span className="capitalize text-[var(--color-tinta-80)]">{o.origen}</span>
                    <span className="font-semibold tabular-nums">{o.total}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <Compartir url={url} slug={principal.slug} />
      </div>

      {/* La lista de mejoras: aquí vive la monetización, sin muros. */}
      {sesion.plan === 'GRATIS' && (
        <section className="mt-5 rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
          <h2 className="text-[16px] font-bold">Mejora tu página</h2>
          <ul className="mt-3.5 flex flex-col gap-2.5 text-[15px]">
            <ItemHecho>Tu página está publicada</ItemHecho>
            <ItemHecho>Ya tienes tu código QR</ItemHecho>
            <ItemPendiente>Quitar «Creado con TUENLACE» de tu página</ItemPendiente>
            <ItemPendiente>Guardar más de 7 días de datos de tus visitas</ItemPendiente>
            <ItemPendiente>Recoger los datos de quien te escribe</ItemPendiente>
            <ItemPendiente>Enseñar tus reseñas de Google</ItemPendiente>
          </ul>
          <p className="mt-4 text-[14px] text-[var(--color-tinta-60)]">
            Todo eso está en <strong className="text-[var(--color-tinta)]">Esencial</strong>, por
            4,92 € al mes. Llevas {bloquesPagina.length} de {LIMITE_BLOQUES_GRATIS} bloques.
          </p>
        </section>
      )}
    </>
  )
}

function Metrica({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-tinta-40)]">
        {etiqueta}
      </dt>
      <dd className="mt-0.5 text-[26px] font-bold tabular-nums tracking-[-0.02em]">{valor}</dd>
    </div>
  )
}

function ItemHecho({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[var(--color-tinta-40)]">
      <span className="mt-[1px] shrink-0 text-[var(--color-exito)]">
        <IconoBien tam={16} />
      </span>
      <span className="line-through">{children}</span>
    </li>
  )
}

function ItemPendiente({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-[1px] shrink-0 text-[var(--color-tinta-40)]">
        <IconoPendiente tam={16} />
      </span>
      <span>{children}</span>
    </li>
  )
}
