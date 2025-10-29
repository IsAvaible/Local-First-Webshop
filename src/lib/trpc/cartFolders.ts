import { router, authedProcedure, generateTxId } from "@/lib/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  cartFoldersTable,
  createCartFolderSchema, // Assumed to exist in your schema file
  updateCartFolderSchema // Assumed to exist in your schema file
} from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { canManage, getCartWithRole } from "@/lib/carts-permissions";

export const cartFoldersRouter = router({
  create: authedProcedure
    .input(createCartFolderSchema)
    .mutation(async ({ ctx, input }) => {
      // Only allow managers to create folders
      const { cart, role } = await getCartWithRole(input.cart_id, ctx.session);
      if (!cart || !canManage(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [newItem] = await tx
          .insert(cartFoldersTable)
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
        data: updateCartFolderSchema
      })
    )
    .mutation(async ({ ctx, input }) => {
      // First, get the folder to find its cart_id for permission checks
      const [existing] = await ctx.db
        .select()
        .from(cartFoldersTable)
        .where(eq(cartFoldersTable.id, input.id));

      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      // Check permissions on the cart this folder belongs to
      const { cart, role } = await getCartWithRole(
        existing.cart_id,
        ctx.session
      );
      if (!cart || !canManage(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [updated] = await tx
          .update(cartFoldersTable)
          .set(input.data)
          .where(eq(cartFoldersTable.id, input.id))
          .returning();

        if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
        return { item: updated, txid };
      });

      return result;
    }),

  delete: authedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // First, get the folder to find its cart_id for permission checks
      const [existing] = await ctx.db
        .select()
        .from(cartFoldersTable)
        .where(eq(cartFoldersTable.id, input.id));

      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      // Check permissions on the cart this folder belongs to
      const { cart, role } = await getCartWithRole(
        existing.cart_id,
        ctx.session
      );
      if (!cart || !canManage(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [deleted] = await tx
          .delete(cartFoldersTable)
          .where(eq(cartFoldersTable.id, input.id))
          .returning();

        if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
        return { item: deleted, txid };
      });

      return result;
    })
});
