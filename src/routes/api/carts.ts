import { createFileRoute } from "@tanstack/react-router";
import {
  prepareElectricUrl,
  proxyElectricRequest
} from "@/lib/electric-proxy.ts";
import { auth } from "@/lib/auth.ts";
import { cartCollaboratorsTable } from "@/db/schema.ts";
import { db } from "@/db/connection.ts";
import { eq } from "drizzle-orm";

const serveGet = async ({ request }: { request: Request }) => {
  const originUrl = prepareElectricUrl(request.url);
  originUrl.searchParams.set("table", "carts");

  const session = await auth.api.getSession({ headers: request.headers });

  let filterClause = "1 = 0"; // Default deny (false)

  if (session) {
    const userId = session.user.id;

    // Get the list of cart IDs where the user is a collaborator
    const collaboratorRows = await db
      .select({ cartId: cartCollaboratorsTable.cart_id })
      .from(cartCollaboratorsTable)
      .where(eq(cartCollaboratorsTable.user_id, userId));

    const collaboratorIds = collaboratorRows.map((c) => c.cartId);

    // 2. Build Filter Clause
    // User is the owner OR User is a collaborator
    const isOwner = `created_by_id = '${userId}'`;

    const isCollaborator =
      collaboratorIds.length > 0
        ? `id::text IN (${collaboratorIds.map((id) => `'${id}'`).join(", ")})`
        : "0 = 1";

    filterClause = `${isOwner} OR ${isCollaborator}`;
  } else {
    // Unauthenticated Guest
    // Must match guest session AND not have an owner (to prevent guests from seeing user carts)
    // TODO - guest-cart-filtering: Re-enable this clause when a way to pass the guestId is found
    // filterClause = `created_by_guest_id = '${guestId}' AND created_by_id IS NULL`;
    filterClause = `created_by_id IS NULL`; // Temporary: Allow access to all guest carts without filtering by guest ID
  }

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
