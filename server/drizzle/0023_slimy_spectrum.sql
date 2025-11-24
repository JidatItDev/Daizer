ALTER TABLE "categories" ADD COLUMN "zoho_item_id" varchar(50);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "zoho_item_id" varchar(50) DEFAULT '';