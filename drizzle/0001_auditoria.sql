-- ════════════════════════════════════════════════════════════════════════════
--  0001 — Correcciones de la auditoría del 14 de octubre de 2026
--
--  Todo lo de aquí es barato AHORA, con la base prácticamente vacía. Varias de
--  estas sentencias reescriben la tabla entera: con 60 millones de filas son
--  una ventana de mantenimiento con la aplicación caída.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Denuncias: una por origen y página ───────────────────────────────────
--
-- Sin esto, tres peticiones desde la misma consola suspendían cualquier página,
-- y el pageId va impreso en el pie de todas las páginas públicas.
-- Primero se deduplica lo que ya hubiera, conservando la más antigua.
DELETE FROM "reports" a
USING "reports" b
WHERE a."page_id" = b."page_id"
  AND a."ip_hash" = b."ip_hash"
  AND a."creado_en" > b."creado_en";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reports_page_ip_idx" ON "reports" ("page_id", "ip_hash");
--> statement-breakpoint

-- ── 2. Orden de los bloques: único por página ───────────────────────────────
--
-- El editor numeraba desde 0 y la cabecera creada por el onboarding también
-- valía 0: dos bloques con el mismo orden y Postgres desempatando a su aire.
-- Se renumera dejando la cabecera en 0 y el resto a partir de 1.
WITH ordenados AS (
  SELECT
    "id",
    CASE
      WHEN ("config" ->> 'esCabecera')::boolean IS TRUE THEN 0
      ELSE row_number() OVER (
        PARTITION BY "page_id", (("config" ->> 'esCabecera')::boolean IS TRUE)
        ORDER BY "orden", "creado_en", "id"
      )
    END AS nuevo
  FROM "blocks"
)
UPDATE "blocks" b
SET "orden" = o.nuevo
FROM ordenados o
WHERE b."id" = o."id" AND b."orden" <> o.nuevo;
--> statement-breakpoint
-- DEFERRABLE es imprescindible: la renumeración de guardarBloques y de
-- borrarBloque pasa por estados intermedios con órdenes repetidos dentro de la
-- misma transacción. Con la comprobación diferida al commit, siguen valiendo.
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_page_orden_unico"
  UNIQUE ("page_id", "orden") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_prioridad_valida"
  CHECK ("prioridad" BETWEEN 1 AND 3);
--> statement-breakpoint

-- ── 3. Un usuario, una organización ─────────────────────────────────────────
--
-- asegurarOrganizacion hacía SELECT y luego dos INSERT sin transacción: dos
-- verificaciones concurrentes del mismo enlace mágico creaban dos
-- organizaciones, y obtenerSesion elegía una al azar (limit(1) sin ORDER BY).
-- El síntoma es "mis páginas han desaparecido".
-- Mientras no exista selector de organización, esto lo impide de raíz.
CREATE UNIQUE INDEX IF NOT EXISTS "memberships_user_unico_idx" ON "memberships" ("user_id");
--> statement-breakpoint

-- ── 4. El slug tiene que seguir siendo alcanzable ───────────────────────────
--
-- La página se busca siempre con slug.toLowerCase(); nada impedía guardar
-- mayúsculas y que la fila quedara inaccesible.
UPDATE "pages" SET "slug" = lower("slug") WHERE "slug" <> lower("slug");
--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_slug_forma"
  CHECK ("slug" = lower("slug") AND "slug" ~ '^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$');
--> statement-breakpoint

-- ── 5. Índices que faltaban ─────────────────────────────────────────────────

-- El panel y el editor ordenan por creado_en desc dentro de la organización.
DROP INDEX IF EXISTS "pages_org_idx";
--> statement-breakpoint
CREATE INDEX "pages_org_creado_idx" ON "pages" ("org_id", "creado_en" DESC);
--> statement-breakpoint

-- La consulta más ejecutada del producto: bloques activos de una página.
CREATE INDEX IF NOT EXISTS "blocks_page_activo_orden_idx" ON "blocks" ("page_id", "orden")
  WHERE "activo" = true;
--> statement-breakpoint

