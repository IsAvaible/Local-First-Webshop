import { router, procedure, generateTxId } from "@/lib/trpc";
import { z } from "zod";
import { userSelectedCartTable } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { ExtractTablesWithRelations } from "drizzle-orm";

// --- REUSABLE SERVICE FUNCTION ---
/**
 * upsertUserSelectedCart
 * Shares logic for setting a selected cart for a User or Guest.
 * Can be called within an existing transaction (tx) or the main db instance.
 */
export const upsertUserSelectedCart = async (
  tx: PgTransaction<
    NodePgQueryResultHKT,
    Record<string, never>,
    ExtractTablesWithRelations<Record<string, never>>
  >,
  inputs: {
    userId?: string | null;
    guestId?: string | null;
    cartId: string;
    id?: string;
  }
) => {
  const { userId, guestId, cartId, id } = inputs;

  // Ensure we have an identity
  if (!userId && !guestId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Must be logged in or provide a guest ID"
    });
  }

  // Determine Conflict Target (User ID takes precedence)
  const conflictTarget = userId
    ? userSelectedCartTable.user_id
    : userSelectedCartTable.guest_id;

  const [item] = await tx
    .insert(userSelectedCartTable)
    .values({
      ...(id ? { id } : {}),
      user_id: userId ?? null,
      // Ensure mutually exclusive: if user exists, guest is null
      guest_id: userId ? null : guestId,
      cart_id: cartId,
      updated_at: new Date()
    })
    .onConflictDoUpdate({
      target: conflictTarget,
      set: {
        cart_id: cartId,
        updated_at: new Date()
      }
    })
    .returning();

  return item;
};

// --- ROUTER ---
export const userSelectedCartRouter = router({
  set: procedure
    .input(
      z.object({
        id: z.uuid().optional(),
        cart_id: z.uuid(),
        guest_id: z.uuid().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const userId = ctx.session?.user?.id;

        // Call the reusable service
        const item = await upsertUserSelectedCart(tx, {
          userId,
          guestId: input.guest_id,
          cartId: input.cart_id,
          id: input.id
        });

        return { item, txid };
      });
      return result;
    })
});
