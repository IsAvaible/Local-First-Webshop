import {
  NetworkFirst,
  type PrecacheEntry,
  type SerwistGlobalConfig
} from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const manifestInjectionPoint = self.__SW_MANIFEST;

const hasPrecacheManifest =
  Array.isArray(manifestInjectionPoint) && manifestInjectionPoint.length > 0;

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
    }
  ]
});

serwist.addEventListeners();
