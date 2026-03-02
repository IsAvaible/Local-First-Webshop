import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { userAddressesTable } from "@/db/schema";

export const getAddressById = createServerFn({ method: "GET" })
  .inputValidator(z.object({ addressId: z.string() }))
  .handler(async ({ data: { addressId } }) => {
    const [address] = await db
      .select()
      .from(userAddressesTable)
      .where(eq(userAddressesTable.id, addressId))
      .limit(1);

    return address || null;
  });

export const getUserAddresses = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data: { userId } }) => {
    return await db
      .select()
      .from(userAddressesTable)
      .where(eq(userAddressesTable.user_id, userId));
  });

export const createUserAddress = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      user_id: z.string(),
      recipient_name: z.string(),
      company_name: z.string().nullable().optional(),
      line1: z.string(),
      line2: z.string().nullable().optional(),
      city: z.string(),
      state: z.string().nullable().optional(),
      zip_code: z.string(),
      country_code: z.string(),
      phone_number: z.string().nullable().optional(),
      email_address: z.string().nullable().optional(),
      is_default_delivery: z.boolean().optional(),
      is_default_billing: z.boolean().optional()
    })
  )
  .handler(async ({ data }) => {
    // The database schema uses defaultRandom() for IDs, so Drizzle handles generation
    const [newAddress] = await db
      .insert(userAddressesTable)
      .values(data)
      .returning();

    return newAddress;
  });
