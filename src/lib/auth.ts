import { betterAuth } from "better-auth";
import { anonymous } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/connection";
import * as schema from "@/db/schema";
import { networkInterfaces } from "os";
import { eq, and, exists, sql } from "drizzle-orm";
import { ydocUpdatesTable } from "@/db/schema";

// Get network IP for trusted origins
const nets = networkInterfaces();
let networkIP = "192.168.1.1"; // fallback

for (const name of Object.keys(nets)) {
  const netInterfaces = nets[name];
  if (netInterfaces) {
    for (const net of netInterfaces) {
      if (net.family === "IPv4" && !net.internal) {
        networkIP = net.address;
        break;
      }
    }
  }
}

export const auth = betterAuth({
  plugins: [
    anonymous({
      // When an anonymous user links to a new account, this function is called
      // to migrate data from the anonymous user to the new user.
      onLinkAccount: async ({ newUser, anonymousUser }) => {
        const {
          cartsTable,
          cartCollaboratorsTable,
          userSelectedCartTable,
          userAddressesTable,
          userSettingsTable
        } = schema;

        await db.transaction(async (tx) => {
          // 1.1. Carts: Update creator
          await tx
            .update(cartsTable)
            .set({ created_by_id: newUser.user.id })
            .where(
              and(
                eq(cartsTable.created_by_id, anonymousUser.user.id),
                // Only if there was activity (ydoc_updates) on this cart
                exists(
                  tx
                    .select()
                    .from(ydocUpdatesTable)
                    .where(
                      eq(ydocUpdatesTable.room, sql`${cartsTable.id}::text`)
                    )
                )
              )
            );

          // 1.2. Delete the remaining carts (that do NOT have entries in ydoc_updates)
          await tx
            .delete(cartsTable)
            .where(eq(cartsTable.created_by_id, anonymousUser.user.id));

          // 2. Cart Collaborators: Move collabs
          const anonCollabs = await tx
            .select()
            .from(cartCollaboratorsTable)
            .where(eq(cartCollaboratorsTable.user_id, anonymousUser.user.id));

          for (const collab of anonCollabs) {
            // Check if the target user is already a collaborator on this cart
            const [existing] = await tx
              .select()
              .from(cartCollaboratorsTable)
              .where(
                and(
                  eq(cartCollaboratorsTable.cart_id, collab.cart_id),
                  eq(cartCollaboratorsTable.user_id, newUser.user.id)
                )
              );

            if (!existing) {
              // Move the collaboration to the new user
              await tx
                .update(cartCollaboratorsTable)
                .set({ user_id: newUser.user.id })
                .where(eq(cartCollaboratorsTable.id, collab.id));
            } else {
              // Target user already has access, remove the redundant anonymous record
              await tx
                .delete(cartCollaboratorsTable)
                .where(eq(cartCollaboratorsTable.id, collab.id));
            }
          }

          // 3. User Selected Cart
          const [anonSelection] = await tx
            .select()
            .from(userSelectedCartTable)
            .where(eq(userSelectedCartTable.user_id, anonymousUser.user.id));

          if (anonSelection) {
            const [existingSelection] = await tx
              .select()
              .from(userSelectedCartTable)
              .where(eq(userSelectedCartTable.user_id, newUser.user.id));

            if (!existingSelection) {
              // Move selection to new user only if they don't have one already
              await tx
                .update(userSelectedCartTable)
                .set({ user_id: newUser.user.id })
                .where(
                  eq(userSelectedCartTable.user_id, anonymousUser.user.id)
                );
            }
          }

          // 4. Addresses
          const anonAddresses = await tx
            .select()
            .from(userAddressesTable)
            .where(eq(userAddressesTable.user_id, anonymousUser.user.id));

          for (const address of anonAddresses) {
            const updates: {
              user_id: string;
              is_default_delivery?: boolean;
              is_default_billing?: boolean;
            } = { user_id: newUser.user.id };

            // Handle default flags
            if (address.is_default_delivery) {
              const [existingDefault] = await tx
                .select()
                .from(userAddressesTable)
                .where(
                  and(
                    eq(userAddressesTable.user_id, newUser.user.id),
                    eq(userAddressesTable.is_default_delivery, true)
                  )
                );
              if (existingDefault) {
                updates.is_default_delivery = false;
              }
            }
            if (address.is_default_billing) {
              const [existingDefault] = await tx
                .select()
                .from(userAddressesTable)
                .where(
                  and(
                    eq(userAddressesTable.user_id, newUser.user.id),
                    eq(userAddressesTable.is_default_billing, true)
                  )
                );
              if (existingDefault) {
                updates.is_default_billing = false;
              }
            }

            await tx
              .update(userAddressesTable)
              .set(updates)
              .where(eq(userAddressesTable.id, address.id));

            // 5. Settings Migration
            // If the anonymous user changed settings (e.g. language/currency), copy them over.
            const [anonSettings] = await tx
              .select()
              .from(userSettingsTable)
              .where(eq(userSettingsTable.user_id, anonymousUser.user.id));

            if (anonSettings) {
              // Update the NEW user's settings with the anonymous preferences
              await tx
                .update(userSettingsTable)
                .set({
                  ...anonSettings,
                  updated_at: new Date()
                })
                .where(eq(userSettingsTable.user_id, newUser.user.id));
            }
          }
        });
      }
    })
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Immediately create the settings row when a user is created
          try {
            await db.insert(schema.userSettingsTable).values({
              user_id: user.id
            });
          } catch (e) {
            console.error("Failed to create user settings:", e);
          }
        }
      }
    }
  },

  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema
    // debugLogs: true,
  }),
  emailAndPassword: {
    enabled: true,
    // Disable signup in production, allow in dev
    disableSignUp: process.env.NODE_ENV === "production",
    minPasswordLength: process.env.NODE_ENV === "production" ? 8 : 1
  },
  trustedOrigins: [
    "https://local-first-webshop.localhost",
    `https://${networkIP}`,
    "http://localhost:5173" // fallback for direct Vite access
  ]
});
