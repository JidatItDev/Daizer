CREATE TABLE "zoho_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_in" integer,
	"created_at" timestamp DEFAULT now()
);
