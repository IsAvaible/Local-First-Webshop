import { router, authedProcedure, generateTxId } from "@/lib/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  cartTagsTable,
  // Assumed schema definitions based on your table
  createCartTagSchema,
  updateCartTagSchema
} from "@/db/schema";
import { TRPCError } from "@trpc/server";
import {
  canManage,
  canWriteItems,
  canRead, // Assuming this permission exists
  getCartWithRole
} from "@/lib/carts-permissions";

export const cartTagsRouter = router({
  /**
   * Create a new tag definition for a specific cart.
   */
  create: authedProcedure
    .input(createCartTagSchema)
    .mutation(async ({ ctx, input }) => {
      // Check permissions on the cart this tag will belong to
      const { cart, role } = await getCartWithRole(input.cart_id, ctx.session);

      // We'll use canWriteItems, as creating tags is part of adding items/info
      if (!cart || !canWriteItems(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // The unique constraint (cart_id, name) in your DB
      // will handle duplicate names automatically.
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [newTag] = await tx
          .insert(cartTagsTable)
          .values(input)
          .returning();
        return { item: newTag, txid };
      });

      return result;
    }),

  /**
   * List all tag definitions for a given cart.
   */
  listByCart: authedProcedure
    .input(z.object({ cart_id: z.number() }))
    .query(async ({ ctx, input }) => {
      // Check read permissions on the cart
      const { cart, role } = await getCartWithRole(input.cart_id, ctx.session);
      if (!cart || !canRead(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Fetch all tags associated with this cart
      const tags = await ctx.db
        .select()
        .from(cartTagsTable)
        .where(eq(cartTagsTable.cart_id, input.cart_id));

      return tags;
    }),

  /**
   * Update a tag's name or color.
   */
  update: authedProcedure
    .input(updateCartTagSchema)
    .mutation(async ({ ctx, input }) => {
      const { cart_id, ...data } = input;
      // TODO: should take id instead of cart_id for clarity

      // 1. Find the tag to get its cart_id for permissions
      const [tag] = await ctx.db
        .select({ cart_id: cartTagsTable.cart_id })
        .from(cartTagsTable)
        .where(eq(cartTagsTable.id, cart_id!));

      if (!tag) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" });
      }

      // 2. Check permissions on that cart
      const { cart, role } = await getCartWithRole(tag.cart_id, ctx.session);

      // Updating a tag definition requires 'manage' permissions
      if (!cart || !canManage(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // 3. Perform the update
      // The unique constraint will throw an error if the name change conflicts.
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [updatedTag] = await tx
          .update(cartTagsTable)
          .set(data)
          .where(eq(cartTagsTable.id, cart_id!))
          .returning();

        if (!updatedTag) throw new TRPCError({ code: "NOT_FOUND" });
        return { item: updatedTag, txid };
      });

      return result;
    }),

  /**
   * Delete a tag definition.
   * This will cascade and remove all applications of this tag (via cartItemTagsTable).
   */
  delete: authedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Find the tag to get its cart_id for permissions
      const [tag] = await ctx.db
        .select({ cart_id: cartTagsTable.cart_id })
        .from(cartTagsTable)
        .where(eq(cartTagsTable.id, input.id));

      if (!tag) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" });
      }

      // 2. Check permissions on that cart
      const { cart, role } = await getCartWithRole(tag.cart_id, ctx.session);

      // Deleting a tag definition requires 'manage' permissions
      if (!cart || !canManage(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // 3. Perform the delete
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [deletedTag] = await tx
          .delete(cartTagsTable)
          .where(eq(cartTagsTable.id, input.id))
          .returning();

        if (!deletedTag) throw new TRPCError({ code: "NOT_FOUND" });

        // The `onDelete: "cascade"` in `cartItemTagsTable`
        // handles removing all associations automatically.

        return { item: deletedTag, txid };
      });

      return result;
    })
});
