ALTER TABLE "external_providers" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "api_provider_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "api_provider_name" varchar(100);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_api_provider_id_external_providers_id_fk" FOREIGN KEY ("api_provider_id") REFERENCES "public"."external_providers"("id") ON DELETE no action ON UPDATE no action;