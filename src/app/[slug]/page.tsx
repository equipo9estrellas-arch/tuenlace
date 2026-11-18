import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { and, asc, eq, or, isNull, lte, gte } from 'drizzle-orm'
import { blocks, db, organizations, pages } from '@/db'
import type { AjustesPagina } from '@/db/schema'
import { aplicarPlanAAjustes, limitesDe, planEfectivo } from '@/lib/planes'
import { RenderBloque } from '@/bloques/Render'
import { aplicarPlanATema, atributosTema, normalizarTema } from '@/bloques/tema'
import { reordenarRedes } from '@/bloques/Render'
import { SimboloMarca } from '@/iconos/marca'
import { detectarOrigen, registrarVisita } from '@/lib/analitica'
import { env } from '@/lib/env'
import { Rastreador } from './Rastreador'
import { BannerConsentimiento } from './BannerConsentimiento'
import { Seguimiento } from './Seguimiento'
import type { ConfigFaq } from '@/bloques/tipos'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

/**
 * `cache` de React deduplica dentro de la MISMA petición. Sin esto,
 * generateMetadata y el componente lanzan la misma consulta dos veces: dos
 * viajes a Postgres por cada visita, en la página más visitada del producto.
 * Next solo deduplica `fetch`, no las llamadas a Drizzle.
 */
const cargarPagina = cache(async (slug: string) => {
  // Se trae el plan de la organización en el mismo viaje. Hace falta aquí y no
  // solo al guardar: lo que decide si se esconde el sello o si Google puede
  // indexar es el plan QUE HAY AHORA, no el que había cuando se guardó el
  // ajuste. Si no, quien se da de baja se queda con las funciones de pago para
  // siempre, porque el `false` sigue escrito en su fila.
  const filas = await db
    .select({ pagina: pages, plan: organizations.plan, pruebaHasta: organizations.pruebaHasta })
    .from(pages)
    .innerJoin(organizations, eq(organizations.id, pages.orgId))
    .where(eq(pages.slug, slug.toLowerCase()))
    .limit(1)
  if (!filas[0]) return null
  // El plan con el que funciona HOY: en prueba es Esencial; sin plan y sin
  // prueba es 'GRATIS', y entonces la página no se publica.
  return { ...filas[0].pagina, plan: planEfectivo(filas[0].plan, filas[0].pruebaHasta) }
})


// ── Metadatos ────────────────────────────────────────────────────────────────
//
// En España estos enlaces se comparten por WhatsApp constantemente. La calidad
// de la vista previa importa más aquí que el posicionamiento en Google.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const pagina = await cargarPagina(slug)

  if (!pagina || pagina.estado !== 'PUBLICADA') {
    return { title: 'Página no encontrada', robots: { index: false, follow: false } }
  }
  if (pagina.plan === 'GRATIS') {
    return { title: 'Página no disponible', robots: { index: false, follow: false } }
  }

  const ajustes = aplicarPlanAAjustes(pagina.ajustes as AjustesPagina, pagina.plan)
  const url = `${env.appUrl}/${pagina.slug}`
  // Título y descripción propios (plan con `seo`); si no, los de la página.
  const titulo = ajustes.seoTitulo || pagina.titulo
  const descripcion = ajustes.seoDescripcion || pagina.descripcion || 'Contacta con nosotros'

  return {
    // Un título propio va tal cual, sin el « · tuenlace.es» de la plantilla.
    title: ajustes.seoTitulo ? { absolute: titulo } : titulo,
    description: descripcion,
    // Indexación selectiva por calidad (blueprint bloque 3, 8.8):
    // 40.000 páginas de contenido fino indexadas dañan la reputación del
    // dominio entero, incluida la web comercial.
    robots: ajustes.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    alternates: { canonical: url },
    openGraph: {
      type: 'profile',
      url,
      title: titulo,
      description: descripcion,
      siteName: pagina.titulo,
      locale: 'es_ES',
      images: pagina.portadaUrl
        ? [{ url: pagina.portadaUrl, width: 1200, height: 630, alt: pagina.titulo }]
        : pagina.avatarUrl
          ? [{ url: pagina.avatarUrl, width: 400, height: 400, alt: pagina.titulo }]
          : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description: descripcion,
    },
  }
}

// ── Página ───────────────────────────────────────────────────────────────────

