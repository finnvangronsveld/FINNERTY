CREATE TABLE "game_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game" text NOT NULL,
	"stake" bigint NOT NULL,
	"payout" bigint NOT NULL,
	"balance_after" bigint NOT NULL,
	"bet" jsonb NOT NULL,
	"outcome" jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_rounds_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "game_round_values" CHECK ("game_rounds"."stake" > 0 AND "game_rounds"."payout" >= 0 AND "game_rounds"."balance_after" >= 0)
);
--> statement-breakpoint
ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_allowed_type";--> statement-breakpoint
ALTER TABLE "game_rounds" ADD CONSTRAINT "game_rounds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_rounds_user_created" ON "game_rounds" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ledger_created_user" ON "ledger_entries" USING btree ("created_at","user_id");--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_allowed_type" CHECK ("ledger_entries"."type" IN ('watchtime', 'admin_correction', 'game'));