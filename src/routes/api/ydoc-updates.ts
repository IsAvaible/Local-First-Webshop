import { createFileRoute } from "@tanstack/react-router";
// import { auth } from "@/lib/auth";
import { prepareElectricUrl, proxyElectricRequest } from "@/lib/electric-proxy";
import { db } from "@/db/connection.ts";
import { ydocUpdatesTable } from "@/db/schema.ts";

const serve = async ({ request }: { request: Request }) => {
  // const session = await auth.api.getSession({ headers: request.headers });
  // if (!session) {
  //   return new Response(JSON.stringify({ error: "Unauthorized" }), {
  //     status: 401,
  //     headers: { "content-type": "application/json" }
  //   });
  // }

  const originUrl = prepareElectricUrl(request.url);
  originUrl.searchParams.set("table", "ydoc_updates");

  return proxyElectricRequest(originUrl);
};

const putHandler = async ({ request }: { request: Request }) => {
  // const session = await auth.api.getSession({ headers: request.headers });
  // if (!session) {
  //   return new Response(JSON.stringify({ error: "Unauthorized" }), {
  //     status: 401
  //   });
  // }

  const url = new URL(request.url);
  const room = url.searchParams.get("room");

  if (!room) {
    return new Response(JSON.stringify({ error: "Room is required" }), {
      status: 400
    });
  }

  // TODO: Add logic to verify that the user has access to this room

  try {
    const update = new Uint8Array(await request.arrayBuffer());

    await db.insert(ydocUpdatesTable).values({
      room: room,
      update: Buffer.from(update)
    });

    return new Response(null, { status: 200 });
  } catch (err) {
    console.error("Failed to save ydoc awareness:", err);
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
