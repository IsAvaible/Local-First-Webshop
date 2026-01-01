import { router, authedProcedure, generateTxId } from "@/lib/trpc";
import { userSettingsTable, updateUserSettingsSchema } from "@/db/schema";

export const userSettingsRouter = router({
  upsert: authedProcedure
    .input(updateUserSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);

        // Remove user_id from input if present to rely on session
        const { user_id: _, ...values } = input;

        const [item] = await tx
          .insert(userSettingsTable)
          .values({
            user_id: ctx.session.user.id,
            ...values
          })
          .onConflictDoUpdate({
            target: userSettingsTable.user_id,
            set: { ...values, updated_at: new Date() }
          })
          .returning();

        return { item, txid };
      });
      return result;
    })
});
