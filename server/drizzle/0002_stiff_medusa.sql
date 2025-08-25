CREATE TABLE "pricing_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "pricing_groups_name_idx" ON "pricing_groups" USING btree ("name");--> statement-breakpoint
CREATE INDEX "pricing_groups_is_default_idx" ON "pricing_groups" USING btree ("is_default");