ALTER TABLE "products" ADD COLUMN "service_id" uuid NOT NULL;--> statement-breakpoint
CREATE INDEX "products_service_idx" ON "products" USING btree ("service_id");