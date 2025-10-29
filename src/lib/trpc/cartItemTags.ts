import { router, authedProcedure, generateTxId } from "@/lib/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  cartItemTagsTable,
  cartItemsTable, // Needed to find the cart_id for permissions
  createCartItemTagSchema // Assumed to exist in your schema file
} from "@/db/schema";
import { TRPCError } from "@trpc/server";
import {
  canManage,
  canWriteItems,
  getCartWithRole
} from "@/lib/carts-permissions";

export const cartItemTagsRouter = router({
  create: authedProcedure
    .input(createCartItemTagSchema)
    .mutation(async ({ ctx, input }) => {
      // First, find the cart item to get its cart_id for permissions
      const [item] = await ctx.db
        .select({ cart_id: cartItemsTable.cart_id })
        .from(cartItemsTable)
        .where(eq(cartItemsTable.id, input.cart_item_id));

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cart item not found"
        });
      }

      const { cart, role } = await getCartWithRole(item.cart_id, ctx.session);
      if (!cart || !canWriteItems(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [newItem] = await tx
          .insert(cartItemTagsTable)
          .values(input)
          .returning();
        return { item: newItem, txid };
      });

      return result;
    }),

  delete: authedProcedure
    .input(z.object({ id: z.number() })) // Deleting by the join table's ID
    .mutation(async ({ ctx, input }) => {
      // First, get the tag association to find its cart_item_id
      const [existing] = await ctx.db
        .select()
        .from(cartItemTagsTable)
        .where(eq(cartItemTagsTable.id, input.id));

      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      // Now, find the cart item to get its cart_id for permissions
      const [item] = await ctx.db
        .select({ cart_id: cartItemsTable.cart_id })
        .from(cartItemsTable)
        .where(eq(cartItemsTable.id, existing.cart_item_id));

      if (!item) {
        // This case means the tag association exists, but the item is gone.
        // We can't check permissions, but the tag should be deleted.
        // For safety, we'll throw, as this implies an orphaned record.
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cart item not found"
        });
      }

      // Check permissions on the cart this item belongs to
      const { cart, role } = await getCartWithRole(item.cart_id, ctx.session);
      if (!cart || !canManage(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [deleted] = await tx
          .delete(cartItemTagsTable)
          .where(eq(cartItemTagsTable.id, input.id))
          .returning();

        if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
        return { item: deleted, txid };
      });

      return result;
    })
});
