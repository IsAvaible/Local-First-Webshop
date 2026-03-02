import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { eq, not, desc } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/connection";
import { userSettingsTable, ordersTable, type Order } from "@/db/schema";
import { users as usersTable } from "@/db/auth-schema";
import { auth } from "@/lib/auth.ts";
import { userSettingsSchema } from "@/shared/profile.ts";

export const getProfileData = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data: { userId } }) => {
    // 1. Fetch User
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    // 2. Fetch User Settings
    const [userSettings] = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.user_id, userId));

    // 3. Fetch Orders
    const orders = (await db
      .select()
      .from(ordersTable)
      .where(not(eq(ordersTable.status, "pending")))
      .orderBy(desc(ordersTable.created_at))) as Order[];

    return { user, userSettings, orders };
  });

export const getAuthSessionFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest();

    // Check the session using the server-side auth object and incoming headers
    const session = await auth.api.getSession({
      headers: request?.headers
    });

    return session;
  }
);

export type UserSettingsFormValues = z.infer<typeof userSettingsSchema>;

export const updateSettingsFn = createServerFn({ method: "POST" })
  .inputValidator(userSettingsSchema.partial().extend({ user_id: z.string() }))
  .handler(async ({ data }) => {
    const { user_id, ...updates } = data;
    await db
      .update(userSettingsTable)
      .set(updates)
      .where(eq(userSettingsTable.user_id, user_id));

    return { success: true };
  });
