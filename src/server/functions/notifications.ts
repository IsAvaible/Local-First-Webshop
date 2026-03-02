import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/connection";
import { notificationsTable, type Notification } from "@/db/schema";

const idSchema = z.uuidv4();

export const getNotifications = createServerFn({ method: "GET" }).handler(
  async () => {
    return (await db
      .select()
      .from(notificationsTable)
      .orderBy(desc(notificationsTable.updated_at))) as Notification[];
  }
);

export const markNotificationsAsSeen = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ids: z.array(idSchema) }))
  .handler(async ({ data: { ids } }) => {
    if (ids.length === 0) return { success: true };
    await db
      .update(notificationsTable)
      .set({ seen_at: new Date() })
      .where(inArray(notificationsTable.id, ids));
    return { success: true };
  });

export const markNotificationsAsRead = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ids: z.array(idSchema) }))
  .handler(async ({ data: { ids } }) => {
    if (ids.length === 0) return { success: true };
    await db
      .update(notificationsTable)
      .set({ read_at: new Date() })
      .where(inArray(notificationsTable.id, ids));
    return { success: true };
  });

export const markNotificationAsClicked = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: idSchema,
      needsSeen: z.boolean(),
      needsRead: z.boolean()
    })
  )
  .handler(async ({ data: { id, needsSeen, needsRead } }) => {
    const updateData: Record<string, Date> = { clicked_at: new Date() };
    if (needsSeen) updateData.seen_at = new Date();
    if (needsRead) updateData.read_at = new Date();

    await db
      .update(notificationsTable)
      .set(updateData)
      .where(eq(notificationsTable.id, id));
    return { success: true };
  });
