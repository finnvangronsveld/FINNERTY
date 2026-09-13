CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"reference" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"login" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchtime_checkpoints" (
	"identity_id" uuid PRIMARY KEY NOT NULL,
	"baseline" bigint NOT NULL,
	"high_water" bigint NOT NULL,
	"remainder" bigint DEFAULT 0 NOT NULL,
	"epoch" integer NOT NULL,
	"rule_version" integer NOT NULL,
	"last_successful_sync_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkpoint_values" CHECK ("watchtime_checkpoints"."baseline" >= 0 AND "watchtime_checkpoints"."high_water" >= "watchtime_checkpoints"."baseline" AND "watchtime_checkpoints"."remainder" >= 0)
);
--> statement-breakpoint
CREATE TABLE "external_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"channel_id" text NOT NULL,
	"provider_key" text NOT NULL,
	"verified_twitch_id" text,
	"provider_username" text,
	"status" text DEFAULT 'unverified' NOT NULL,
	"epoch" integer DEFAULT 1 NOT NULL,
	"mapping_history" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount" bigint NOT NULL,
	"idempotency_key" text NOT NULL,
	"source_ref" text NOT NULL,
	"rule_version" integer,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "ledger_allowed_type" CHECK ("ledger_entries"."type" IN ('watchtime', 'admin_correction')),
	CONSTRAINT "ledger_valid_amount" CHECK ("ledger_entries"."amount" <> 0 AND ("ledger_entries"."type" <> 'watchtime' OR "ledger_entries"."amount" > 0))
);
--> statement-breakpoint
CREATE TABLE "point_rules" (
	"version" integer PRIMARY KEY NOT NULL,
	"interval_seconds" bigint NOT NULL,
	"points" bigint NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"historical_import" text DEFAULT 'off' NOT NULL,
	CONSTRAINT "positive_point_rule" CHECK ("point_rules"."interval_seconds" > 0 AND "point_rules"."points" > 0),
	CONSTRAINT "no_implicit_import" CHECK ("point_rules"."historical_import" = 'off')
);
--> statement-breakpoint
CREATE TABLE "processed_events" (
	"id" text PRIMARY KEY NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchtime_snapshots" (
	"observation_id" text PRIMARY KEY NOT NULL,
	"identity_id" uuid NOT NULL,
	"seconds" bigint,
	"status" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stream_states" (
	"broadcaster_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'unknown' NOT NULL,
	"stream_id" text,
	"title" text,
	"category" text,
	"started_at" timestamp with time zone,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"cursor" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"next_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_code" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"listed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deletion_requested_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"total_earned" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "wallet_nonnegative" CHECK ("wallets"."balance" >= 0 AND "wallets"."total_earned" >= 0)
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_subject_id_users_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchtime_checkpoints" ADD CONSTRAINT "watchtime_checkpoints_identity_id_external_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."external_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchtime_checkpoints" ADD CONSTRAINT "watchtime_checkpoints_rule_version_point_rules_version_fk" FOREIGN KEY ("rule_version") REFERENCES "public"."point_rules"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_rule_version_point_rules_version_fk" FOREIGN KEY ("rule_version") REFERENCES "public"."point_rules"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchtime_snapshots" ADD CONSTRAINT "watchtime_snapshots_identity_id_external_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."external_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_identity_unique" ON "auth_accounts" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "external_mapping_unique" ON "external_identities" USING btree ("provider","channel_id","provider_key");