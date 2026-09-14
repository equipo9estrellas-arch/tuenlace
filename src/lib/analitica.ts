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
    return s.slice(0, 32)
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

  const [totales] = await db
    .select({
      visitas: sql<number>`count(*)::int`,
      unicos: sql<number>`count(distinct ${pageViews.sessionHash})::int`,
    })
    .from(pageViews)
    .where(and(eq(pageViews.pageId, pageId), gte(pageViews.ts, desde)))

  const [clicsTotales] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(blockClicks)
    .where(and(eq(blockClicks.pageId, pageId), gte(blockClicks.ts, desde)))

  const [convTotales] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(conversions)
    .where(and(eq(conversions.pageId, pageId), gte(conversions.ts, desde)))

  const porOrigen = await db
    .select({
      origen: sql<string>`coalesce(${pageViews.origen}, 'directo')`,
      total: sql<number>`count(*)::int`,
    })
    .from(pageViews)
    .where(and(eq(pageViews.pageId, pageId), gte(pageViews.ts, desde)))
    .groupBy(sql`coalesce(${pageViews.origen}, 'directo')`)
    .orderBy(desc(sql`count(*)`))

  const porDispositivo = await db
    .select({
      dispositivo: sql<string>`coalesce(${pageViews.dispositivo}, 'desconocido')`,
      total: sql<number>`count(*)::int`,
    })
    .from(pageViews)
    .where(and(eq(pageViews.pageId, pageId), gte(pageViews.ts, desde)))
    .groupBy(sql`coalesce(${pageViews.dispositivo}, 'desconocido')`)

  const porBloque = await db
    .select({
      blockId: blockClicks.blockId,
      tipo: blocks.tipo,
      config: blocks.config,
      clics: sql<number>`count(*)::int`,
    })
    .from(blockClicks)
    .innerJoin(blocks, eq(blocks.id, blockClicks.blockId))
    .where(and(eq(blockClicks.pageId, pageId), gte(blockClicks.ts, desde)))
    .groupBy(blockClicks.blockId, blocks.tipo, blocks.config)
    .orderBy(desc(sql`count(*)`))

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
