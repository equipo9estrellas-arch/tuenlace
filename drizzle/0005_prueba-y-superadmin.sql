CREATE TABLE "admin_log" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"admin_id" varchar(24),
	"admin_email" text NOT NULL,
	"accion" text NOT NULL,
	"objetivo" text NOT NULL,
	"detalle" jsonb,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "prueba_hasta" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "suplantado_por" varchar(24);--> statement-breakpoint
ALTER TABLE "admin_log" ADD CONSTRAINT "admin_log_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_log_ts_idx" ON "admin_log" USING btree ("ts");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_suplantado_por_users_id_fk" FOREIGN KEY ("suplantado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Ya no hay plan gratis: las cuentas que lo tenían empiezan hoy sus 15 días de prueba.
UPDATE "organizations" SET "prueba_hasta" = now() + interval '15 days' WHERE "plan" = 'GRATIS' AND "prueba_hasta" IS NULL;
