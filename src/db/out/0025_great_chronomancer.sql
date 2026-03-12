CREATE TYPE "public"."inventory_change_reason" AS ENUM('restock', 'sale', 'return', 'shrinkage', 'adjustment', 'other');--> statement-breakpoint
CREATE TABLE "inventory_ledger" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inventory_ledger_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"quantity_change" integer NOT NULL,
	"reason" "inventory_change_reason" NOT NULL,
	"order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "base_price" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "base_price" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ledger_product_id_idx" ON "inventory_ledger" USING btree ("product_id");