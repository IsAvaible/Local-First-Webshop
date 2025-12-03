CREATE TABLE "user_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"recipient_name" text NOT NULL,
	"company_name" text,
	"country_code" text NOT NULL,
	"state" text,
	"city" text NOT NULL,
	"zip_code" text NOT NULL,
	"line1" text NOT NULL,
	"line2" text,
	"phone_number" text,
	"email" text,
	"is_default_delivery" boolean DEFAULT false NOT NULL,
	"is_default_billing" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_addresses_user_id_idx" ON "user_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_default_delivery_per_user_idx" ON "user_addresses" USING btree ("user_id") WHERE "user_addresses"."is_default_delivery" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "one_default_billing_per_user_idx" ON "user_addresses" USING btree ("user_id") WHERE "user_addresses"."is_default_billing" = true;