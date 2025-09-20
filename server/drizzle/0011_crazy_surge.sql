ALTER TABLE "users" DROP CONSTRAINT "users_pricing_group_id_pricing_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "signup_links" DROP CONSTRAINT "signup_links_pricing_group_id_pricing_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_subcategory_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_wallet_id_wallets_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "refund_requests" DROP CONSTRAINT "refund_requests_transaction_id_transactions_id_fk";
--> statement-breakpoint
ALTER TABLE "refund_requests" DROP CONSTRAINT "refund_requests_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "refund_requests" DROP CONSTRAINT "refund_requests_admin_id_users_id_fk";
