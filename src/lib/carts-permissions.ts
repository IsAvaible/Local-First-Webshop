import { and, eq } from "drizzle-orm";
import { db } from "@/db/connection";
import {
  cartsTable,
  cartCollaboratorsTable,
  type Cart,
  type CartRole
} from "@/db/schema";

export type UserSession = { user: { id: string } } | null;

export type EffectiveRole = CartRole | "owner" | "none";

export async function getCartWithRole(
  cartId: string,
  session: UserSession
): Promise<{ cart: Cart | undefined; role: EffectiveRole }> {
  const [cart] = await db
    .select()
    .from(cartsTable)
    .where(eq(cartsTable.id, cartId));

  if (!cart) return { cart: undefined, role: "none" };

  if (session?.user?.id && cart.created_by_id === session.user.id) {
    return { cart, role: "owner" };
  }

  if (session?.user?.id) {
    const [collab] = await db
      .select({ role: cartCollaboratorsTable.role })
      .from(cartCollaboratorsTable)
      .where(
        and(
          eq(cartCollaboratorsTable.cart_id, cart.id),
          eq(cartCollaboratorsTable.user_id, session.user.id)
        )
      );
    if (collab) return { cart, role: collab.role as EffectiveRole };
  }

  return { cart, role: "none" };
}

export function canRead(role: EffectiveRole) {
  return role !== "none";
}

export function canWriteItems(role: EffectiveRole) {
  return role === "owner" || role === "admin" || role === "contributor";
}

export function canManage(role: EffectiveRole) {
  return role === "owner" || role === "admin";
}
