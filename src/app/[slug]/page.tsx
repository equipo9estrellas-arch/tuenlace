import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { and, asc, eq, or, isNull, lte, gte } from 'drizzle-orm'
import { blocks, db, pages } from '@/db'
import type { AjustesPagina } from '@/db/schema'
import { RenderBloque } from '@/bloques/Render'
import { normalizarTema, textoSobre } from '@/bloques/tema'
import { IconoMarca } from '@/iconos'
import { detectarOrigen, registrarVisita } from '@/lib/analitica'
import { env } from '@/lib/env'
import { Rastreador } from './Rastreador'
import { BannerConsentimiento } from './BannerConsentimiento'

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
  const filas = await db.select().from(pages).where(eq(pages.slug, slug.toLowerCase())).limit(1)
  return filas[0] ?? null
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

  const ajustes = pagina.ajustes as AjustesPagina
  const url = `${env.appUrl}/${pagina.slug}`
  const descripcion = pagina.descripcion ?? 'Contacta con nosotros'

  return {
    title: pagina.titulo,
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
      title: pagina.titulo,
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
      title: pagina.titulo,
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

  const ahora = new Date()

  // Solo bloques activos y dentro de su ventana de programación.
  const lista = await db
    .select()
    .from(blocks)
    .where(
      and(
        eq(blocks.pageId, pagina.id),
        eq(blocks.activo, true),
        or(isNull(blocks.visibleDesde), lte(blocks.visibleDesde, ahora)),
        or(isNull(blocks.visibleHasta), gte(blocks.visibleHasta, ahora)),
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
  const tema = normalizarTema(pagina.tema)
  const ajustes = pagina.ajustes as AjustesPagina
  const fbclid = primero(sp.fbclid)
  const hayPortada = Boolean(pagina.portadaUrl)
  // /api/lead redirige con ?enviado=1 al terminar. Sin leerlo, el visitante
  // rellena el formulario, la página se recarga igual y no sabe si llegó.
  const enviado = primero(sp.enviado) === '1'

  return (
    <main
      className="te-pagina"
      data-preset={tema.preset}
      data-botones={tema.botones}
      data-estilo={tema.estiloBoton}
      data-fuente={tema.fuente}
      data-fondo={tema.fondo}
      data-fondo-fijo={tema.fondoFijo ? 'si' : 'no'}
      data-tam={tema.tamanoTexto}
      data-ancho={tema.ancho}
      data-separacion={tema.separacion}
      style={
        {
          '--p-acento': tema.acento,
          '--p-acento-texto': textoSobre(tema.acento),
          ...(tema.fondo === 'imagen'
            ? {
                // La URL ya viene validada como https por normalizarTema; aun
                // así se escapan comillas y paréntesis, que es lo único que
                // podría romper el url() del CSS.
                '--p-fondo-img': `url("${tema.fondoImagenUrl.replace(/["()\\]/g, '')}")`,
                '--p-velo': String(tema.fondoVelo),
              }
            : {}),
        } as React.CSSProperties
      }
    >
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
            width={104}
            height={104}
            fetchPriority="high"
            decoding="async"
            data-forma={tema.avatarForma}
            className={`te-avatar mx-auto h-[104px] w-[104px] ${hayPortada ? '-mt-[52px] mb-4' : 'mb-5'}`}
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
          {lista.map((bloque) => (
            <RenderBloque key={bloque.id} bloque={bloque} origen={etiquetaOrigen(origen)} />
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
              <IconoMarca tam={14} />
              Creado con <strong style={{ color: 'var(--p-texto)' }}>TUENLACE</strong>
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

      {/* Datos estructurados: ayudan a la presencia en Google del cliente.
          Ningún competidor de la categoría los genera. */}
      {ajustes.indexable && <DatosEstructurados titulo={pagina.titulo} descripcion={pagina.descripcion} slug={pagina.slug} />}
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
}: {
  titulo: string
  descripcion: string | null
  slug: string
}) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: titulo,
    description: descripcion ?? undefined,
    url: `${env.appUrl}/${slug}`,
  }
  return (
    <script
      type="application/ld+json"
      // JSON.stringify NO escapa "</script": un título de 37 caracteres basta
      // para cerrar el bloque y ejecutar código en el dominio principal.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, '\\u003c') }}
    />
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
          Ir a TUENLACE
        </a>
      </div>
    </main>
  )
}
