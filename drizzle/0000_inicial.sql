CREATE TYPE "public"."estado_denuncia" AS ENUM('ABIERTA', 'REVISADA', 'DESESTIMADA');--> statement-breakpoint
CREATE TYPE "public"."estado_pagina" AS ENUM('BORRADOR', 'PUBLICADA', 'SUSPENDIDA');--> statement-breakpoint
CREATE TYPE "public"."org_type" AS ENUM('PERSONAL', 'AGENCIA');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('GRATIS', 'ESENCIAL', 'NEGOCIO', 'AGENCIA');--> statement-breakpoint
CREATE TYPE "public"."proveedor" AS ENUM('META', 'GA4', 'TIKTOK', 'CALCOM', 'GHL', 'GOOGLE_BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('PROPIETARIO', 'ADMIN', 'EDITOR', 'CLIENTE');--> statement-breakpoint
CREATE TYPE "public"."tipo_bloque" AS ENUM('ENLACE', 'WHATSAPP', 'LLAMAR', 'UBICACION', 'REDES', 'TEXTO', 'IMAGEN', 'FORMULARIO');--> statement-breakpoint
CREATE TYPE "public"."tipo_conversion" AS ENUM('CONTACTO', 'CITA', 'LEAD', 'CATALOGO');--> statement-breakpoint
CREATE TABLE "block_clicks" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"page_id" varchar(24) NOT NULL,
	"block_id" varchar(24) NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"origen" text,
	"session_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"page_id" varchar(24) NOT NULL,
	"tipo" "tipo_bloque" NOT NULL,
	"orden" integer NOT NULL,
	"config" jsonb NOT NULL,
	"prioridad" integer DEFAULT 3 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"visible_desde" timestamp with time zone,
	"visible_hasta" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_log" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"page_id" varchar(24) NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"session_hash" text NOT NULL,
	"decisiones" jsonb NOT NULL,
	"ip_hash" text NOT NULL,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "conversions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"page_id" varchar(24) NOT NULL,
	"tipo" "tipo_conversion" NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"event_id" text NOT NULL,
	"origen" text,
	"meta_estado" text,
	"meta_enviado_en" timestamp with time zone,
	"meta_error" text,
	CONSTRAINT "conversions_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "daily_stats" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"page_id" varchar(24) NOT NULL,
	"fecha" date NOT NULL,
	"visitas" integer DEFAULT 0 NOT NULL,
	"unicos" integer DEFAULT 0 NOT NULL,
	"clics" integer DEFAULT 0 NOT NULL,
	"conversiones" integer DEFAULT 0 NOT NULL,
	"por_origen" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"por_dispositivo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"por_bloque" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"page_id" varchar(24) NOT NULL,
	"proveedor" "proveedor" NOT NULL,
	"config" jsonb NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"page_id" varchar(24) NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"datos" jsonb NOT NULL,
	"origen" text,
	"consent_id" varchar(24),
	"exportado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "login_tokens" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"usado_en" timestamp with time zone,
	"contexto" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "login_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"org_id" varchar(24) NOT NULL,
	"rol" "rol" DEFAULT 'PROPIETARIO' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "org_type" DEFAULT 'PERSONAL' NOT NULL,
	"plan" "plan" DEFAULT 'GRATIS' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan_hasta" timestamp with time zone,
	"plan_anual" boolean DEFAULT false NOT NULL,
	"marca_blanca" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"page_id" varchar(24) NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"origen" text,
	"dispositivo" text,
	"pais" text,
	"ciudad" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"session_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"org_id" varchar(24) NOT NULL,
	"slug" text NOT NULL,
	"estado" "estado_pagina" DEFAULT 'BORRADOR' NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text,
	"avatar_url" text,
	"portada_url" text,
	"categoria" text,
	"sector" text,
	"descripcion_negocio" text,
	"objetivos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"canales" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tema" jsonb DEFAULT '{"preset":"claro","acento":"#FF5D2E","fuente":"sistema","botones":"redondeados"}'::jsonb NOT NULL,
	"ajustes" jsonb DEFAULT '{"indexable":false,"idioma":"es","mostrarMarca":true}'::jsonb NOT NULL,
	"publicada_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"revision_pendiente" boolean DEFAULT false NOT NULL,
	"motivo_suspension" text,
	"revisada_en" timestamp with time zone,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"page_id" varchar(24) NOT NULL,
	"estado" "estado_denuncia" DEFAULT 'ABIERTA' NOT NULL,
	"motivo" text NOT NULL,
	"detalle" text,
	"ip_hash" text,
	"nota" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"revisado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"ultimo_uso" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "url_checks" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"seguro" boolean NOT NULL,
	"amenaza" text,
	"revisado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "url_checks_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"nombre" text,
	"email_verificado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "block_clicks" ADD CONSTRAINT "block_clicks_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_clicks" ADD CONSTRAINT "block_clicks_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_tokens" ADD CONSTRAINT "login_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "block_clicks_page_ts_idx" ON "block_clicks" USING btree ("page_id","ts");--> statement-breakpoint
CREATE INDEX "block_clicks_block_ts_idx" ON "block_clicks" USING btree ("block_id","ts");--> statement-breakpoint
CREATE INDEX "blocks_page_orden_idx" ON "blocks" USING btree ("page_id","orden");--> statement-breakpoint
CREATE INDEX "consent_log_page_ts_idx" ON "consent_log" USING btree ("page_id","ts");--> statement-breakpoint
CREATE INDEX "conversions_page_ts_idx" ON "conversions" USING btree ("page_id","ts");--> statement-breakpoint
CREATE INDEX "conversions_meta_estado_idx" ON "conversions" USING btree ("meta_estado");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_stats_page_fecha_idx" ON "daily_stats" USING btree ("page_id","fecha");--> statement-breakpoint
CREATE INDEX "daily_stats_fecha_idx" ON "daily_stats" USING btree ("fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_page_proveedor_idx" ON "integrations" USING btree ("page_id","proveedor");--> statement-breakpoint
CREATE INDEX "leads_page_ts_idx" ON "leads" USING btree ("page_id","ts");--> statement-breakpoint
CREATE INDEX "login_tokens_expira_idx" ON "login_tokens" USING btree ("expira_en");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_org_idx" ON "memberships" USING btree ("user_id","org_id");--> statement-breakpoint
CREATE INDEX "memberships_org_idx" ON "memberships" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "organizations_plan_idx" ON "organizations" USING btree ("plan");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_stripe_customer_idx" ON "organizations" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "page_views_page_ts_idx" ON "page_views" USING btree ("page_id","ts");--> statement-breakpoint
CREATE INDEX "page_views_ts_idx" ON "page_views" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "pages_org_idx" ON "pages" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "pages_estado_idx" ON "pages" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "pages_revision_idx" ON "pages" USING btree ("revision_pendiente");--> statement-breakpoint
CREATE INDEX "reports_estado_creado_idx" ON "reports" USING btree ("estado","creado_en");--> statement-breakpoint
CREATE INDEX "reports_page_idx" ON "reports" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expira_idx" ON "sessions" USING btree ("expira_en");--> statement-breakpoint
CREATE INDEX "url_checks_revisado_idx" ON "url_checks" USING btree ("revisado_en");