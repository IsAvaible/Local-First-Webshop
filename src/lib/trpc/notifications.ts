import { router, authedProcedure, generateTxId } from "@/lib/trpc";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { notificationsTable, updateNotificationSchema } from "@/db/schema";

export const notificationsRouter = router({
  // create: authedProcedure
  //   .input(createNotificationSchema)
  //   .mutation(async ({ ctx, input }) => {
  //     const result = await ctx.db.transaction(async (tx) => {
  //       const txid = await generateTxId(tx);
  //       const [newItem] = await tx
  //         .insert(notificationsTable)
  //         .values({ ...input, user_id: ctx.session.user.id })
  //         .returning();
  //       return { item: newItem, txid };
  //     });
  //     return result;
  //   }),

  update: authedProcedure
    .input(
      z.object({
        id: z.uuid(),
        data: updateNotificationSchema
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [updatedItem] = await tx
          .update(notificationsTable)
          .set(input.data)
          .where(
            and(
              eq(notificationsTable.id, input.id),
              eq(notificationsTable.user_id, ctx.session.user.id)
            )
          )
          .returning();
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
          .delete(notificationsTable)
          .where(
            and(
              eq(notificationsTable.id, input.id),
              eq(notificationsTable.user_id, ctx.session.user.id)
            )
          )
          .returning();
        return { item: deletedItem, txid };
      });
      return result;
    })
});
