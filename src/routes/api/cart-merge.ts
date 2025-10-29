import { createFileRoute } from "@tanstack/react-router";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/connection";
import { cartsTable, cartItemsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ensureGuestSessionId } from "@/lib/server-utils";

const servePost = async ({ request }: { request: Request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });

  const { guestSessionId } = ensureGuestSessionId(request.headers);

  const [guestCart] = await db
    .select()
    .from(cartsTable)
    .where(
      and(
        isNull(cartsTable.owner_user_id),
        eq(cartsTable.guest_session_id, guestSessionId)
      )
    )
    .limit(1);

  if (!guestCart)
    return new Response(JSON.stringify({ merged: false }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });

  // Find default cart for user or create
  const [defaultCart] = await db
    .select()
    .from(cartsTable)
    .where(
      and(
        eq(cartsTable.owner_user_id, session.user.id),
        eq(cartsTable.is_default, true)
      )
    )
    .limit(1);

  let targetCart = defaultCart;
  if (!targetCart) {
    [targetCart] = await db
      .insert(cartsTable)
      .values({
        name: "Default Cart",
        owner_user_id: session.user.id,
        is_default: true
      })
      .returning();
  }

  const guestItems = await db
    .select()
    .from(cartItemsTable)
    .where(eq(cartItemsTable.cart_id, guestCart.id));

  for (const item of guestItems) {
    const [existing] = await db
      .select()
      .from(cartItemsTable)
      .where(
        and(
          eq(cartItemsTable.cart_id, targetCart.id),
          eq(cartItemsTable.product_id, item.product_id)
        )
      )
      .limit(1);
    if (existing) {
      await db
        .update(cartItemsTable)
        .set({ quantity: existing.quantity + item.quantity })
        .where(eq(cartItemsTable.id, existing.id));
    } else {
      await db.insert(cartItemsTable).values({
        cart_id: targetCart.id,
        product_id: item.product_id,
        quantity: item.quantity,
        notes: item.notes ?? null,
        price_snapshot: item.price_snapshot,
        currency: item.currency
      });
    }
  }

  // Delete guest cart and items via cascade by deleting cart
  await db.delete(cartsTable).where(eq(cartsTable.id, guestCart.id));

  return new Response(
    JSON.stringify({ merged: true, targetCartId: targetCart.id }),
    {
      status: 200,
      headers: { "content-type": "application/json" }
    }
  );
};

export const Route = createFileRoute("/api/cart-merge")({
  server: {
    handlers: {
      POST: servePost
    }
  }
});
