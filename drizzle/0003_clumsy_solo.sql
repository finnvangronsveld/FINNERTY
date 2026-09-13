CREATE TABLE "request_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stream_states" ADD COLUMN "next_check_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "stream_states" ADD COLUMN "failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stream_states" ADD COLUMN "error_code" text;