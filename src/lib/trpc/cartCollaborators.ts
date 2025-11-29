import { router, authedProcedure, generateTxId } from "@/lib/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  cartCollaboratorsTable,
  createCartCollaboratorSchema,
  updateCartCollaboratorSchema
} from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { canManage, getCartWithRole } from "@/lib/carts-permissions";

export const cartCollaboratorsRouter = router({
  create: authedProcedure
    .input(createCartCollaboratorSchema)
    .mutation(async ({ ctx, input }) => {
      // Only allow managers to add collaborators
      const { cart, role } = await getCartWithRole(input.cart_id, ctx.session);
      if (!cart || !canManage(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [newItem] = await tx
          .insert(cartCollaboratorsTable)
          .values(input)
          .returning();
        return { item: newItem, txid };
      });

      return result;
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.uuid(),
        data: updateCartCollaboratorSchema
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(cartCollaboratorsTable)
        .where(eq(cartCollaboratorsTable.id, input.id));

      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

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
          .update(cartCollaboratorsTable)
          .set(input.data)
          .where(eq(cartCollaboratorsTable.id, input.id))
          .returning();

        if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
        return { item: updated, txid };
      });

      return result;
    }),

  delete: authedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(cartCollaboratorsTable)
        .where(eq(cartCollaboratorsTable.id, input.id));

      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

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
          .delete(cartCollaboratorsTable)
          .where(eq(cartCollaboratorsTable.id, input.id))
          .returning();

        if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
        return { item: deleted, txid };
      });

      return result;
    })
});
