import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { prepareElectricUrl, proxyElectricRequest } from "@/lib/electric-proxy";
import { db } from "@/db/connection.ts";
import {
  ydocUpdatesTable,
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
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }

  const url = new URL(request.url);
  const room = url.searchParams.get("room");

  if (!room) {
    return new Response(JSON.stringify({ error: "Room is required" }), {
      status: 400
    });
  }

  // Verify Access
  let hasAccess = false;

  if (session) {
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
