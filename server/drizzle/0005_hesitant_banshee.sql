CREATE TABLE "signup_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"pricing_group_id" uuid,
	"is_used" boolean DEFAULT false,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "signup_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "signup_links" ADD CONSTRAINT "signup_links_pricing_group_id_pricing_groups_id_fk" FOREIGN KEY ("pricing_group_id") REFERENCES "public"."pricing_groups"("id") ON DELETE set null ON UPDATE no action;