import { createFileRoute } from "@tanstack/react-router";
import { prepareElectricUrl, proxyElectricRequest } from "@/lib/electric-proxy";
import { auth } from "@/lib/auth.ts";

const serve = async ({ request }: { request: Request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }

  const originUrl = prepareElectricUrl(request.url);
  originUrl.searchParams.set("table", "orders");
  originUrl.searchParams.set("where", `user_id = '${session?.user.id}'`);

  return proxyElectricRequest(originUrl);
};

export const Route = createFileRoute("/api/orders")({
  server: {
    handlers: {
      GET: serve
    }
  }
});
