import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { prepareElectricUrl, proxyElectricRequest } from "@/lib/electric-proxy";
import { db } from "@/db/connection.ts";
import {
  ydocUpdatesTable,
  cartsTable,
  cartCollaboratorsTable,
  cartRoleSchema
} from "@/db/schema.ts";
import { eq, and, not } from "drizzle-orm";

const serve = async ({ request }: { request: Request }) => {
  const originUrl = prepareElectricUrl(request.url);
  originUrl.searchParams.set("table", "ydoc_updates");

  const reqUrl = new URL(request.url);
  reqUrl.searchParams.forEach((value, key) => {
    originUrl.searchParams.set(key, value);
  });

  return proxyElectricRequest(originUrl);
};

const putHandler = async ({ request }: { request: Request }) => {
  const session = await auth.api.getSession({ headers: request.headers });

  const url = new URL(request.url);
  const room = url.searchParams.get("room");
  const guestId = url.searchParams.get("guestId");

  if (!room) {
    return new Response(JSON.stringify({ error: "Room is required" }), {
      status: 400
    });
  }

  // Verify Access
  let hasAccess = false;

  if (session) {
    // Check ownership
    const [cart] = await db
      .select()
      .from(cartsTable)
      .where(eq(cartsTable.id, room));

    if (
      cart &&
      (cart.owner_user_id === session.user.id ||
        (cart.owner_user_id === undefined && cart.guest_session_id === guestId))
    ) {
      hasAccess = true;
    } else {
      // Check collaboration
      const [collab] = await db
        .select()
        .from(cartCollaboratorsTable)
        .where(
          and(
            eq(cartCollaboratorsTable.cart_id, room),
            eq(cartCollaboratorsTable.user_id, session.user.id),
            // viewers can't edit
            not(eq(cartCollaboratorsTable.role, cartRoleSchema.enum.viewer))
          )
        );
      if (collab) hasAccess = true;
    }
  } else if (guestId) {
    // Check guest ownership
    const [cart] = await db
      .select()
      .from(cartsTable)
      .where(
        and(eq(cartsTable.id, room), eq(cartsTable.guest_session_id, guestId))
      );
    if (cart) hasAccess = true;
  }

  if (!hasAccess) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403
    });
  }

  try {
    const update = new Uint8Array(await request.arrayBuffer());

    await db.insert(ydocUpdatesTable).values({
      room: room,
      update: Buffer.from(update)
    });

    return new Response(null, { status: 200 });
  } catch (err) {
    console.error("Failed to save ydoc updates:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500
    });
  }
};

export const Route = createFileRoute("/api/ydoc-updates")({
  server: {
    handlers: {
      GET: serve,
      PUT: putHandler
    }
  }
});
