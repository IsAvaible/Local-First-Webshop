import { createFileRoute } from "@tanstack/react-router";
import { prepareElectricUrl, proxyElectricRequest } from "@/lib/electric-proxy";

const serve = async ({ request }: { request: Request }) => {
  const originUrl = prepareElectricUrl(request.url);
  originUrl.searchParams.set("table", "categories");
  // No auth, no filtering
  return proxyElectricRequest(originUrl);
};

export const Route = createFileRoute("/api/categories")({
  server: {
    handlers: {
      GET: serve
    }
  }
});
