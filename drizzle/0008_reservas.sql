ALTER TYPE "public"."tipo_bloque" ADD VALUE 'RESERVA' BEFORE 'SEPARADOR';--> statement-breakpoint
CREATE TABLE "citas" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"page_id" varchar(24) NOT NULL,
	"bloque_id" varchar(24),
	"lead_id" varchar(24),
	"inicio" timestamp with time zone NOT NULL,
	"fin" timestamp with time zone NOT NULL,
	"servicio" text NOT NULL,
	"nombre" text NOT NULL,
	"email" text,
	"telefono" text,
	"nota" text,
	"origen" text,
	"estado" text DEFAULT 'CONFIRMADA' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "citas" ADD CONSTRAINT "citas_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citas" ADD CONSTRAINT "citas_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "citas_page_inicio_idx" ON "citas" USING btree ("page_id","inicio");--> statement-breakpoint
CREATE UNIQUE INDEX "citas_page_inicio_confirmada_idx" ON "citas" USING btree ("page_id","inicio") WHERE estado = 'CONFIRMADA';