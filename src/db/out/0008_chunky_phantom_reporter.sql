ALTER TABLE "user_selected_cart" DROP CONSTRAINT "user_selected_cart_guest_id_unique";--> statement-breakpoint
ALTER TABLE "user_selected_cart" DROP CONSTRAINT "user_or_guest_check";--> statement-breakpoint
DROP INDEX "carts_guest_idx";--> statement-breakpoint
ALTER TABLE "user_selected_cart" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "user_selected_cart" DROP COLUMN "guest_id";
ALTER TABLE "user_selected_cart" ADD PRIMARY KEY ("user_id");--> statement-breakpoint
ALTER TABLE "user_selected_cart" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "created_by_guest_id";--> statement-breakpoint