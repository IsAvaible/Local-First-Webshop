ALTER TABLE "products" ADD COLUMN "base_price" numeric(10, 2);--> statement-breakpoint
CREATE INDEX "base_price_idx" ON "products" USING btree ("base_price");