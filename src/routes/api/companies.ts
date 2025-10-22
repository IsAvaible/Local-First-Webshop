import { createFileRoute } from "@tanstack/react-router";
import { prepareElectricUrl, proxyElectricRequest } from "@/lib/electric-proxy";

const serve = async ({ request }: { request: Request }) => {
  const originUrl = prepareElectricUrl(request.url);
  originUrl.searchParams.set("table", "companies");
  // No auth, no filtering
  return proxyElectricRequest(originUrl);
};

export const Route = createFileRoute("/api/companies")({
  server: {
    handlers: {
      GET: serve
    }
  }
});
