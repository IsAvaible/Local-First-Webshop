ALTER TABLE "cart_folders" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cart_item_tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cart_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cart_tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "cart_folders" CASCADE;--> statement-breakpoint
DROP TABLE "cart_item_tags" CASCADE;--> statement-breakpoint
DROP TABLE "cart_items" CASCADE;--> statement-breakpoint
DROP TABLE "cart_tags" CASCADE;--> statement-breakpoint

-- Migrate id fields of carts and cart_collaborators to uuid for yjs compatibility
-- 1. Drop Foreign Keys referencing the columns we are changing
ALTER TABLE "cart_collaborators" DROP CONSTRAINT "cart_collaborators_cart_id_carts_id_fk";

-- 2. Drop Indexes involving the columns we are changing (to avoid conflicts during type conversion)
DROP INDEX IF EXISTS "cart_user_unique_idx";
DROP INDEX IF EXISTS "collab_cart_idx";

-- 3. Modify "carts" table (id)
-- Remove the auto-increment integer property
ALTER TABLE "carts" ALTER COLUMN "id" DROP IDENTITY;
-- Change type to UUID and set default to generate random UUIDs
ALTER TABLE "carts"
    ALTER COLUMN "id" SET DATA TYPE uuid USING (gen_random_uuid()),
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- 4. Modify "cart_collaborators" table (id and cart_id)
ALTER TABLE "cart_collaborators" ALTER COLUMN "id" DROP IDENTITY;
ALTER TABLE "cart_collaborators"
    ALTER COLUMN "id" SET DATA TYPE uuid USING (gen_random_uuid()),
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Update cart_id to match the new parent type
ALTER TABLE "cart_collaborators"
    ALTER COLUMN "cart_id" SET DATA TYPE uuid USING (gen_random_uuid());

-- 6. Re-create Indexes
CREATE UNIQUE INDEX "cart_user_unique_idx" ON "cart_collaborators" USING btree ("cart_id", "user_id");
CREATE INDEX "collab_cart_idx" ON "cart_collaborators" USING btree ("cart_id");

-- 7. Re-create Foreign Keys
ALTER TABLE "cart_collaborators"
    ADD CONSTRAINT "cart_collaborators_cart_id_carts_id_fk"
        FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id")
            ON DELETE cascade ON UPDATE no action;