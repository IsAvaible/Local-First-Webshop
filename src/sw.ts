import {
  NetworkFirst,
  type PrecacheEntry,
  type SerwistGlobalConfig
} from "serwist";
import { Serwist, type SerwistPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const manifestInjectionPoint = self.__SW_MANIFEST;

const hasPrecacheManifest =
  Array.isArray(manifestInjectionPoint) && manifestInjectionPoint.length > 0;

const cacheOnlyFullSnapshotsPlugin: SerwistPlugin = {
  cacheWillUpdate: async ({ response }) => {
    // Only process successful responses
    if (!response?.ok) {
      return null;
    }

    try {
      const clonedResponse = response.clone();
      const data = (await clonedResponse.json()) as {
        headers?: {
          control?: string;
        };
      }[];

      // Ensure it's an array and check the last item for the snapshot-end marker
      if (Array.isArray(data) && data.length > 0) {
        const lastItem = data[data.length - 1];

        if (lastItem?.headers?.control === "snapshot-end") {
          // Full snapshot. Return the response so Serwist caches it.
          return response;
        }
      }

      // Incremental update. Return null to skip caching.
      return null;
    } catch (error) {
      // If parsing fails (e.g., not JSON), do not cache.
      console.error("Failed to parse shape response for caching:", error);
      return null;
    }
  }
};

const serwist = new Serwist({
  precacheEntries: manifestInjectionPoint,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  precacheOptions: {
    // Navigate fallback strictly targets the shell
    navigateFallback: hasPrecacheManifest ? "/_shell.html" : undefined
  },
  runtimeCaching: [
    {
      // Match the Better Auth session endpoint.
      matcher: ({ url }) => url.pathname === "/api/auth/get-session",
      handler: new NetworkFirst({
        cacheName: "auth-session-cache",
        networkTimeoutSeconds: 5,
        matchOptions: {
          ignoreVary: true,
          ignoreSearch: true
        }
      })
    },
    {
      // Cache Electric full shape snapshots for offline use, but skip incremental updates.
      matcher: ({ url, request }) =>
        url.pathname.startsWith("/api/") && request.method === "GET",
      handler: new NetworkFirst({
        cacheName: "electric-full-shapes-cache",
        networkTimeoutSeconds: 3,
        plugins: [cacheOnlyFullSnapshotsPlugin],
        matchOptions: {
          ignoreSearch: true
        }
      })
    }
  ]
});

serwist.addEventListeners();
