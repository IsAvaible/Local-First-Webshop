import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";
import {
  createCollection,
  localOnlyCollectionOptions
} from "@tanstack/react-db";
import { z } from "zod";

const authStateSchema = z.object({
  id: z.string(),
  session: z.any().nullable(),
  user: z.any().nullable()
});

export const authStateCollection = createCollection(
  localOnlyCollectionOptions({
    id: "auth-state",
    getKey: (item) => item.id,
    schema: authStateSchema
  })
);

export const authClient = createAuthClient({
  plugins: [anonymousClient()],
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin // Always use current domain in browser
      : undefined // Let better-auth handle server-side baseURL detection
});
