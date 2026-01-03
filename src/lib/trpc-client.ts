import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/routes/api/trpc/$";
import superjson from "superjson";

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      headers() {
        return {
          cookie: typeof document !== "undefined" ? document.cookie : ""
        };
      },
      transformer: superjson
    })
  ]
});
