import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { blockClicks, blocks, conversions, db, dailyStats, pageViews } from '@/db'
import { sessionHash } from './crypto'

/** Detecta de dónde llega el visitante. Sin esto, la analítica no dice nada útil. */
export function detectarOrigen(referer: string | null, utmSource: string | null): string {
  if (utmSource) {
    const s = utmSource.toLowerCase()
    if (s.includes('instagram') || s === 'ig') return 'instagram'
    if (s.includes('tiktok')) return 'tiktok'
    if (s.includes('google')) return 'google'
    if (s === 'qr') return 'qr'
    if (s.includes('tarjeta')) return 'tarjeta'
    if (s.includes('ads') || s.includes('facebook') || s.includes('meta')) return 'ads'
    // Antes se devolvía el utm_source tal cual recortado a 32 caracteres: un
    // parámetro de URL que escribe cualquiera entraba directo en la columna que
    // agrupa el panel. Bastaba un bucle sobre ?utm_source=<aleatorio> para
    // llenar el "De dónde vienen" del cliente de filas basura y manipular la
    // frase principal del panel. El valor original se sigue guardando en su
    // propia columna utm_source, que es donde debe estar.
    return 'otro'
  }

  if (!referer) return 'directo'
  try {
    const host = new URL(referer).hostname.toLowerCase()
    if (host.includes('instagram')) return 'instagram'
    if (host.includes('tiktok')) return 'tiktok'
    if (host.includes('facebook') || host.includes('fb.')) return 'facebook'
    if (host.includes('google')) return 'google'
    if (host.includes('youtube')) return 'youtube'
    if (host.includes('linkedin')) return 'linkedin'
    if (host.includes('whatsapp') || host.includes('wa.me')) return 'whatsapp'
    if (host.includes('x.com') || host.includes('twitter')) return 'x'
    return 'otro'
  } catch {
    return 'directo'
  }
}

export function detectarDispositivo(userAgent: string): 'movil' | 'tablet' | 'escritorio' {
  const ua = userAgent.toLowerCase()
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/.test(ua)) return 'movil'
  return 'escritorio'
}

/**
 * Rastreadores y previsualizadores de enlace.
 *
 * En España estos enlaces se pegan en grupos de WhatsApp constantemente, y cada
 * vez que alguien lo pega, WhatsApp pide la página. Facebook la pide dos veces.
 * Sin este filtro, una peluquería con 40 visitas reales al mes podía ver 70, y
 * las recomendaciones del panel se disparaban con tráfico que nunca fue humano:
 * el producto le decía al cliente que convierte mal porque se había compartido
 * mucho.
 */
const BOTS =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|twitterbot|discord|linkedinbot|embedly|quora|pinterest|skypeuripreview|vkshare|preview|headless|lighthouse|pingdom|gtmetrix|curl|wget|python-requests|axios|go-http|node-fetch|java\/|okhttp|postman/i

export function esBot(userAgent: string): boolean {
  return userAgent.trim() === '' || BOTS.test(userAgent)
}

export type ContextoVisita = {
  ip: string
  userAgent: string
  referer: string | null
  pais: string | null
  ciudad: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
}

/**
 * Registra una visita.
 *
 * IMPORTANTE: esto se hace SIEMPRE, con o sin consentimiento, porque es
 * analítica propia agregada sin cookies ni identificador persistente:
 * el sessionHash se deriva de IP + user-agent + día + sal y rota cada
 * jornada. Lo que NO se hace sin consentimiento es enviar nada a terceros.
 */
export async function registrarVisita(pageId: string, ctx: ContextoVisita): Promise<string> {
  const hash = sessionHash(ctx.ip, ctx.userAgent)

  // El hash se devuelve igual —lo necesita el render— pero el bot no se cuenta.
  if (esBot(ctx.userAgent)) return hash

  try {
    await db.insert(pageViews).values({
      pageId,
      origen: detectarOrigen(ctx.referer, ctx.utmSource),
      dispositivo: detectarDispositivo(ctx.userAgent),
      pais: ctx.pais,
      ciudad: ctx.ciudad,
      utmSource: ctx.utmSource,
      utmMedium: ctx.utmMedium,
      utmCampaign: ctx.utmCampaign,
      sessionHash: hash,
    })
  } catch (error) {
    // Una visita perdida no puede tumbar la página del cliente.
    console.error('[analitica] No se pudo registrar la visita:', error)
  }

  return hash
}

