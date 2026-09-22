CREATE TABLE "watchtime_month_marks" (
	"provider" text NOT NULL,
	"channel_id" text NOT NULL,
	"provider_key" text NOT NULL,
	"month" text NOT NULL,
	"seconds" bigint NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "watchtime_month_marks_provider_channel_id_provider_key_month_pk" PRIMARY KEY("provider","channel_id","provider_key","month"),
	CONSTRAINT "month_mark_values" CHECK ("watchtime_month_marks"."seconds" >= 0 AND "watchtime_month_marks"."month" ~ '^[0-9]{4}-[0-9]{2}$')
);
--> statement-breakpoint
ALTER TABLE "point_rules" DROP CONSTRAINT "no_implicit_import";--> statement-breakpoint
ALTER TABLE "point_rules" ALTER COLUMN "historical_import" SET DEFAULT 'current_month';--> statement-breakpoint
ALTER TABLE "point_rules" ADD CONSTRAINT "historical_import_policy" CHECK ("point_rules"."historical_import" IN ('off', 'current_month'));