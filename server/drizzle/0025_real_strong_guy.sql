ALTER TABLE "config" ADD COLUMN "paypal_client_id" text;--> statement-breakpoint
ALTER TABLE "config" ADD COLUMN "paypal_client_secret" text;--> statement-breakpoint
ALTER TABLE "config" ADD COLUMN "paypal_mode" varchar(20) DEFAULT 'sandbox';