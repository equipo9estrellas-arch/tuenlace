import type { Metadata } from 'next'
import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { blocks, db, organizations, pages } from '@/db'
import type { AjustesPagina } from '@/db/schema'
import { exigirSesion } from '@/lib/session'
import { resumenComparado, variacion } from '@/lib/analitica'
import { calcularRecomendaciones } from '@/lib/recomendaciones'
import { env } from '@/lib/env'
import { limitesDe, planDe, precioEnEuros, siguientePlan } from '@/lib/planes'
import {
  IconoAviso,
  IconoBien,
  IconoIdea,
  IconoOjo,
  IconoPublicado,
} from '@/iconos'
import { Compartir } from './Compartir'
import { Grafica } from './Grafica'

export const metadata: Metadata = { title: 'Tu panel', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** Los periodos que ofrece el selector. El plan recorta hasta dónde llega. */
const PERIODOS = [
  { dias: 7, etiqueta: '7 días' },
  { dias: 30, etiqueta: '30 días' },
  { dias: 90, etiqueta: '90 días' },
  { dias: 365, etiqueta: '12 meses' },
]

export default async function Panel({
  searchParams,
}: {
  searchParams: Promise<{ nueva?: string; dias?: string }>
}) {
  const sesion = await exigirSesion()
  const { nueva, dias: diasPedidos } = await searchParams

  const lista = await db
    .select()
    .from(pages)
    .where(eq(pages.orgId, sesion.orgId))
    .orderBy(desc(pages.creadoEn))

  if (lista.length === 0) return <SinPaginas />

  const principal = lista[0]
  const limites = limitesDe(sesion.plan)
  const plan = planDe(sesion.plan)
  const siguiente = siguientePlan(sesion.plan)

  // El periodo lo pide la URL, pero lo decide el plan: pedir ?dias=365 con el
  // plan gratuito no puede devolver un año de datos.
  const pedido = Number(diasPedidos)
  const dias = Math.min(
    Number.isFinite(pedido) && pedido > 0 ? pedido : Math.min(30, limites.diasDeDatos),
    limites.diasDeDatos,
  )

  const [datos, bloquesPagina, orgFilas] = await Promise.all([
    resumenComparado(principal.id, dias),
    db.select().from(blocks).where(eq(blocks.pageId, principal.id)),
    db.select().from(organizations).where(eq(organizations.id, sesion.orgId)).limit(1),
  ])

  const { actual: resumen, anterior, serie } = datos
  const org = orgFilas[0]

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
  const ajustes = principal.ajustes as AjustesPagina
  // Lo mismo que hace la página pública: lo que vale es el plan de ahora.
  const marcaVisible = limites.quitarMarca ? ajustes.mostrarMarca : true

  return (
    <div className="flex flex-col gap-5">
      {nueva && (
        <div className="rounded-[14px] border-2 border-[var(--color-exito)] bg-[#F1FAF4] p-5">
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

      {/* Cabecera: qué página es, en qué estado y en qué plan. */}
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-[21px] font-bold tracking-[-0.015em]">
              {principal.titulo}
            </h1>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                principal.estado === 'PUBLICADA'
                  ? 'bg-[#EAF7EF] text-[var(--color-exito)]'
                  : 'bg-[var(--color-borde-suave)] text-[var(--color-tinta-60)]'
              }`}
            >
              {principal.estado === 'PUBLICADA' ? 'Publicada' : 'Borrador'}
            </span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-[14.5px] text-[var(--color-azul)]"
          >
            <IconoOjo tam={15} />
            tuenlace.es/{principal.slug}
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/panel/plan"
            className="rounded-full border border-[var(--color-borde)] px-3 py-1.5 text-[13px] font-semibold no-underline"
          >
            Plan {plan.nombre}
          </Link>
          <Link
            href="/panel/editor"
            className="rounded-[10px] bg-[var(--color-acento)] px-5 py-2.5 text-[15px] font-semibold text-white no-underline"
          >
            Editar mi página
          </Link>
        </div>
      </header>

      {/* La frase. Lo primero que se lee no es un gráfico, es qué hacer. */}
      {recomendaciones.length > 0 && (
        <section className="rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
          <h2 className="text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
            Qué hacer ahora
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

      {/* Métricas */}
      <section className="rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
            Cómo va
          </h2>
          <nav className="flex gap-1" aria-label="Periodo">
            {PERIODOS.map((p) => {
              const alcanzable = p.dias <= limites.diasDeDatos
              const activo = p.dias === dias
              if (!alcanzable) {
                return (
                  <span
                    key={p.dias}
                    title={`${p.etiqueta} es del plan ${siguiente?.nombre ?? 'de pago'}`}
                    className="cursor-not-allowed rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--color-tinta-40)] opacity-50"
                  >
                    {p.etiqueta}
                  </span>
                )
              }
              return (
                <Link
                  key={p.dias}
                  href={`/panel?dias=${p.dias}`}
                  className={`rounded-full px-3 py-1.5 text-[13px] font-semibold no-underline ${
                    activo
                      ? 'bg-[var(--color-tinta)] text-white'
                      : 'text-[var(--color-tinta-60)] hover:bg-[var(--color-borde-suave)]'
                  }`}
                >
                  {p.etiqueta}
                </Link>
              )
            })}
          </nav>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metrica
            etiqueta="Visitas"
            valor={resumen.visitas}
            cambio={anterior ? variacion(resumen.visitas, anterior.visitas) : null}
          />
          <Metrica etiqueta="Personas distintas" valor={resumen.unicos} />
          <Metrica
            etiqueta="Clics en botones"
            valor={resumen.clics}
            cambio={anterior ? variacion(resumen.clics, anterior.clics) : null}
          />
          <Metrica
            etiqueta="Contactos"
            valor={resumen.conversiones}
            cambio={anterior ? variacion(resumen.conversiones, anterior.conversiones) : null}
            destacada
          />
        </dl>

        <p className="mt-3 text-[13.5px] text-[var(--color-tinta-60)]">
          {resumen.visitas === 0
            ? 'Todavía no ha entrado nadie. En cuanto pongas el enlace en tu bio empezarán a verse datos aquí.'
            : `De cada 100 personas que entran, ${Math.round(resumen.ctr)} pulsan algún botón.`}
        </p>

        {serie.length > 1 && <Grafica serie={serie} />}
      </section>

      {/* Desglose */}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
          <h2 className="text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
            Qué botón funciona
          </h2>
          {resumen.porBloque.length === 0 ? (
            <Vacio>Nadie ha pulsado nada todavía.</Vacio>
          ) : (
            <Barras
              filas={resumen.porBloque.slice(0, 6).map((b) => ({
                nombre: b.texto,
                valor: b.clics,
              }))}
            />
          )}
        </section>

        <section className="rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
          <h2 className="text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
            De dónde vienen
          </h2>
          {resumen.porOrigen.length === 0 ? (
            <Vacio>Sin visitas en este periodo.</Vacio>
          ) : (
            <Barras
              filas={resumen.porOrigen.slice(0, 6).map((o) => ({
                nombre: o.origen,
                valor: o.total,
              }))}
              capitalizar
            />
          )}

          {resumen.porDispositivo.length > 0 && (
            <div className="mt-5 border-t border-[var(--color-borde-suave)] pt-4">
              <h3 className="text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
                Con qué entran
              </h3>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {resumen.porDispositivo.map((d) => (
                  <li key={d.dispositivo} className="flex items-center justify-between text-[14.5px]">
                    <span className="text-[var(--color-tinta-80)] first-letter:uppercase">
                      {d.dispositivo}
                    </span>
                    <span className="font-semibold tabular-nums">{d.total}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
        <Compartir url={url} slug={principal.slug} />

        {/* Estado de la cuenta: lo que tiene y lo que le falta, sin mentir. */}
        <section className="rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
          <h2 className="text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
            Tu cuenta
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-[14.5px]">
            <Fila nombre="Plan" valor={plan.nombre} />
            <Fila
              nombre="Bloques"
              valor={`${bloquesPagina.length} de ${limites.bloques >= 200 ? '∞' : limites.bloques}`}
            />
            <Fila
              nombre="Estadísticas"
              valor={
                limites.diasDeDatos >= 365
                  ? `${Math.round(limites.diasDeDatos / 30)} meses`
                  : `${limites.diasDeDatos} días`
              }
            />
            <Fila nombre="Sello de TUENLACE" valor={marcaVisible ? 'Visible' : 'Quitado'} />
            <Fila nombre="En buscadores" valor={ajustes.indexable && limites.indexar ? 'Sí' : 'No'} />
            {org?.planHasta && plan.precioMensualCentimos > 0 && (
              <Fila
                nombre="Se renueva"
                valor={new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(
                  org.planHasta,
                )}
              />
            )}
          </ul>

          {siguiente && (
            <Link
              href="/panel/plan"
              className="mt-4 block rounded-[10px] border-2 border-[var(--color-acento)] py-2.5 text-center text-[14.5px] font-semibold text-[var(--color-acento)] no-underline"
            >
              Pasar a {siguiente.nombre} · {precioEnEuros(siguiente.precioMensualCentimos)} al mes
            </Link>
          )}
        </section>
      </div>
    </div>
  )
}

// ── Piezas ───────────────────────────────────────────────────────────────────

function SinPaginas() {
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

function Metrica({
  etiqueta,
  valor,
  cambio,
  destacada,
}: {
  etiqueta: string
  valor: number
  cambio?: number | null
  destacada?: boolean
}) {
  return (
    <div>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-tinta-40)]">
        {etiqueta}
      </dt>
      <dd className="mt-0.5 flex items-baseline gap-2">
        <span
          className={`text-[28px] font-bold tabular-nums tracking-[-0.02em] ${
            destacada && valor > 0 ? 'text-[var(--color-exito)]' : ''
          }`}
        >
          {valor}
        </span>
        {cambio !== null && cambio !== undefined && (
          <span
            className={`text-[13px] font-semibold tabular-nums ${
              cambio > 0
                ? 'text-[var(--color-exito)]'
                : cambio < 0
                  ? 'text-[var(--color-alerta)]'
                  : 'text-[var(--color-tinta-40)]'
            }`}
            title="Frente al mismo periodo anterior"
          >
            {cambio > 0 ? '+' : ''}
            {cambio}%
          </span>
        )}
      </dd>
    </div>
  )
}

/**
 * Barras proporcionales al mayor valor, no al total: con un botón que se lleva
 * el 90% de los clics, las barras por total dejan a los demás en una línea de
 * un píxel y no se puede comparar entre ellos.
 */
function Barras({
  filas,
  capitalizar,
}: {
  filas: { nombre: string; valor: number }[]
  /** Los orígenes vienen en minúscula de la base; los textos de los botones los
      escribió el dueño y ya llevan sus mayúsculas donde toca. */
  capitalizar?: boolean
}) {
  const mayor = Math.max(...filas.map((f) => f.valor), 1)
  return (
    <ul className="mt-3 flex flex-col gap-2.5">
      {filas.map((f) => (
        <li key={f.nombre}>
          <div className="flex items-baseline justify-between gap-3 text-[14.5px]">
            <span
              className={`truncate text-[var(--color-tinta-80)] ${capitalizar ? 'first-letter:uppercase' : ''}`}
            >
              {f.nombre}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{f.valor}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-borde-suave)]">
            <div
              className="h-full rounded-full bg-[var(--color-acento)]"
              style={{ width: `${Math.max(4, (f.valor / mayor) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function Fila({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <li className="flex items-center justify-between border-b border-[var(--color-borde-suave)] pb-2 last:border-0 last:pb-0">
      <span className="text-[var(--color-tinta-60)]">{nombre}</span>
      <span className="font-semibold">{valor}</span>
    </li>
  )
}

function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[14px] text-[var(--color-tinta-40)]">{children}</p>
}
