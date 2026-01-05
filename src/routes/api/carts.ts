import { createFileRoute } from "@tanstack/react-router";
import {
  prepareElectricUrl,
  proxyElectricRequest
} from "@/lib/electric-proxy.ts";
import { auth } from "@/lib/auth.ts";

const serveGet = async ({ request }: { request: Request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }

  const originUrl = prepareElectricUrl(request.url);
  originUrl.searchParams.set("table", "carts");

  const userId = session.user.id;

  // Build Filter Clause using a Subquery
  const filterClause = `id IN (SELECT cart_id FROM cart_collaborators WHERE user_id = '${userId}')`;

  // Force the filter on the query
  originUrl.searchParams.set("where", filterClause);

  return proxyElectricRequest(originUrl);
};

export const Route = createFileRoute("/api/carts")({
  server: {
    handlers: {
      GET: serveGet
    }
  }
});
