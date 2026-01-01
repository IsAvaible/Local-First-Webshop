CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone_number" text,
	"birthday" date,
	"notify_order_updates" boolean DEFAULT true NOT NULL,
	"notify_newsletter" boolean DEFAULT false NOT NULL,
	"notify_price_changes" boolean DEFAULT false NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;