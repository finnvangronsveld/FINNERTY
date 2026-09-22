ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_allowed_type";--> statement-breakpoint
ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_valid_amount";--> statement-breakpoint
ALTER TABLE "point_rules" ADD COLUMN "welcome_cap" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_allowed_type" CHECK ("ledger_entries"."type" IN ('watchtime', 'admin_correction', 'game', 'welcome_bonus'));--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_valid_amount" CHECK ("ledger_entries"."amount" <> 0 AND ("ledger_entries"."type" NOT IN ('watchtime', 'welcome_bonus') OR "ledger_entries"."amount" > 0));--> statement-breakpoint
ALTER TABLE "point_rules" ADD CONSTRAINT "welcome_cap_nonnegative" CHECK ("point_rules"."welcome_cap" >= 0);