-- Index-only scan para las tres agregaciones del panel sobre page_views.
DROP INDEX IF EXISTS "page_views_page_ts_idx";
--> statement-breakpoint
CREATE INDEX "page_views_page_ts_idx" ON "page_views" ("page_id", "ts" DESC)
  INCLUDE ("origen", "dispositivo", "session_hash");
--> statement-breakpoint

-- Igual para el desglose por bloque.
DROP INDEX IF EXISTS "block_clicks_page_ts_idx";
--> statement-breakpoint
CREATE INDEX "block_clicks_page_ts_idx" ON "block_clicks" ("page_id", "ts" DESC)
  INCLUDE ("block_id");
--> statement-breakpoint

-- La exportación de leads del plan Esencial necesitará los no exportados.
CREATE INDEX IF NOT EXISTS "leads_sin_exportar_idx" ON "leads" ("page_id", "ts" DESC)
  WHERE "exportado_en" IS NULL;
--> statement-breakpoint

-- La cola de moderación, cuando exista.
DROP INDEX IF EXISTS "pages_revision_idx";
--> statement-breakpoint
CREATE INDEX "pages_revision_pendiente_idx" ON "pages" ("creado_en")
  WHERE "revision_pendiente" = true;
--> statement-breakpoint

-- ── 6. Índices que sobran ───────────────────────────────────────────────────

-- Ninguna consulta del código filtra por block_id solo: el join va por la PK de
-- blocks. Era un btree extra en cada INSERT de la tabla de más volumen.
DROP INDEX IF EXISTS "block_clicks_block_ts_idx";
--> statement-breakpoint

-- El 100 % de las filas vale 'pendiente': selectividad 1,0, el planificador no
-- lo usaría jamás. El parcial sí sirve para el futuro envío a la CAPI.
DROP INDEX IF EXISTS "conversions_meta_estado_idx";
--> statement-breakpoint
CREATE INDEX "conversions_pendientes_idx" ON "conversions" ("ts")
  WHERE "meta_estado" = 'pendiente';
--> statement-breakpoint

-- Sin purga no lo usa nadie, y con purga por DROP PARTITION tampoco hará falta.
DROP INDEX IF EXISTS "page_views_ts_idx";
--> statement-breakpoint

-- Enum de 3 valores sobre una tabla donde casi todo es PUBLICADA.
DROP INDEX IF EXISTS "pages_estado_idx";
--> statement-breakpoint

-- ── 7. El tema por defecto estaba cuatro campos por detrás del código ───────
--
-- La base ponía {"preset","acento","fuente":"sistema","botones"} y el código
-- escribe trece campos con fuente "moderna" — un valor, "sistema", que ya no
-- existe en el tipo y que solo sobrevive porque normalizarTema lo traduce.
ALTER TABLE "pages" ALTER COLUMN "tema" SET DEFAULT
  '{"preset":"claro","acento":"#FF5D2E","fuente":"moderna","botones":"redondeados",
    "estiloBoton":"relleno","fondo":"sutil","fondoImagenUrl":"","fondoVelo":55,
    "fondoFijo":true,"tamanoTexto":"normal","ancho":"normal","separacion":"normal",
    "avatarForma":"circulo"}'::jsonb;
--> statement-breakpoint

-- ── 8. El lead y su consentimiento ──────────────────────────────────────────
--
-- consent_id tenía el tipo, la longitud y el nombre de una clave foránea, pero
-- no era una clave foránea y nunca se escribía: el vínculo entre un contacto y
-- la base legal con la que se recogió no existía ni en los datos ni en el
-- esquema. SET NULL y no cascade a propósito: borrar un registro de
-- consentimiento no puede llevarse por delante el lead.
ALTER TABLE "leads" ADD CONSTRAINT "leads_consent_id_consent_log_id_fk"
  FOREIGN KEY ("consent_id") REFERENCES "public"."consent_log"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_consent_idx" ON "leads" ("consent_id")
  WHERE "consent_id" IS NOT NULL;
--> statement-breakpoint

-- ── 9. Coherencia de los agregados ──────────────────────────────────────────
ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_no_negativos"
  CHECK ("visitas" >= 0 AND "unicos" >= 0 AND "clics" >= 0 AND "conversiones" >= 0
         AND "unicos" <= "visitas");
