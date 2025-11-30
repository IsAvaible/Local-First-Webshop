import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { prepareElectricUrl, proxyElectricRequest } from "@/lib/electric-proxy";
import { db } from "@/db/connection.ts";
import {
  ydocAwarenessTable,
  cartsTable,
  cartCollaboratorsTable
} from "@/db/schema.ts";
import { eq, and } from "drizzle-orm";

const serve = async ({ request }: { request: Request }) => {
  const originUrl = prepareElectricUrl(request.url);
  originUrl.searchParams.set("table", "ydoc_awareness");

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
  const clientId = url.searchParams.get("clientId");
  const guestId = url.searchParams.get("guestId");

  if (!room || !clientId) {
    return new Response(
      JSON.stringify({ error: "Room and clientId required" }),
      { status: 400 }
    );
  }

  // Verify Access
  let hasAccess = false;

  if (session) {
    // Check ownership
    const [cart] = await db
      .select()
      .from(cartsTable)
      .where(eq(cartsTable.id, room));

    if (cart && cart.owner_user_id === session.user.id) {
      hasAccess = true;
    } else {
      // Check collaboration
      const [collab] = await db
        .select()
        .from(cartCollaboratorsTable)
        .where(
          and(
            eq(cartCollaboratorsTable.cart_id, room),
            eq(cartCollaboratorsTable.user_id, session.user.id)
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

    await db.transaction(async (tx) => {
      await tx
        .insert(ydocAwarenessTable)
        .values({
          room: room,
          client_id: clientId,
          update: Buffer.from(update),
          updated_at: new Date()
        })
        .onConflictDoUpdate({
          target: [ydocAwarenessTable.client_id, ydocAwarenessTable.room],
          set: {
            update: Buffer.from(update),
            updated_at: new Date()
          }
        });
    });

    return new Response(null, { status: 200 });
  } catch (err) {
    console.error("Failed to save ydoc awareness:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500
    });
  }
};

export const Route = createFileRoute("/api/ydoc-awareness")({
  server: {
    handlers: {
      GET: serve,
      PUT: putHandler
    }
  }
});
