ALTER TABLE "users" ADD COLUMN "zoho_contact_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "zoho_contact_status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "zoho_created_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "zoho_company_name" text NOT NULL;