CREATE TABLE "signup_intents" (
	"email" varchar(320) PRIMARY KEY NOT NULL,
	"callback_url" varchar(2048) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "signup_intents_expires_idx" ON "signup_intents" USING btree ("expires_at");