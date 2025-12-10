CREATE TABLE "user_selected_cart" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"guest_id" text,
	"cart_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_selected_cart_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "user_selected_cart_guest_id_unique" UNIQUE("guest_id"),
	CONSTRAINT "user_or_guest_check" CHECK (num_nonnulls("user_selected_cart"."user_id", "user_selected_cart"."guest_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "carts" RENAME COLUMN "owner_user_id" TO "created_by_id";--> statement-breakpoint
ALTER TABLE "carts" RENAME COLUMN "guest_session_id" TO "created_by_guest_id";--> statement-breakpoint
ALTER TABLE "carts" DROP CONSTRAINT "carts_owner_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "carts_owner_idx";--> statement-breakpoint
DROP INDEX "one_default_cart_per_user_idx";--> statement-breakpoint
DROP INDEX "one_default_cart_per_guest_idx";--> statement-breakpoint
DROP INDEX "carts_guest_idx";--> statement-breakpoint
ALTER TABLE "user_selected_cart" ADD CONSTRAINT "user_selected_cart_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_selected_cart" ADD CONSTRAINT "user_selected_cart_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_selected_cart_cart_id_idx" ON "user_selected_cart" USING btree ("cart_id");--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "carts_created_by_id_idx" ON "carts" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "carts_guest_idx" ON "carts" USING btree ("created_by_guest_id");--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "is_default";