CREATE TYPE "public"."notification_category" AS ENUM('order', 'shipping', 'payment', 'account', 'marketing', 'inventory', 'social', 'system');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('order_confirmation', 'order_cancelled', 'order_item_unavailable', 'shipment_dispatched', 'shipment_out_for_delivery', 'shipment_delivered', 'shipment_delayed', 'pickup_ready', 'payment_failed', 'payment_succeeded', 'refund_processed', 'invoice_available', 'price_drop', 'back_in_stock', 'low_stock_alert', 'cart_shared', 'cart_collaborator_add', 'promo_code', 'flash_sale_start', 'abandoned_cart_reminder', 'recommendation', 'welcome', 'password_changed', 'new_device_login');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"actor_id" text,
	"group_key" text,
	"category" "notification_category" NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"route" text,
	"route_params" jsonb,
	"icon" varchar(50),
	"seen_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");