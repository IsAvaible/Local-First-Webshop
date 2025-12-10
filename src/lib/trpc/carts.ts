import { router, authedProcedure, generateTxId, procedure } from "@/lib/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  cartCollaboratorsTable,
  cartsTable,
  createCartSchema,
  updateCartSchema,
  userSelectedCartTable
} from "@/db/schema";
import {
  type inferProcedureBuilderResolverOptions,
  TRPCError
} from "@trpc/server";
import { canManage, getCartWithRole } from "@/lib/carts-permissions";
import { v4 as uuidv4 } from "uuid";
import { upsertUserSelectedCart } from "@/lib/trpc/user-selected-cart.ts";

// Extract the "Create" logic into a reusable function
const createCartService = async (
  ctx: inferProcedureBuilderResolverOptions<typeof procedure>["ctx"],
  input: z.infer<typeof createCartSchema>
) => {
  const userId = ctx.session?.user?.id;
  const guestId = input.created_by_guest_id;

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
        created_by_id: userId ?? null,
        created_by_guest_id: userId ? null : guestId
      })
      .returning();

    // If the user is authenticated, add them as an admin collaborator
    if (userId) {
      await tx.insert(cartCollaboratorsTable).values({
        cart_id: newItem.id,
        user_id: userId,
        role: "admin"
      });
    }

    // Set as "Selected Cart"
    await upsertUserSelectedCart(tx, {
      userId,
      guestId,
      cartId: newItem.id
    });

    return { item: newItem, txid };
  });

  return result;
};

export const cartsRouter = router({
  create: procedure.input(createCartSchema).mutation(async ({ ctx, input }) => {
    // 2. The API endpoint simply calls the service
    return createCartService(ctx, input);
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

  ensureSelected: procedure
    .input(z.object({ created_by_guest_id: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      const guestId = input.created_by_guest_id;

      if (!userId && !guestId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No identity provided"
        });
      }

      // 1. Try to find existing default cart
      const [existing] = await ctx.db
        .select()
        .from(userSelectedCartTable)
        .where(
          userId
            ? eq(userSelectedCartTable.user_id, userId)
            : eq(userSelectedCartTable.guest_id, guestId!)
        )
        .innerJoin(
          cartsTable,
          eq(userSelectedCartTable.cart_id, cartsTable.id)
        );

      if (existing) return;

      // 2. If none, create one using the SERVICE function
      await createCartService(ctx, {
        id: uuidv4(),
        name: "My Cart",
        created_by_id: userId ?? null,
        created_by_guest_id: userId ? null : guestId!
      });
    })
});
