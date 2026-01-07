ALTER TYPE "public"."payment_status" ADD VALUE 'requires_manual_review';--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "notify_price_changes" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_failed_reason" varchar(255);