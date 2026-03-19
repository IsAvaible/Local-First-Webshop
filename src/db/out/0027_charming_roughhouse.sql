DROP INDEX "min_quantity_idx";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock_sum" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "product_min_quantity_idx" ON "pricing_tiers" USING btree ("product_id","min_quantity");