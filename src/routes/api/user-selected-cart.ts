import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import {
  prepareElectricUrl,
  proxyElectricRequest
} from "@/lib/electric-proxy.ts";

const serveGet = async ({ request }: { request: Request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user.id;

  const originUrl = prepareElectricUrl(request.url);
  originUrl.searchParams.set("table", "user_selected_cart");

  // TODO: Filter by guest ID when unauthenticated
  const filterClause = userId ? `user_id = '${userId}'` : `user_id IS NULL`;
  originUrl.searchParams.set("where", filterClause);

  return proxyElectricRequest(originUrl);
};

export const Route = createFileRoute("/api/user-selected-cart")({
  server: {
    handlers: {
      GET: serveGet
    }
  }
});
