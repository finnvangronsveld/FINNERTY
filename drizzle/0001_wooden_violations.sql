CREATE TABLE "integration_credentials" (
	"key" text PRIMARY KEY NOT NULL,
	"encrypted_value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_flows" (
	"state_hash" text PRIMARY KEY NOT NULL,
	"browser_hash" text NOT NULL,
	"return_path" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD COLUMN "encrypted_tokens" text;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD COLUMN "authorization_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD COLUMN "validated_at" timestamp with time zone;