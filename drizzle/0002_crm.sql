CREATE TYPE "public"."etapa_lead" AS ENUM('NUEVO', 'CONTACTADO', 'CITA', 'CLIENTE', 'PERDIDO');--> statement-breakpoint
CREATE TABLE "lead_notas" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"lead_id" varchar(24) NOT NULL,
	"user_id" varchar(24),
	"tipo" text NOT NULL,
	"texto" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pages" ALTER COLUMN "tema" SET DEFAULT '{"preset":"claro","acento":"#FF5D2E","fuente":"moderna","botones":"redondeados","estiloBoton":"relleno","fondo":"sutil","fondoImagenUrl":"","fondoVelo":55,"fondoFijo":true,"tamanoTexto":"normal","ancho":"normal","separacion":"normal","avatarForma":"circulo"}'::jsonb;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "etapa" "etapa_lead" DEFAULT 'NUEVO' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "importe_centimos" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "manual" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "cerrado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "actualizado_en" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_notas" ADD CONSTRAINT "lead_notas_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notas" ADD CONSTRAINT "lead_notas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_notas_lead_ts_idx" ON "lead_notas" USING btree ("lead_id","ts");--> statement-breakpoint
CREATE INDEX "leads_page_etapa_idx" ON "leads" USING btree ("page_id","etapa");