export default async function PaginaPublica({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const pagina = await cargarPagina(slug)

  if (!pagina) notFound()

  if (pagina.estado === 'SUSPENDIDA') {
    return <PaginaSuspendida />
  }
  if (pagina.estado !== 'PUBLICADA') {
    notFound()
  }
  // Sin plan y con la prueba terminada: la página no se enseña, pero no se
  // borra nada. En cuanto el dueño activa un plan, vuelve tal cual estaba.
  if (pagina.plan === 'GRATIS') {
    return <PaginaInactiva />
  }

  const ahora = new Date()
  const limites = limitesDe(pagina.plan)

  // Solo bloques activos y, si el plan programa, dentro de su ventana. Tras
  // una baja la programación deja de aplicarse: se ven siempre.
  const lista = await db
    .select()
    .from(blocks)
    .where(
      and(
        eq(blocks.pageId, pagina.id),
        eq(blocks.activo, true),
        ...(limites.programar
          ? [
              or(isNull(blocks.visibleDesde), lte(blocks.visibleDesde, ahora)),
              or(isNull(blocks.visibleHasta), gte(blocks.visibleHasta, ahora)),
            ]
          : []),
      ),
    )
    // El desempate por creadoEn no es cosmético: si dos bloques comparten
    // `orden`, Postgres los devuelve en el orden que quiera y cambia en cuanto
    // un UPDATE reescribe la tupla. El título puede acabar bajo el botón.
    .orderBy(asc(blocks.orden), asc(blocks.creadoEn))

  // Contexto de la visita
  const h = await headers()
  const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

  const ip =
    h.get('cf-connecting-ip') ??
    h.get('x-forwarded-for')?.split(',')[0].trim() ??
    h.get('x-real-ip') ??
    '0.0.0.0'
  const userAgent = h.get('user-agent') ?? ''
  const referer = h.get('referer')
  const utmSource = primero(sp.utm_source)

  const origen = detectarOrigen(referer, utmSource)

  // Sin await: el INSERT de la visita no tiene por qué retrasar el primer byte
  // de una página que se abre en 4G dentro del navegador de Instagram.
  // registrarVisita captura sus propios errores.
  void registrarVisita(pagina.id, {
    ip,
    userAgent,
    referer,
    pais: h.get('cf-ipcountry'),
    ciudad: h.get('cf-ipcity'),
    utmSource,
    utmMedium: primero(sp.utm_medium),
    utmCampaign: primero(sp.utm_campaign),
  })

  // El tema se normaliza al leer: en producción hay páginas guardadas con los
  // valores anteriores al rediseño y no se migran con un UPDATE masivo.
  const tema = aplicarPlanATema(normalizarTema(pagina.tema), limites.disenoAvanzado)
  const { datos: datosTema, estilo: estiloTema } = atributosTema(tema)
  const bloques = reordenarRedes(lista, tema.redesPosicion)
  const ajustes = aplicarPlanAAjustes(pagina.ajustes as AjustesPagina, pagina.plan)
  const fbclid = primero(sp.fbclid)
  const hayPortada = Boolean(pagina.portadaUrl)
  // /api/lead redirige con ?enviado=1 al terminar. Sin leerlo, el visitante
  // rellena el formulario, la página se recarga igual y no sabe si llegó.
  const enviado = primero(sp.enviado) === '1'

  return (
    <main className="te-pagina" {...datosTema} style={estiloTema as React.CSSProperties}>
      {tema.fondo === 'video' && (
        <video
          className="te-fondo-video"
          src={tema.fondoVideoUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
      )}
      <div
        className={`te-columna flex min-h-dvh flex-col px-4 pb-10 ${hayPortada ? 'pt-4' : 'pt-12'}`}
      >
        {pagina.portadaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pagina.portadaUrl}
            alt=""
            className="te-portada"
            fetchPriority="high"
            decoding="async"
          />
        )}

        {pagina.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pagina.avatarUrl}
            alt={pagina.titulo}
            fetchPriority="high"
            decoding="async"
            data-forma={tema.avatarForma}
            className="te-avatar mx-auto mb-5"
            style={hayPortada ? { marginTop: 'calc(var(--p-avatar, 104px) / -2)' } : undefined}
          />
        )}

        {enviado && (
          <div
            role="status"
            className="te-tarjeta mb-4 p-4 text-center text-[15px]"
            style={{ color: 'var(--p-texto)' }}
          >
            {textoExitoDe(lista)}
          </div>
        )}

        <div className="te-lista">
          {bloques.map((bloque) => (
            <RenderBloque
              key={bloque.id}
              bloque={bloque}
              origen={etiquetaOrigen(origen)}
              conAnimaciones={limites.animaciones}
            />
          ))}
        </div>

        {lista.length === 0 && (
          <p className="te-parrafo py-12 text-center">Esta página todavía se está preparando.</p>
        )}

        <footer className="mt-auto pt-10 text-center">
          {ajustes.mostrarMarca && (
            <a
              href={`${env.appUrl}/?ref=${encodeURIComponent(pagina.slug)}`}
              rel="noopener"
              className="te-sello"
            >
              <SimboloMarca tam={14} mono />
              Creado con <strong style={{ color: 'var(--p-texto)' }}>tuenlace.es</strong>
            </a>
          )}
          <div className="mt-3">
            <a
              href={`/api/denunciar?p=${pagina.id}`}
              className="text-[11px] no-underline opacity-45"
              style={{ color: 'var(--p-texto-suave)' }}
              rel="nofollow"
            >
              Denunciar esta página
            </a>
          </div>
        </footer>
      </div>

      <Rastreador paginaId={pagina.id} origen={origen} fbclid={fbclid} />
      <BannerConsentimiento paginaId={pagina.id} />
      {(ajustes.pixelMeta || ajustes.ga4) && (
        <Seguimiento pixelMeta={ajustes.pixelMeta} ga4={ajustes.ga4} leadEnviado={enviado} />
      )}

      {/* Datos estructurados: ayudan a la presencia en Google del cliente.
          Ningún competidor de la categoría los genera. */}
      {ajustes.indexable && (
        <DatosEstructurados
          titulo={pagina.titulo}
          descripcion={pagina.descripcion}
          slug={pagina.slug}
          preguntas={lista
            .filter((b) => b.tipo === 'FAQ')
            .flatMap((b) => (b.config as ConfigFaq).preguntas ?? [])
            .filter((p) => p.pregunta && p.respuesta)}
        />
      )}
    </main>
  )
}

