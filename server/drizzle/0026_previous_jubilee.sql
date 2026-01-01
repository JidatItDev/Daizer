CREATE TABLE "external_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_name" varchar(100) NOT NULL,
	"host_url" text NOT NULL,
	"username" varchar(100) NOT NULL,
	"password" text,
	"token" text NOT NULL,
	"currency" varchar(10) DEFAULT 'PKR',
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
