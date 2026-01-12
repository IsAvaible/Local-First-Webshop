import { router, generateTxId, authedProcedure } from "@/lib/trpc";
import { z } from "zod";
import { userSelectedCartTable } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { db } from "@/db/connection.ts";

// --- REUSABLE SERVICE FUNCTION ---
/**
 * Shares logic for setting a selected cart for a User
 * To be called within an existing transaction (tx)
 */
export const upsertUserSelectedCart = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  inputs: {
    userId: string;
    cartId: string;
  }
) => {
  const { userId, cartId } = inputs;

  // Ensure we have an identity
  if (!userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Must be logged in"
    });
  }

  const [item] = await tx
    .insert(userSelectedCartTable)
    .values({
      user_id: userId,
      cart_id: cartId,
      updated_at: new Date()
    })
    .onConflictDoUpdate({
      target: userSelectedCartTable.user_id,
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
  set: authedProcedure
    .input(
      z.object({
        id: z.uuid().optional(),
        cart_id: z.uuid()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const userId = ctx.session?.user?.id;

        // Call the reusable service
        const item = await upsertUserSelectedCart(tx, {
          userId,
          cartId: input.cart_id
        });

        return { item, txid };
      });
      return result;
    })
});
