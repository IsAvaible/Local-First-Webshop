import { router, authedProcedure, generateTxId } from "@/lib/trpc";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { wishlistTable, createWishlistSchema } from "@/db/schema";

export const wishlistRouter = router({
  create: authedProcedure
    .input(createWishlistSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [newItem] = await tx
          .insert(wishlistTable)
          .values({ ...input, user_id: ctx.session.user.id })
          .returning();
        return { item: newItem, txid };
      });
      return result;
    }),

  delete: authedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [deletedItem] = await tx
          .delete(wishlistTable)
          .where(
            and(
              eq(wishlistTable.id, input.id),
              eq(wishlistTable.user_id, ctx.session.user.id)
            )
          )
          .returning();
        return { item: deletedItem, txid };
      });
      return result;
    })
});
