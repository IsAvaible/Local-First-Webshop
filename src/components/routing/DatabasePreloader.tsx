import { useEffect } from "react";
import * as exports from "@/lib/collections";
import { authClient } from "@/lib/auth-client.ts";

interface PreloadableCollection {
  preload: () => Promise<void>;
}

export function DatabasePreloader() {
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    // Wait until login
    if (isPending || !session) return;

    // Get all collections from the exports
    const collections = Object.values(exports).filter(
      (item: unknown): item is PreloadableCollection =>
        item !== null &&
        typeof item === "object" &&
        "preload" in item &&
        typeof (item as Record<string, unknown>).preload === "function"
    ) as PreloadableCollection[];

    collections.forEach((collection) => {
      collection.preload().catch(console.error);
    });
  }, [session, isPending]);

  return null;
}