/** El mensaje que configuró el dueño; si no hay formulario, uno neutro. */
function textoExitoDe(lista: { tipo: string; config: unknown }[]): string {
  const formulario = lista.find((b) => b.tipo === 'FORMULARIO')
  const config = formulario?.config as { textoExito?: unknown } | undefined
  const texto = typeof config?.textoExito === 'string' ? config.textoExito.trim() : ''
  return texto || '¡Gracias! Te escribimos enseguida.'
}

function etiquetaOrigen(origen: string): string | undefined {
  const etiquetas: Record<string, string> = {
    instagram: 'desde Instagram',
    tiktok: 'desde TikTok',
    google: 'desde Google',
    qr: 'desde el QR',
    tarjeta: 'desde vuestra tarjeta',
    facebook: 'desde Facebook',
  }
  return etiquetas[origen]
}

function DatosEstructurados({
  titulo,
  descripcion,
  slug,
  preguntas,
}: {
  titulo: string
  descripcion: string | null
  slug: string
  preguntas: { pregunta: string; respuesta: string }[]
}) {
  const organizacion = {
    '@type': 'Organization',
    name: titulo,
    description: descripcion ?? undefined,
    url: `${env.appUrl}/${slug}`,
  }
  // Las preguntas frecuentes, marcadas para que Google pueda sacarlas en
  // los resultados. Ningún link-in-bio lo hace.
  const json = preguntas.length
    ? {
        '@context': 'https://schema.org',
        '@graph': [
          organizacion,
          {
            '@type': 'FAQPage',
            mainEntity: preguntas.map((p) => ({
              '@type': 'Question',
              name: p.pregunta,
              acceptedAnswer: { '@type': 'Answer', text: p.respuesta },
            })),
          },
        ],
      }
    : { '@context': 'https://schema.org', ...organizacion }
  return (
    <script
      type="application/ld+json"
      // JSON.stringify NO escapa "</script": un título de 37 caracteres basta
      // para cerrar el bloque y ejecutar código en el dominio principal.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, '\\u003c') }}
    />
  )
}

function PaginaInactiva() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-[20px] font-semibold">Esta página no está activa ahora mismo</h1>
        <p className="mt-2 text-[15px] text-[var(--color-tinta-60)]">
          Vuelve a intentarlo más tarde.
        </p>
        <a href={env.appUrl} className="mt-6 inline-block text-[14px] font-medium text-[var(--color-azul)]">
          Crea tu propia página en tuenlace.es
        </a>
      </div>
    </main>
  )
}

function PaginaSuspendida() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-[20px] font-semibold">Esta página no está disponible</h1>
        <p className="mt-2 text-[15px] text-[var(--color-tinta-60)]">
          La hemos suspendido temporalmente mientras la revisamos.
        </p>
        <a href={env.appUrl} className="mt-6 inline-block text-[14px] font-medium text-[var(--color-azul)]">
          Ir a tuenlace.es
        </a>
      </div>
    </main>
  )
}
