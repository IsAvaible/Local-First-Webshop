import { router, authedProcedure, generateTxId } from "@/lib/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  cartItemsTable,
  createCartItemSchema,
  updateCartItemSchema
} from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { canWriteItems, getCartWithRole } from "@/lib/carts-permissions";

export const cartItemsRouter = router({
  create: authedProcedure
    .input(createCartItemSchema)
    .mutation(async ({ ctx, input }) => {
      const { cart, role } = await getCartWithRole(input.cart_id, ctx.session);
      if (!cart || !canWriteItems(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [newItem] = await tx
          .insert(cartItemsTable)
          .values(input)
          .returning();
        return { item: newItem, txid };
      });

      return result;
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.number(),
        data: updateCartItemSchema
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch existing to determine cart and permissions
      const [existing] = await ctx.db
        .select()
        .from(cartItemsTable)
        .where(eq(cartItemsTable.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const { cart, role } = await getCartWithRole(
        existing.cart_id,
        ctx.session
      );
      if (!cart || !canWriteItems(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [updated] = await tx
          .update(cartItemsTable)
          .set(input.data)
          .where(eq(cartItemsTable.id, input.id))
          .returning();

        if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

        return { item: updated, txid };
      });

      return result;
    }),

  delete: authedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(cartItemsTable)
        .where(eq(cartItemsTable.id, input.id));

      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const { cart, role } = await getCartWithRole(
        existing.cart_id,
        ctx.session
      );
      if (!cart || !canWriteItems(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [deleted] = await tx
          .delete(cartItemsTable)
          .where(eq(cartItemsTable.id, input.id))
          .returning();

        if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
        return { item: deleted, txid };
      });

      return result;
    })
});
