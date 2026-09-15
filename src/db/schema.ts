/**
 * TUENLACE — modelo de datos multiinquilino
 *
 * Regla estructural (blueprint bloque 3, punto 8.6):
 * TODO cuelga de una organización. Un particular es una organización con una
 * sola página; una agencia es una organización con veinticinco. No hay dos
 * modelos de datos, hay uno. `orgId` va en toda consulta, sin excepciones.
 *
 * Retención de analítica en dos niveles:
 *   · eventos en crudo (pageViews, blockClicks): 90 días
 *   · agregados diarios (dailyStats): para siempre
 * Resuelve a la vez el tamaño de la base de datos y la minimización de datos
 * que exige el RGPD.
 */

import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { createId } from '@/lib/ids'

// ── Enumerados ───────────────────────────────────────────────────────────────

export const orgTypeEnum = pgEnum('org_type', ['PERSONAL', 'AGENCIA'])
export const planEnum = pgEnum('plan', ['GRATIS', 'ESENCIAL', 'NEGOCIO', 'AGENCIA'])
export const rolEnum = pgEnum('rol', ['PROPIETARIO', 'ADMIN', 'EDITOR', 'CLIENTE'])
export const estadoPaginaEnum = pgEnum('estado_pagina', ['BORRADOR', 'PUBLICADA', 'SUSPENDIDA'])
export const tipoConversionEnum = pgEnum('tipo_conversion', ['CONTACTO', 'CITA', 'LEAD', 'CATALOGO'])
export const proveedorEnum = pgEnum('proveedor', ['META', 'GA4', 'TIKTOK', 'CALCOM', 'GHL', 'GOOGLE_BUSINESS'])
export const estadoDenunciaEnum = pgEnum('estado_denuncia', ['ABIERTA', 'REVISADA', 'DESESTIMADA'])

/**
 * Los 8 tipos de bloque del MVP. Ni uno más — la lista cerrada del
 * blueprint bloque 2, punto 6.3. Añadir aquí es una decisión de producto,
 * no un detalle de implementación.
 */
export const tipoBloqueEnum = pgEnum('tipo_bloque', [
  'ENLACE',
  'WHATSAPP',
  'LLAMAR',
  'UBICACION',
  'REDES',
  'TEXTO',
  'IMAGEN',
  'FORMULARIO',
])

// ── Formas de los campos JSON ────────────────────────────────────────────────

// El tema vive en src/bloques/tema.ts y no aquí: lo importa el editor, que es
// un componente de cliente, y este fichero arrastra node:crypto a través de
// ids.ts. Traerlo desde aquí metía node:crypto en el bundle del navegador.
import { TEMA_POR_DEFECTO, type Tema } from '@/bloques/tema'

export {
  TEMA_POR_DEFECTO,
  type BotonesTema,
  type FondoTema,
  type FuenteTema,
  type PresetTema,
  type Tema,
} from '@/bloques/tema'

export type MarcaBlanca = {
  logoUrl?: string
  colorAcento?: string
  nombreComercial?: string
}


export type AjustesPagina = {
  /** Indexación selectiva por calidad. Ver blueprint bloque 3, punto 8.8. */
  indexable: boolean
  idioma: string
  /** "Creado con TUENLACE" — se fuerza a true en plan GRATIS */
  mostrarMarca: boolean
}

export const AJUSTES_POR_DEFECTO: AjustesPagina = {
  indexable: false,
  idioma: 'es',
  mostrarMarca: true,
}

// ── Organizaciones e identidad ───────────────────────────────────────────────

export const organizations = pgTable(
  'organizations',
  {
    id: varchar('id', { length: 24 }).primaryKey().$defaultFn(createId),
    nombre: text('nombre').notNull(),
    tipo: orgTypeEnum('tipo').notNull().default('PERSONAL'),
    plan: planEnum('plan').notNull().default('GRATIS'),

    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    planHasta: timestamp('plan_hasta', { withTimezone: true }),
    planAnual: boolean('plan_anual').notNull().default(false),

    /** Solo plan AGENCIA: { logoUrl, colorAcento, nombreComercial } */
    marcaBlanca: jsonb('marca_blanca').$type<MarcaBlanca | null>(),

    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('organizations_plan_idx').on(t.plan),
    uniqueIndex('organizations_stripe_customer_idx').on(t.stripeCustomerId),
  ],
)

