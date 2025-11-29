import { router, authedProcedure, generateTxId } from "@/lib/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { cartsTable, createCartSchema, updateCartSchema } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { canManage, getCartWithRole } from "@/lib/carts-permissions";

export const cartsRouter = router({
  create: authedProcedure
    .input(createCartSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [newItem] = await tx
          .insert(cartsTable)
          .values({ ...input, owner_user_id: ctx.session.user.id })
          .returning();
        return { item: newItem, txid };
      });
      return result;
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.uuid(),
        data: updateCartSchema
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow owners/admins to manage
      const { cart, role } = await getCartWithRole(input.id, ctx.session);
      if (!cart || !canManage(role)) throw new TRPCError({ code: "FORBIDDEN" });

      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [updated] = await tx
          .update(cartsTable)
          .set(input.data)
          .where(eq(cartsTable.id, input.id))
          .returning();

        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return { item: updated, txid };
      });
      return result;
    }),

  delete: authedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { cart, role } = await getCartWithRole(input.id, ctx.session);
      if (!cart || !canManage(role)) throw new TRPCError({ code: "FORBIDDEN" });

      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [deleted] = await tx
          .delete(cartsTable)
          .where(eq(cartsTable.id, input.id))
          .returning();

        if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
        return { item: deleted, txid };
      });
      return result;
    }),

  // Helper mutation to ensure a default cart exists for the user and return it
  ensureActive: authedProcedure.mutation(async ({ ctx }) => {
    // Prefer existing default cart; else create one
    const existing = await ctx.db
      .select()
      .from(cartsTable)
      .where(eq(cartsTable.owner_user_id, ctx.session.user.id));

    let target = existing.find((c) => c.is_default) ?? existing[0];
    if (!target) {
      const [created] = await ctx.db
        .insert(cartsTable)
        .values({
          name: "Default Cart",
          owner_user_id: ctx.session.user.id,
          is_default: true
        })
        .returning();
      target = created;
    }

    return { cart: target };
  })
});
