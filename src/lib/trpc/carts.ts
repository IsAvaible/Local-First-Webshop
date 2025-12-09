import { router, authedProcedure, generateTxId, procedure } from "@/lib/trpc";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  cartCollaboratorsTable,
  cartsTable,
  createCartSchema,
  updateCartSchema
} from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { canManage, getCartWithRole } from "@/lib/carts-permissions";

export const cartsRouter = router({
  create: procedure.input(createCartSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id;
    const guestId = input.guest_session_id;

    // Ensure we have at least one form of identity
    if (!userId && !guestId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Must be logged in or provide a guest ID"
      });
    }

    const result = await ctx.db.transaction(async (tx) => {
      const txid = await generateTxId(tx);
      const [newItem] = await tx
        .insert(cartsTable)
        .values({
          ...input,
          owner_user_id: userId ?? null,
          guest_session_id: userId ? null : guestId
        })
        .returning();

      // If the user is authenticated, add them as an admin collaborator immediately
      if (userId) {
        await tx.insert(cartCollaboratorsTable).values({
          cart_id: newItem.id,
          user_id: userId,
          role: "admin"
        });
      }

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
  ensureDefault: procedure
    .input(z.object({ guest_session_id: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      const guestId = input.guest_session_id;

      if (!userId && !guestId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No identity provided"
        });
      }

      // 1. Try to find existing default cart
      const [existing] = await ctx.db
        .select()
        .from(cartsTable)
        .where(
          and(
            eq(cartsTable.is_default, true),
            userId
              ? eq(cartsTable.owner_user_id, userId)
              : eq(cartsTable.guest_session_id, guestId!)
          )
        );

      if (existing) return existing;

      // 2. If none, try to create one.
      try {
        const [created] = await ctx.db.transaction(async (tx) => {
          const [cart] = await tx
            .insert(cartsTable)
            .values({
              name: "My Cart",
              owner_user_id: userId ?? null,
              guest_session_id: userId ? null : guestId,
              is_default: true
            })
            .returning();

          // Add owner as admin collaborator if logged in
          if (userId) {
            await tx.insert(cartCollaboratorsTable).values({
              cart_id: cart.id,
              user_id: userId,
              role: "admin"
            });
          }
          return [cart];
        });
        return created;
      } catch (_e) {
        // 3. Race condition handling:
        // If insertion failed due to unique constraint, fetch the one that won the race.
        const [winner] = await ctx.db
          .select()
          .from(cartsTable)
          .where(
            and(
              eq(cartsTable.is_default, true),
              userId
                ? eq(cartsTable.owner_user_id, userId)
                : eq(cartsTable.guest_session_id, guestId!)
            )
          );
        return winner;
      }
    })
});
