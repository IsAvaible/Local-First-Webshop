import { router, authedProcedure, generateTxId } from "@/lib/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, ne } from "drizzle-orm";
import {
  userAddressesTable,
  createUserAddressSchema,
  updateUserAddressSchema
} from "@/db/schema";

const createAddressInput = createUserAddressSchema.omit({ user_id: true });
const updateAddressInput = updateUserAddressSchema.omit({ user_id: true });

export const addressesRouter = router({
  create: authedProcedure
    .input(createAddressInput)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);

        if (input.is_default_delivery) {
          await tx
            .update(userAddressesTable)
            .set({ is_default_delivery: false })
            .where(
              and(
                eq(userAddressesTable.user_id, ctx.session.user.id),
                eq(userAddressesTable.is_default_delivery, true)
              )
            );
        }
        if (input.is_default_billing) {
          await tx
            .update(userAddressesTable)
            .set({ is_default_billing: false })
            .where(
              and(
                eq(userAddressesTable.user_id, ctx.session.user.id),
                eq(userAddressesTable.is_default_billing, true)
              )
            );
        }

        const [newItem] = await tx
          .insert(userAddressesTable)
          .values({ ...input, user_id: ctx.session.user.id })
          .returning();

        return { item: newItem, txid };
      });
      return result;
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.uuid(),
        data: updateAddressInput
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);

        // switch default addresses
        if (input.data.is_default_delivery) {
          await tx
            .update(userAddressesTable)
            .set({ is_default_delivery: false })
            .where(
              and(
                eq(userAddressesTable.user_id, ctx.session.user.id),
                eq(userAddressesTable.is_default_delivery, true),
                ne(userAddressesTable.id, input.id)
              )
            );
        }
        if (input.data.is_default_billing) {
          await tx
            .update(userAddressesTable)
            .set({ is_default_billing: false })
            .where(
              and(
                eq(userAddressesTable.user_id, ctx.session.user.id),
                eq(userAddressesTable.is_default_billing, true),
                ne(userAddressesTable.id, input.id)
              )
            );
        }

        const [updatedItem] = await tx
          .update(userAddressesTable)
          .set(input.data)
          .where(
            and(
              eq(userAddressesTable.id, input.id),
              eq(userAddressesTable.user_id, ctx.session.user.id)
            )
          )
          .returning();

        if (!updatedItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Address not found or you do not have permission to update it"
          });
        }

        return { item: updatedItem, txid };
      });

      return result;
    }),

  delete: authedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [deletedItem] = await tx
          .delete(userAddressesTable)
          .where(
            and(
              eq(userAddressesTable.id, input.id),
              eq(userAddressesTable.user_id, ctx.session.user.id)
            )
          )
          .returning();

        if (!deletedItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Address not found or you do not have permission to delete it"
          });
        }

        return { item: deletedItem, txid };
      });

      return result;
    })
});