// ── Lectura para el panel ────────────────────────────────────────────────────

export type ResumenPagina = {
  visitas: number
  unicos: number
  clics: number
  conversiones: number
  ctr: number
  porOrigen: Array<{ origen: string; total: number }>
  porDispositivo: Array<{ dispositivo: string; total: number }>
  porBloque: Array<{ blockId: string; tipo: string; texto: string; clics: number }>
}

export async function resumenDePagina(pageId: string, dias: number): Promise<ResumenPagina> {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000)

  // Las seis consultas son independientes entre sí. Encadenadas con await eran
  // seis idas y vueltas en serie; en paralelo es una sola espera.
  const [totalesFilas, clicsFilas, convFilas, porOrigen, porDispositivo, porBloque] =
    await Promise.all([
      db
        .select({
          visitas: sql<number>`count(*)::int`,
          unicos: sql<number>`count(distinct ${pageViews.sessionHash})::int`,
        })
        .from(pageViews)
        .where(and(eq(pageViews.pageId, pageId), gte(pageViews.ts, desde))),

      db
        .select({ total: sql<number>`count(*)::int` })
        .from(blockClicks)
        .where(and(eq(blockClicks.pageId, pageId), gte(blockClicks.ts, desde))),

      db
        .select({ total: sql<number>`count(*)::int` })
        .from(conversions)
        .where(and(eq(conversions.pageId, pageId), gte(conversions.ts, desde))),

      db
        .select({
          origen: sql<string>`coalesce(${pageViews.origen}, 'directo')`,
          total: sql<number>`count(*)::int`,
        })
        .from(pageViews)
        .where(and(eq(pageViews.pageId, pageId), gte(pageViews.ts, desde)))
        .groupBy(sql`coalesce(${pageViews.origen}, 'directo')`)
        .orderBy(desc(sql`count(*)`)),

      db
        .select({
          dispositivo: sql<string>`coalesce(${pageViews.dispositivo}, 'desconocido')`,
          total: sql<number>`count(*)::int`,
        })
        .from(pageViews)
        .where(and(eq(pageViews.pageId, pageId), gte(pageViews.ts, desde)))
        .groupBy(sql`coalesce(${pageViews.dispositivo}, 'desconocido')`),

      // blockId ya identifica la fila de blocks, así que tipo y config son
      // dependientes de él. Agrupar además por `config` obligaba a Postgres a
      // comparar documentos JSON completos en cada agregación: con medio millón
      // de clics, eso son segundos.
      db
        .select({
          blockId: blockClicks.blockId,
          tipo: sql<string>`min(${blocks.tipo}::text)`,
          config: sql<Record<string, unknown>>`(array_agg(${blocks.config}))[1]`,
          clics: sql<number>`count(*)::int`,
        })
        .from(blockClicks)
        .innerJoin(blocks, eq(blocks.id, blockClicks.blockId))
        .where(and(eq(blockClicks.pageId, pageId), gte(blockClicks.ts, desde)))
        .groupBy(blockClicks.blockId)
        .orderBy(desc(sql`count(*)`))
        .limit(50),
    ])

  const totales = totalesFilas[0]
  const clicsTotales = clicsFilas[0]
  const convTotales = convFilas[0]

  const visitas = totales?.visitas ?? 0
  const clics = clicsTotales?.total ?? 0

  return {
    visitas,
    unicos: totales?.unicos ?? 0,
    clics,
    conversiones: convTotales?.total ?? 0,
    ctr: visitas > 0 ? Math.round((clics / visitas) * 1000) / 10 : 0,
    porOrigen,
    porDispositivo,
    porBloque: porBloque.map((b) => ({
      blockId: b.blockId,
      tipo: b.tipo,
      texto: (b.config as { texto?: string })?.texto ?? b.tipo,
      clics: b.clics,
    })),
  }
}

export { dailyStats }
