ALTER TABLE "notifications" ADD COLUMN "search_params" jsonb;
ALTER TABLE "notifications" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;