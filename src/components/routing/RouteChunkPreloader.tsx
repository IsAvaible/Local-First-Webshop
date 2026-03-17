import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import type { FileRoutesById } from "@/routeTree.gen.ts";

export function RouteChunkPreloader() {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    // Cast the values to an array of your specific route types
    const allRoutes = Object.values(
      router.routesById
    ) as FileRoutesById[keyof FileRoutesById][];

    allRoutes.forEach((route) => {
      const ignoredRoutes: FileRoutesById[keyof FileRoutesById]["to"][] = [
        "/checkout"
      ];

      if (route.to.startsWith("/api") || ignoredRoutes.includes(route.to)) {
        return;
      }

      router.loadRouteChunk(route).catch(console.error);
    });
  }, [router]);

  return null;
}
