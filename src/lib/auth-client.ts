import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [anonymousClient()],
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin // Always use current domain in browser
      : undefined // Let better-auth handle server-side baseURL detection
});