export const users = pgTable('users', {
  id: varchar('id', { length: 24 }).primaryKey().$defaultFn(createId),
  email: text('email').notNull().unique(),
  nombre: text('nombre'),
  emailVerificadoEn: timestamp('email_verificado_en', { withTimezone: true }),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
})

export const memberships = pgTable(
  'memberships',
  {
    id: varchar('id', { length: 24 }).primaryKey().$defaultFn(createId),
    userId: varchar('user_id', { length: 24 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orgId: varchar('org_id', { length: 24 })
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    rol: rolEnum('rol').notNull().default('PROPIETARIO'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('memberships_user_org_idx').on(t.userId, t.orgId),
    index('memberships_org_idx').on(t.orgId),
  ],
)

/**
 * Enlace mágico de acceso. Se guarda el hash del token, nunca el token en claro:
 * quien lea la base de datos no puede entrar en ninguna cuenta.
 */
export const loginTokens = pgTable(
  'login_tokens',
  {
    id: varchar('id', { length: 24 }).primaryKey().$defaultFn(createId),
    tokenHash: text('token_hash').notNull().unique(),
    userId: varchar('user_id', { length: 24 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiraEn: timestamp('expira_en', { withTimezone: true }).notNull(),
    usadoEn: timestamp('usado_en', { withTimezone: true }),
    /** Onboarding pendiente de materializar tras verificar el email */
    contexto: jsonb('contexto').$type<Record<string, unknown> | null>(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('login_tokens_expira_idx').on(t.expiraEn)],
)

export const sessions = pgTable(
  'sessions',
  {
    id: varchar('id', { length: 24 }).primaryKey().$defaultFn(createId),
    userId: varchar('user_id', { length: 24 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiraEn: timestamp('expira_en', { withTimezone: true }).notNull(),
    ultimoUso: timestamp('ultimo_uso', { withTimezone: true }).notNull().defaultNow(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expira_idx').on(t.expiraEn)],
)

// ── Páginas ──────────────────────────────────────────────────────────────────

export const pages = pgTable(
  'pages',
  {
    id: varchar('id', { length: 24 }).primaryKey().$defaultFn(createId),
    orgId: varchar('org_id', { length: 24 })
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    /** La URL: tuenlace.es/{slug}. Único globalmente. */
    slug: text('slug').notNull().unique(),
    estado: estadoPaginaEnum('estado').notNull().default('BORRADOR'),

    titulo: text('titulo').notNull(),
    descripcion: text('descripcion'),
    avatarUrl: text('avatar_url'),
    portadaUrl: text('portada_url'),

    // Contexto del onboarding. Es lo que permite regenerar, recomendar
    // y construir el benchmark por sector.
    categoria: text('categoria'),
    sector: text('sector'),
    descripcionNegocio: text('descripcion_negocio'),
    /** Claves de la pantalla 3, EN ORDEN. El orden es la jerarquía visual. */
    objetivos: jsonb('objetivos').$type<string[]>().notNull().default([]),
    /** Claves de la pantalla 4: dónde va a usar el enlace */
    canales: jsonb('canales').$type<string[]>().notNull().default([]),

    tema: jsonb('tema').$type<Tema>().notNull().default(TEMA_POR_DEFECTO),
    ajustes: jsonb('ajustes').$type<AjustesPagina>().notNull().default(AJUSTES_POR_DEFECTO),

    publicadaEn: timestamp('publicada_en', { withTimezone: true }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),

    // Moderación (Trust & Safety)
    revisionPendiente: boolean('revision_pendiente').notNull().default(false),
    motivoSuspension: text('motivo_suspension'),
    revisadaEn: timestamp('revisada_en', { withTimezone: true }),
  },
  (t) => [
    index('pages_org_idx').on(t.orgId),
    index('pages_estado_idx').on(t.estado),
    index('pages_revision_idx').on(t.revisionPendiente),
  ],
)

export const blocks = pgTable(
  'blocks',
  {
    id: varchar('id', { length: 24 }).primaryKey().$defaultFn(createId),
    pageId: varchar('page_id', { length: 24 })
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    tipo: tipoBloqueEnum('tipo').notNull(),
    orden: integer('orden').notNull(),

    /** Configuración específica del tipo. Ver src/bloques/tipos.ts */
    config: jsonb('config').$type<Record<string, unknown>>().notNull(),

    /**
     * Jerarquía visual derivada de la pantalla 3 del onboarding:
     * 1 = CTA principal (botón grande y con color), 2 = secundario, 3 = normal.
     * Esto es lo que convierte una lista de enlaces en una página de conversión.
     */
    prioridad: integer('prioridad').notNull().default(3),

    activo: boolean('activo').notNull().default(true),

    // Programación (plan NEGOCIO). Null = siempre visible.
    visibleDesde: timestamp('visible_desde', { withTimezone: true }),
    visibleHasta: timestamp('visible_hasta', { withTimezone: true }),

    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('blocks_page_orden_idx').on(t.pageId, t.orden)],
)

// ── Integraciones ────────────────────────────────────────────────────────────

export const integrations = pgTable(
  'integrations',
  {
    id: varchar('id', { length: 24 }).primaryKey().$defaultFn(createId),
    pageId: varchar('page_id', { length: 24 })
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    proveedor: proveedorEnum('proveedor').notNull(),
    /** Credenciales cifradas en reposo. Ver src/lib/crypto.ts */
    config: jsonb('config').$type<Record<string, unknown>>().notNull(),
    activa: boolean('activa').notNull().default(true),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('integrations_page_proveedor_idx').on(t.pageId, t.proveedor)],
)

// ── Analítica ────────────────────────────────────────────────────────────────

export const pageViews = pgTable(
  'page_views',
  {
    id: varchar('id', { length: 24 }).primaryKey().$defaultFn(createId),
    pageId: varchar('page_id', { length: 24 })
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),

    origen: text('origen'),
    dispositivo: text('dispositivo'),
    pais: text('pais'),
    ciudad: text('ciudad'),

    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),

    /** Hash rotatorio diario, sin cookie. No identifica de forma persistente. */
    sessionHash: text('session_hash').notNull(),
  },
  (t) => [index('page_views_page_ts_idx').on(t.pageId, t.ts), index('page_views_ts_idx').on(t.ts)],
)

export const blockClicks = pgTable(
  'block_clicks',
  {
    id: varchar('id', { length: 24 }).primaryKey().$defaultFn(createId),
    pageId: varchar('page_id', { length: 24 })
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    blockId: varchar('block_id', { length: 24 })
      .notNull()
      .references(() => blocks.id, { onDelete: 'cascade' }),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
    origen: text('origen'),
    sessionHash: text('session_hash').notNull(),
  },
  (t) => [
    index('block_clicks_page_ts_idx').on(t.pageId, t.ts),
    index('block_clicks_block_ts_idx').on(t.blockId, t.ts),
  ],
)

export const conversions = pgTable(
  'conversions',
  {
    id: varchar('id', { length: 24 }).primaryKey().$defaultFn(createId),
    pageId: varchar('page_id', { length: 24 })
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    tipo: tipoConversionEnum('tipo').notNull(),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),

    /**
     * Generado EN EL SERVIDOR durante el SSR e incrustado en el HTML.
     * Es la clave de deduplicación con el píxel de navegador.
     * Ventana de deduplicación de Meta: 48 horas.
     */
    eventId: text('event_id').notNull().unique(),
    origen: text('origen'),

    // Estado del envío a la Conversions API de Meta
    metaEstado: text('meta_estado'),
    metaEnviadoEn: timestamp('meta_enviado_en', { withTimezone: true }),
    metaError: text('meta_error'),
  },
  (t) => [
    index('conversions_page_ts_idx').on(t.pageId, t.ts),
    index('conversions_meta_estado_idx').on(t.metaEstado),
  ],
)

export const dailyStats = pgTable(
  'daily_stats',
  {
    id: varchar('id', { length: 24 }).primaryKey().$defaultFn(createId),
    pageId: varchar('page_id', { length: 24 })
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    fecha: date('fecha').notNull(),

    visitas: integer('visitas').notNull().default(0),
    unicos: integer('unicos').notNull().default(0),
    clics: integer('clics').notNull().default(0),
    conversiones: integer('conversiones').notNull().default(0),

    porOrigen: jsonb('por_origen').$type<Record<string, number>>().notNull().default({}),
    porDispositivo: jsonb('por_dispositivo').$type<Record<string, number>>().notNull().default({}),
    porBloque: jsonb('por_bloque').$type<Record<string, number>>().notNull().default({}),
  },
  (t) => [
    uniqueIndex('daily_stats_page_fecha_idx').on(t.pageId, t.fecha),
    index('daily_stats_fecha_idx').on(t.fecha),
  ],
)

// ── Leads y consentimiento ───────────────────────────────────────────────────

export const leads = pgTable(
  'leads',
  {
    id: varchar('id', { length: 24 }).primaryKey().$defaultFn(createId),
    pageId: varchar('page_id', { length: 24 })
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
    datos: jsonb('datos').$type<Record<string, string>>().notNull(),
    origen: text('origen'),
    consentId: varchar('consent_id', { length: 24 }),
    exportadoEn: timestamp('exportado_en', { withTimezone: true }),
  },
  (t) => [index('leads_page_ts_idx').on(t.pageId, t.ts)],
)

export const consentLog = pgTable(
  'consent_log',
  {
    id: varchar('id', { length: 24 }).primaryKey().$defaultFn(createId),
    pageId: varchar('page_id', { length: 24 })
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
    sessionHash: text('session_hash').notNull(),
    decisiones: jsonb('decisiones').$type<{ analitica: boolean; marketing: boolean }>().notNull(),
    /** SHA-256 de la IP con sal: prueba de cumplimiento sin almacenar la IP. */
    ipHash: text('ip_hash').notNull(),
    userAgent: text('user_agent'),
  },
  (t) => [index('consent_log_page_ts_idx').on(t.pageId, t.ts)],
)

// ── Trust & Safety ───────────────────────────────────────────────────────────

export const reports = pgTable(
  'reports',
  {
    id: varchar('id', { length: 24 }).primaryKey().$defaultFn(createId),
    pageId: varchar('page_id', { length: 24 })
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    estado: estadoDenunciaEnum('estado').notNull().default('ABIERTA'),
    motivo: text('motivo').notNull(),
    detalle: text('detalle'),
    ipHash: text('ip_hash'),
    nota: text('nota'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    revisadoEn: timestamp('revisado_en', { withTimezone: true }),
  },
  (t) => [
    index('reports_estado_creado_idx').on(t.estado, t.creadoEn),
    index('reports_page_idx').on(t.pageId),
  ],
)

/** Caché del resultado de Google Safe Browsing por URL. */
export const urlChecks = pgTable(
  'url_checks',
  {
    id: varchar('id', { length: 24 }).primaryKey().$defaultFn(createId),
    url: text('url').notNull().unique(),
    seguro: boolean('seguro').notNull(),
    amenaza: text('amenaza'),
    revisadoEn: timestamp('revisado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('url_checks_revisado_idx').on(t.revisadoEn)],
)

// ── Relaciones ───────────────────────────────────────────────────────────────

export const organizationsRelations = relations(organizations, ({ many }) => ({
  miembros: many(memberships),
  paginas: many(pages),
}))

export const usersRelations = relations(users, ({ many }) => ({
  miembroDe: many(memberships),
  sesiones: many(sessions),
}))

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
  org: one(organizations, { fields: [memberships.orgId], references: [organizations.id] }),
}))

export const pagesRelations = relations(pages, ({ one, many }) => ({
  org: one(organizations, { fields: [pages.orgId], references: [organizations.id] }),
  bloques: many(blocks),
  integraciones: many(integrations),
}))

export const blocksRelations = relations(blocks, ({ one }) => ({
  page: one(pages, { fields: [blocks.pageId], references: [pages.id] }),
}))

// ── Tipos inferidos ──────────────────────────────────────────────────────────

export type Organization = typeof organizations.$inferSelect
export type User = typeof users.$inferSelect
export type Membership = typeof memberships.$inferSelect
export type Page = typeof pages.$inferSelect
export type NuevaPage = typeof pages.$inferInsert
export type Block = typeof blocks.$inferSelect
export type NuevoBlock = typeof blocks.$inferInsert
export type Lead = typeof leads.$inferSelect
export type DailyStat = typeof dailyStats.$inferSelect
